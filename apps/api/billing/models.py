from django.db import models
from django.utils import timezone
from accounts.models import User


class SubscriptionPlan(models.Model):
    """Subscription plans matching the pricing page"""

    class PlanType(models.TextChoices):
        STARTER_COACHING = 'STARTER_COACHING', 'Starter Coaching'
        PRO_COACHING = 'PRO_COACHING', 'Pro Coaching'
        ESSENTIALS = 'ESSENTIALS', 'Corporate Essentials'
        PROFESSIONAL = 'PROFESSIONAL', 'Corporate Professional'
        ENTERPRISE_ELITE = 'ENTERPRISE_ELITE', 'Enterprise Elite'

    name = models.CharField(max_length=100)
    plan_type = models.CharField(max_length=50, choices=PlanType.choices, unique=True)
    description = models.TextField(blank=True)

    # Pricing
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price per store per month")
    stripe_price_id = models.CharField(max_length=100, help_text="Stripe Price ID")
    stripe_product_id = models.CharField(max_length=100, help_text="Stripe Product ID")

    # Features
    unlimited_coaching_videos = models.BooleanField(default=False)
    inspection_mode_enabled = models.BooleanField(default=False)
    multi_manager_analytics = models.BooleanField(default=False)
    corporate_dashboards = models.BooleanField(default=False)
    advanced_analytics = models.BooleanField(default=False)
    priority_support = models.BooleanField(default=False)
    dedicated_success_manager = models.BooleanField(default=False)

    # Limits (None = unlimited)
    max_videos_per_month = models.IntegerField(null=True, blank=True, help_text="Max videos per month, null = unlimited")
    max_stores = models.IntegerField(null=True, blank=True, help_text="Max stores, null = unlimited")
    max_users = models.IntegerField(null=True, blank=True, help_text="Max users, null = unlimited")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['price_monthly']

    def __str__(self):
        return f"{self.name} (${self.price_monthly}/store/month)"


class StripeCustomer(models.Model):
    """Links Django users to Stripe customers"""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='stripe_customer')
    stripe_customer_id = models.CharField(max_length=100, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stripe_customers'

    def __str__(self):
        return f"{self.user.email} - {self.stripe_customer_id}"


class Subscription(models.Model):
    """User subscriptions"""

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        PAST_DUE = 'PAST_DUE', 'Past Due'
        CANCELED = 'CANCELED', 'Canceled'
        INCOMPLETE = 'INCOMPLETE', 'Incomplete'
        TRIALING = 'TRIALING', 'Trialing'
        UNPAID = 'UNPAID', 'Unpaid'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    stripe_customer = models.ForeignKey(StripeCustomer, on_delete=models.PROTECT, related_name='subscriptions')

    # Stripe data
    stripe_subscription_id = models.CharField(max_length=100, unique=True)
    stripe_checkout_session_id = models.CharField(max_length=200, blank=True, null=True)

    # Status and dates
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INCOMPLETE)
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    cancel_at_period_end = models.BooleanField(default=False)
    canceled_at = models.DateTimeField(null=True, blank=True)

    # Store count for billing
    store_count = models.IntegerField(default=1, help_text="Number of stores in subscription")

    # Metadata
    trial_converted = models.BooleanField(default=False, help_text="Was this a trial conversion")
    metadata = models.JSONField(default=dict, help_text="Additional subscription metadata")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscriptions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.plan.name} ({self.status})"

    @property
    def is_active(self):
        """Check if subscription is currently active"""
        return self.status in [self.Status.ACTIVE, self.Status.TRIALING]

    @property
    def days_until_renewal(self):
        """Days until next billing period"""
        if not self.current_period_end:
            return None
        delta = self.current_period_end - timezone.now()
        return max(0, delta.days)

    def convert_from_trial(self):
        """Mark subscription as converted from trial"""
        self.trial_converted = True
        self.user.is_trial_user = False
        self.user.save()
        self.save()


class PaymentEvent(models.Model):
    """Track payment events from Stripe webhooks"""

    class EventType(models.TextChoices):
        CHECKOUT_COMPLETED = 'CHECKOUT_COMPLETED', 'Checkout Session Completed'
        SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED', 'Subscription Created'
        SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED', 'Subscription Updated'
        SUBSCRIPTION_DELETED = 'SUBSCRIPTION_DELETED', 'Subscription Deleted'
        PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED', 'Payment Succeeded'
        PAYMENT_FAILED = 'PAYMENT_FAILED', 'Payment Failed'
        INVOICE_PAID = 'INVOICE_PAID', 'Invoice Paid'
        INVOICE_PAYMENT_FAILED = 'INVOICE_PAYMENT_FAILED', 'Invoice Payment Failed'

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='payment_events', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_events', null=True, blank=True)

    event_type = models.CharField(max_length=50, choices=EventType.choices)
    stripe_event_id = models.CharField(max_length=100, unique=True)
    stripe_event_data = models.JSONField(help_text="Full Stripe event data")

    processed = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stripe_event_id']),
            models.Index(fields=['event_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.stripe_event_id}"
