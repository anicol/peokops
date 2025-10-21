"""
Stripe webhook event handlers
"""
import logging
from django.utils import timezone
from django.db import transaction
from accounts.models import User
from .models import Subscription, StripeCustomer, SubscriptionPlan, PaymentEvent

logger = logging.getLogger(__name__)


def handle_webhook_event(event_type: str, event_data: dict, event_id: str):
    """Route webhook events to appropriate handlers"""

    handlers = {
        'checkout.session.completed': handle_checkout_completed,
        'customer.subscription.created': handle_subscription_created,
        'customer.subscription.updated': handle_subscription_updated,
        'customer.subscription.deleted': handle_subscription_deleted,
        'invoice.paid': handle_invoice_paid,
        'invoice.payment_failed': handle_invoice_payment_failed,
    }

    handler = handlers.get(event_type)
    if handler:
        try:
            with transaction.atomic():
                handler(event_data, event_id)
                logger.info(f"Successfully handled webhook event: {event_type} ({event_id})")
        except Exception as e:
            logger.error(f"Error handling webhook event {event_type} ({event_id}): {str(e)}")
            raise
    else:
        logger.info(f"Unhandled webhook event type: {event_type}")


def handle_checkout_completed(event_data: dict, event_id: str):
    """Handle checkout.session.completed event"""
    session = event_data
    customer_id = session.get('customer')
    subscription_id = session.get('subscription')
    metadata = session.get('metadata', {})

    # Get user
    user_id = metadata.get('user_id')
    if not user_id:
        logger.error(f"No user_id in checkout session metadata: {event_id}")
        return

    try:
        user = User.objects.get(id=user_id)
        stripe_customer = StripeCustomer.objects.get(stripe_customer_id=customer_id)

        # Record event
        PaymentEvent.objects.create(
            user=user,
            event_type=PaymentEvent.EventType.CHECKOUT_COMPLETED,
            stripe_event_id=event_id,
            stripe_event_data=event_data,
            processed=True
        )

        logger.info(f"Checkout completed for user {user.email}: {subscription_id}")

    except User.DoesNotExist:
        logger.error(f"User not found: {user_id}")
    except StripeCustomer.DoesNotExist:
        logger.error(f"Stripe customer not found: {customer_id}")


def handle_subscription_created(event_data: dict, event_id: str):
    """Handle customer.subscription.created event"""
    subscription_data = event_data
    customer_id = subscription_data.get('customer')
    subscription_id = subscription_data.get('id')
    metadata = subscription_data.get('metadata', {})

    try:
        # Get customer and user
        stripe_customer = StripeCustomer.objects.get(stripe_customer_id=customer_id)
        user = stripe_customer.user

        # Get plan from metadata
        plan_type = metadata.get('plan_type')
        plan = SubscriptionPlan.objects.get(plan_type=plan_type, is_active=True)

        # Get store count from metadata (handle None values)
        store_count_raw = metadata.get('store_count', 1)
        store_count = int(store_count_raw) if store_count_raw is not None else 1
        is_trial_conversion = metadata.get('is_trial_conversion') == 'True'

        # Map Stripe status to our status
        stripe_status = subscription_data.get('status', 'incomplete')
        status_map = {
            'active': Subscription.Status.ACTIVE,
            'past_due': Subscription.Status.PAST_DUE,
            'canceled': Subscription.Status.CANCELED,
            'incomplete': Subscription.Status.INCOMPLETE,
            'trialing': Subscription.Status.TRIALING,
            'unpaid': Subscription.Status.UNPAID,
        }
        status = status_map.get(stripe_status, Subscription.Status.INCOMPLETE)

        # Create subscription
        subscription = Subscription.objects.create(
            user=user,
            plan=plan,
            stripe_customer=stripe_customer,
            stripe_subscription_id=subscription_id,
            status=status,
            current_period_start=timezone.datetime.fromtimestamp(
                subscription_data.get('current_period_start'),
                tz=timezone.utc
            ),
            current_period_end=timezone.datetime.fromtimestamp(
                subscription_data.get('current_period_end'),
                tz=timezone.utc
            ),
            cancel_at_period_end=subscription_data.get('cancel_at_period_end', False),
            store_count=store_count,
            trial_converted=is_trial_conversion,
            metadata=metadata
        )

        # Convert from trial if applicable
        if is_trial_conversion and user.is_trial_user:
            subscription.convert_from_trial()
            logger.info(f"Trial converted to paid subscription for user {user.email}")

        # Record event
        PaymentEvent.objects.create(
            user=user,
            subscription=subscription,
            event_type=PaymentEvent.EventType.SUBSCRIPTION_CREATED,
            stripe_event_id=event_id,
            stripe_event_data=event_data,
            processed=True
        )

        logger.info(f"Subscription created for user {user.email}: {subscription_id}")

    except StripeCustomer.DoesNotExist:
        logger.error(f"Stripe customer not found: {customer_id}")
    except SubscriptionPlan.DoesNotExist:
        logger.error(f"Plan not found: {plan_type}")


