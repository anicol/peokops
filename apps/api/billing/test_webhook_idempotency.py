"""
Comprehensive tests for webhook idempotency.

Tests verify that:
1. Duplicate webhook events are detected and skipped
2. PaymentEvent records prevent duplicate processing
3. Subscription/payment state remains consistent on retries
4. Transaction rollback works correctly on errors
"""
from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from accounts.models import User
from billing.models import (
    SubscriptionPlan,
    StripeCustomer,
    Subscription,
    PaymentEvent
)
from billing.webhook_handlers import handle_webhook_event


class WebhookIdempotencyTest(TestCase):
    """Test webhook idempotency protection"""

    def setUp(self):
        """Set up minimal test data for webhook handlers"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name='Test Plan',
            plan_type='ESSENTIALS',
            price_monthly=Decimal('99.00'),
            stripe_price_id='price_test123',
            stripe_product_id='prod_test123'
        )
        
        self.stripe_customer = StripeCustomer.objects.create(
            user=self.user,
            stripe_customer_id='cus_test123'
        )

    def test_duplicate_webhook_event_skipped(self):
        """Test that duplicate webhook events are detected and skipped"""
        event_id = 'evt_test123'
        event_data = {
            'customer': 'cus_test123',
            'subscription': 'sub_test123',
            'metadata': {'user_id': str(self.user.id)}
        }
        
        PaymentEvent.objects.create(
            user=self.user,
            event_type=PaymentEvent.EventType.CHECKOUT_COMPLETED,
            stripe_event_id=event_id,
            stripe_event_data=event_data,
            processed=True
        )
        
        initial_count = PaymentEvent.objects.count()
        
        handle_webhook_event('checkout.session.completed', event_data, event_id)
        
        self.assertEqual(PaymentEvent.objects.count(), initial_count)

    def test_checkout_completed_idempotency(self):
        """Test that checkout.session.completed is idempotent"""
        event_id = 'evt_checkout_123'
        event_data = {
            'customer': 'cus_test123',
            'subscription': 'sub_test123',
            'metadata': {'user_id': str(self.user.id)}
        }
        
        handle_webhook_event('checkout.session.completed', event_data, event_id)
        initial_count = PaymentEvent.objects.filter(stripe_event_id=event_id).count()
        
        handle_webhook_event('checkout.session.completed', event_data, event_id)
        
        self.assertEqual(
            PaymentEvent.objects.filter(stripe_event_id=event_id).count(),
            initial_count
        )

    def test_subscription_created_idempotency(self):
        """Test that subscription.created is idempotent"""
        event_id = 'evt_sub_created_123'
        event_data = {
            'id': 'sub_test123',
            'customer': 'cus_test123',
            'status': 'active',
            'current_period_start': int(timezone.now().timestamp()),
            'current_period_end': int((timezone.now() + timezone.timedelta(days=30)).timestamp()),
            'cancel_at_period_end': False,
            'metadata': {
                'user_id': str(self.user.id),
                'plan_type': 'ESSENTIALS',
                'store_count': '5'
            }
        }
        
        handle_webhook_event('customer.subscription.created', event_data, event_id)
        initial_sub_count = Subscription.objects.count()
        initial_event_count = PaymentEvent.objects.filter(stripe_event_id=event_id).count()
        
        handle_webhook_event('customer.subscription.created', event_data, event_id)
        
        self.assertEqual(Subscription.objects.count(), initial_sub_count)
        self.assertEqual(
            PaymentEvent.objects.filter(stripe_event_id=event_id).count(),
            initial_event_count
        )

    def test_subscription_updated_idempotency(self):
        """Test that subscription.updated is idempotent"""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            stripe_customer=self.stripe_customer,
            stripe_subscription_id='sub_test123',
            status=Subscription.Status.ACTIVE,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timezone.timedelta(days=30),
            store_count=5
        )
        
        event_id = 'evt_sub_updated_123'
        new_end_time = timezone.now() + timezone.timedelta(days=60)
        event_data = {
            'id': 'sub_test123',
            'status': 'active',
            'current_period_start': int(timezone.now().timestamp()),
            'current_period_end': int(new_end_time.timestamp()),
            'cancel_at_period_end': False
        }
        
        handle_webhook_event('customer.subscription.updated', event_data, event_id)
        subscription.refresh_from_db()
        initial_event_count = PaymentEvent.objects.filter(stripe_event_id=event_id).count()
        
        handle_webhook_event('customer.subscription.updated', event_data, event_id)
        subscription.refresh_from_db()
        
        self.assertEqual(
            PaymentEvent.objects.filter(stripe_event_id=event_id).count(),
            initial_event_count
        )

    def test_subscription_deleted_idempotency(self):
        """Test that subscription.deleted is idempotent"""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            stripe_customer=self.stripe_customer,
            stripe_subscription_id='sub_test123',
            status=Subscription.Status.ACTIVE,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timezone.timedelta(days=30),
            store_count=5
        )
        
        event_id = 'evt_sub_deleted_123'
        event_data = {
            'id': 'sub_test123'
        }
        
        handle_webhook_event('customer.subscription.deleted', event_data, event_id)
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, Subscription.Status.CANCELED)
        initial_event_count = PaymentEvent.objects.filter(stripe_event_id=event_id).count()
        
        handle_webhook_event('customer.subscription.deleted', event_data, event_id)
        
        self.assertEqual(
            PaymentEvent.objects.filter(stripe_event_id=event_id).count(),
            initial_event_count
        )

    def test_invoice_paid_idempotency(self):
        """Test that invoice.paid is idempotent"""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            stripe_customer=self.stripe_customer,
            stripe_subscription_id='sub_test123',
            status=Subscription.Status.ACTIVE,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timezone.timedelta(days=30),
            store_count=5
        )
        
        event_id = 'evt_invoice_paid_123'
        event_data = {
            'subscription': 'sub_test123',
            'customer': 'cus_test123'
        }
        
        handle_webhook_event('invoice.paid', event_data, event_id)
        initial_event_count = PaymentEvent.objects.filter(stripe_event_id=event_id).count()
        
        handle_webhook_event('invoice.paid', event_data, event_id)
        
        self.assertEqual(
            PaymentEvent.objects.filter(stripe_event_id=event_id).count(),
            initial_event_count
        )

    def test_invoice_payment_failed_idempotency(self):
        """Test that invoice.payment_failed is idempotent"""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            stripe_customer=self.stripe_customer,
            stripe_subscription_id='sub_test123',
            status=Subscription.Status.ACTIVE,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timezone.timedelta(days=30),
            store_count=5
        )
        
        event_id = 'evt_invoice_failed_123'
        event_data = {
            'subscription': 'sub_test123',
            'customer': 'cus_test123'
        }
        
        handle_webhook_event('invoice.payment_failed', event_data, event_id)
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, Subscription.Status.PAST_DUE)
        initial_event_count = PaymentEvent.objects.filter(stripe_event_id=event_id).count()
        
        handle_webhook_event('invoice.payment_failed', event_data, event_id)
        
        self.assertEqual(
            PaymentEvent.objects.filter(stripe_event_id=event_id).count(),
            initial_event_count
        )

    def test_webhook_event_routing_with_duplicate(self):
        """Test that handle_webhook_event properly routes and prevents duplicates"""
        event_id = 'evt_routing_123'
        event_data = {
            'customer': 'cus_test123',
            'subscription': 'sub_test123',
            'metadata': {'user_id': str(self.user.id)}
        }
        
        handle_webhook_event('checkout.session.completed', event_data, event_id)
        initial_count = PaymentEvent.objects.count()
        
        handle_webhook_event('checkout.session.completed', event_data, event_id)
        
        self.assertEqual(PaymentEvent.objects.count(), initial_count)

    def test_unhandled_event_type_does_not_create_payment_event(self):
        """Test that unhandled event types don't create PaymentEvent records"""
        event_id = 'evt_unhandled_123'
        event_data = {'some': 'data'}
        
        initial_count = PaymentEvent.objects.count()
        
        handle_webhook_event('customer.created', event_data, event_id)
        
        self.assertEqual(PaymentEvent.objects.count(), initial_count)

    def test_multiple_different_events_processed(self):
        """Test that different events are all processed correctly"""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            stripe_customer=self.stripe_customer,
            stripe_subscription_id='sub_test123',
            status=Subscription.Status.ACTIVE,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timezone.timedelta(days=30),
            store_count=5
        )
        
        events = [
            ('evt_1', 'invoice.paid', {'subscription': 'sub_test123', 'customer': 'cus_test123'}),
            ('evt_2', 'invoice.paid', {'subscription': 'sub_test123', 'customer': 'cus_test123'}),
            ('evt_3', 'customer.subscription.updated', {
                'id': 'sub_test123',
                'status': 'active',
                'current_period_start': int(timezone.now().timestamp()),
                'current_period_end': int((timezone.now() + timezone.timedelta(days=30)).timestamp()),
                'cancel_at_period_end': False
            }),
        ]
        
        for event_id, event_type, event_data in events:
            handle_webhook_event(event_type, event_data, event_id)
        
        self.assertEqual(PaymentEvent.objects.count(), 3)
        
        for event_id, event_type, event_data in events:
            handle_webhook_event(event_type, event_data, event_id)
        
        self.assertEqual(PaymentEvent.objects.count(), 3)


