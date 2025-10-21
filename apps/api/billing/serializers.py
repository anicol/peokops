from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, StripeCustomer, PaymentEvent


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans"""

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'plan_type', 'description', 'price_monthly',
            'unlimited_coaching_videos', 'inspection_mode_enabled',
            'multi_manager_analytics', 'corporate_dashboards',
            'advanced_analytics', 'priority_support', 'dedicated_success_manager',
            'max_videos_per_month', 'max_stores', 'max_users', 'is_active'
        ]
        read_only_fields = ['id']


class StripeCustomerSerializer(serializers.ModelSerializer):
    """Serializer for Stripe customers"""

    class Meta:
        model = StripeCustomer
        fields = ['id', 'user', 'stripe_customer_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions"""
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    days_until_renewal = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'user', 'user_email', 'plan', 'plan_details', 'status',
            'current_period_start', 'current_period_end', 'cancel_at_period_end',
            'canceled_at', 'store_count', 'trial_converted', 'is_active',
            'days_until_renewal', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'stripe_subscription_id', 'stripe_checkout_session_id',
            'created_at', 'updated_at'
        ]


class CreateCheckoutSessionSerializer(serializers.Serializer):
    """Serializer for creating a Stripe checkout session"""
    plan_type = serializers.ChoiceField(choices=SubscriptionPlan.PlanType.choices)
    store_count = serializers.IntegerField(min_value=1, default=1)
    success_url = serializers.URLField(required=False)
    cancel_url = serializers.URLField(required=False)


class PaymentEventSerializer(serializers.ModelSerializer):
    """Serializer for payment events"""

    class Meta:
        model = PaymentEvent
        fields = [
            'id', 'event_type', 'subscription', 'user', 'processed',
            'error_message', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