def handle_subscription_updated(event_data: dict, event_id: str):
    """Handle customer.subscription.updated event"""
    subscription_data = event_data
    subscription_id = subscription_data.get('id')

    try:
        subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)

        # Update status
        stripe_status = subscription_data.get('status', 'incomplete')
        status_map = {
            'active': Subscription.Status.ACTIVE,
            'past_due': Subscription.Status.PAST_DUE,
            'canceled': Subscription.Status.CANCELED,
            'incomplete': Subscription.Status.INCOMPLETE,
            'trialing': Subscription.Status.TRIALING,
            'unpaid': Subscription.Status.UNPAID,
        }
        subscription.status = status_map.get(stripe_status, Subscription.Status.INCOMPLETE)

        # Update period dates
        subscription.current_period_start = timezone.datetime.fromtimestamp(
            subscription_data.get('current_period_start'),
            tz=timezone.utc
        )
        subscription.current_period_end = timezone.datetime.fromtimestamp(
            subscription_data.get('current_period_end'),
            tz=timezone.utc
        )

        # Update cancel status
        subscription.cancel_at_period_end = subscription_data.get('cancel_at_period_end', False)
        if subscription_data.get('canceled_at'):
            subscription.canceled_at = timezone.datetime.fromtimestamp(
                subscription_data.get('canceled_at'),
                tz=timezone.utc
            )

        subscription.save()

        # Record event
        PaymentEvent.objects.create(
            user=subscription.user,
            subscription=subscription,
            event_type=PaymentEvent.EventType.SUBSCRIPTION_UPDATED,
            stripe_event_id=event_id,
            stripe_event_data=event_data,
            processed=True
        )

        logger.info(f"Subscription updated: {subscription_id}")

    except Subscription.DoesNotExist:
        logger.error(f"Subscription not found: {subscription_id}")


def handle_subscription_deleted(event_data: dict, event_id: str):
    """Handle customer.subscription.deleted event"""
    subscription_data = event_data
    subscription_id = subscription_data.get('id')

    try:
        subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)
        subscription.status = Subscription.Status.CANCELED
        subscription.canceled_at = timezone.now()
        subscription.save()

        # Record event
        PaymentEvent.objects.create(
            user=subscription.user,
            subscription=subscription,
            event_type=PaymentEvent.EventType.SUBSCRIPTION_DELETED,
            stripe_event_id=event_id,
            stripe_event_data=event_data,
            processed=True
        )

        logger.info(f"Subscription deleted: {subscription_id}")

    except Subscription.DoesNotExist:
        logger.error(f"Subscription not found: {subscription_id}")


def handle_invoice_paid(event_data: dict, event_id: str):
    """Handle invoice.paid event"""
    invoice = event_data
    subscription_id = invoice.get('subscription')
    customer_id = invoice.get('customer')

    try:
        stripe_customer = StripeCustomer.objects.get(stripe_customer_id=customer_id)
        subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)

        # Record event
        PaymentEvent.objects.create(
            user=subscription.user,
            subscription=subscription,
            event_type=PaymentEvent.EventType.INVOICE_PAID,
            stripe_event_id=event_id,
            stripe_event_data=event_data,
            processed=True
        )

        logger.info(f"Invoice paid for subscription: {subscription_id}")

    except (StripeCustomer.DoesNotExist, Subscription.DoesNotExist) as e:
        logger.error(f"Error handling invoice.paid: {str(e)}")


def handle_invoice_payment_failed(event_data: dict, event_id: str):
    """Handle invoice.payment_failed event"""
    invoice = event_data
    subscription_id = invoice.get('subscription')
    customer_id = invoice.get('customer')

    try:
        stripe_customer = StripeCustomer.objects.get(stripe_customer_id=customer_id)
        subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)

        # Update subscription status
        subscription.status = Subscription.Status.PAST_DUE
        subscription.save()

        # Record event
        PaymentEvent.objects.create(
            user=subscription.user,
            subscription=subscription,
            event_type=PaymentEvent.EventType.INVOICE_PAYMENT_FAILED,
            stripe_event_id=event_id,
            stripe_event_data=event_data,
            processed=True
        )

        logger.warning(f"Invoice payment failed for subscription: {subscription_id}")

    except (StripeCustomer.DoesNotExist, Subscription.DoesNotExist) as e:
        logger.error(f"Error handling invoice.payment_failed: {str(e)}")
