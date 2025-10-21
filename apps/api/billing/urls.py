from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'plans', views.SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'subscriptions', views.SubscriptionViewSet, basename='subscription')

urlpatterns = [
    path('', include(router.urls)),
    path('create-checkout-session/', views.create_checkout_session, name='create-checkout-session'),
    path('create-portal-session/', views.create_portal_session, name='create-portal-session'),
    path('subscription-status/', views.subscription_status, name='subscription-status'),
    path('webhook/', views.stripe_webhook, name='stripe-webhook'),
]
