from django.contrib import admin
from .models import SubscriptionPlan, StripeCustomer, Subscription, PaymentEvent


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'plan_type', 'price_monthly', 'is_active', 'created_at']
    list_filter = ['plan_type', 'is_active']
    search_fields = ['name', 'stripe_price_id', 'stripe_product_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(StripeCustomer)
class StripeCustomerAdmin(admin.ModelAdmin):
    list_display = ['user', 'stripe_customer_id', 'created_at']
    search_fields = ['user__email', 'user__username', 'stripe_customer_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'status', 'store_count', 'current_period_end', 'trial_converted']
    list_filter = ['status', 'plan', 'trial_converted', 'cancel_at_period_end']
    search_fields = ['user__email', 'user__username', 'stripe_subscription_id']
    readonly_fields = ['created_at', 'updated_at', 'stripe_subscription_id', 'stripe_checkout_session_id']
    date_hierarchy = 'created_at'


@admin.register(PaymentEvent)
class PaymentEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'user', 'subscription', 'processed', 'created_at']
    list_filter = ['event_type', 'processed']
    search_fields = ['stripe_event_id', 'user__email']
    readonly_fields = ['created_at', 'stripe_event_id', 'stripe_event_data']
    date_hierarchy = 'created_at'