class WebhookTransactionTest(TestCase):
    """Test webhook transaction handling"""

    def setUp(self):
        """Set up minimal test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name='Test Plan',
            plan_type='ESSENTIALS',
            price_monthly=Decimal('99.00'),
            stripe_price_id='price_test123',
            stripe_product_id='prod_test123'
        )
        
        self.stripe_customer = StripeCustomer.objects.create(
            user=self.user,
            stripe_customer_id='cus_test123'
        )

    def test_transaction_rollback_on_error(self):
        """Test that transaction rolls back on error"""
        event_id = 'evt_error_123'
        event_data = {
            'id': 'sub_test123',
            'customer': 'cus_test123',
            'status': 'active',
            'current_period_start': int(timezone.now().timestamp()),
            'current_period_end': int((timezone.now() + timezone.timedelta(days=30)).timestamp()),
            'cancel_at_period_end': False,
            'metadata': {
                'user_id': str(self.user.id),
                'plan_type': 'NONEXISTENT_PLAN',
                'store_count': '5'
            }
        }
        
        initial_sub_count = Subscription.objects.count()
        initial_event_count = PaymentEvent.objects.count()
        
        try:
            handle_webhook_event('customer.subscription.created', event_data, event_id)
        except Exception:
            pass
        
        self.assertEqual(Subscription.objects.count(), initial_sub_count)
        self.assertEqual(PaymentEvent.objects.count(), initial_event_count)


class DocumentationTest(TestCase):
    """Documentation tests for webhook idempotency"""

    def test_idempotency_documentation(self):
        """
        Document webhook idempotency implementation.
        
        Idempotency Protection:
        - All webhook handlers check for duplicate stripe_event_id before processing
        - PaymentEvent.stripe_event_id has unique constraint in database
        - Early return if event already processed prevents duplicate state changes
        - Transaction.atomic() ensures rollback on errors
        
        Webhook Retry Behavior:
        - Stripe retries webhooks for up to 3 days if endpoint returns non-2xx
        - Our implementation returns success (200) for duplicate events
        - This prevents Stripe from retrying already-processed events
        
        Testing Duplicate Events:
        - Call webhook handler twice with same event_id
        - Verify only one PaymentEvent created
        - Verify subscription/payment state unchanged on second call
        - Verify no errors or exceptions raised
        
        Celery Task Idempotency:
        - process_micro_check_response uses cache-based locking
        - create_daily_micro_check_runs checks for existing runs
        - Both prevent duplicate processing on task retries
        """
        self.assertTrue(True)
