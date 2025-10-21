import stripe
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import SubscriptionPlan, Subscription, StripeCustomer, PaymentEvent
from .serializers import (
    SubscriptionPlanSerializer,
    SubscriptionSerializer,
    CreateCheckoutSessionSerializer,
    PaymentEventSerializer
)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for subscription plans"""
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]


class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user subscriptions"""
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return subscriptions for current user"""
        return Subscription.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel subscription at period end"""
        subscription = self.get_object()

        try:
            # Cancel in Stripe
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )

            # Update local record
            subscription.cancel_at_period_end = True
            subscription.save()

            return Response({'status': 'subscription_will_cancel'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """Reactivate a canceled subscription"""
        subscription = self.get_object()

        try:
            # Reactivate in Stripe
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=False
            )

            # Update local record
            subscription.cancel_at_period_end = False
            subscription.save()

            return Response({'status': 'subscription_reactivated'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(
    request=CreateCheckoutSessionSerializer,
    responses={200: dict, 400: None},
    description="Create a Stripe checkout session for subscription"
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Create a Stripe checkout session"""
    serializer = CreateCheckoutSessionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    plan_type = serializer.validated_data['plan_type']
    store_count = serializer.validated_data.get('store_count', 1)

    try:
        # Get plan
        plan = SubscriptionPlan.objects.get(plan_type=plan_type, is_active=True)

        # Get or create Stripe customer
        try:
            stripe_customer = StripeCustomer.objects.get(user=user)
        except StripeCustomer.DoesNotExist:
            # Create Stripe customer first
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name,
                metadata={
                    'user_id': user.id,
                    'is_trial_conversion': user.is_trial_user
                }
            )
            # Then create the database record with the Stripe ID
            stripe_customer = StripeCustomer.objects.create(
                user=user,
                stripe_customer_id=customer.id
            )

        # If customer exists but has no stripe_customer_id, create one
        if not stripe_customer.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name,
                metadata={
                    'user_id': user.id,
                    'is_trial_conversion': user.is_trial_user
                }
            )
            stripe_customer.stripe_customer_id = customer.id
            stripe_customer.save()

        # Build success and cancel URLs
        base_url = settings.FRONTEND_URL
        success_url = serializer.validated_data.get(
            'success_url',
            f"{base_url}/dashboard?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
        )
        cancel_url = serializer.validated_data.get(
            'cancel_url',
            f"{base_url}/pricing?checkout=canceled"
        )

        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=stripe_customer.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': plan.stripe_price_id,
                'quantity': store_count,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_id': user.id,
                'plan_type': plan_type,
                'store_count': store_count,
                'is_trial_conversion': user.is_trial_user
            },
            subscription_data={
                'metadata': {
                    'user_id': user.id,
                    'plan_type': plan_type,
                    'store_count': store_count,
                    'is_trial_conversion': user.is_trial_user
                }
            }
        )

        return Response({
            'checkout_session_id': checkout_session.id,
            'checkout_url': checkout_session.url
        })

    except SubscriptionPlan.DoesNotExist:
        return Response(
            {'error': 'Plan not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_portal_session(request):
    """Create a Stripe customer portal session"""
    user = request.user

    try:
        stripe_customer = StripeCustomer.objects.get(user=user)

        # Create portal session with configuration
        portal_session = stripe.billing_portal.Session.create(
            customer=stripe_customer.stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/account",
            configuration='bpc_1SKkP2BUcsvT46oA9wHzR8zE'
        )

        return Response({'portal_url': portal_session.url})

    except StripeCustomer.DoesNotExist:
        return Response(
            {'error': 'No Stripe customer found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """Get current subscription status for user"""
    user = request.user

    # Check for active subscription
    active_subscription = Subscription.objects.filter(
        user=user,
        status__in=[Subscription.Status.ACTIVE, Subscription.Status.TRIALING]
    ).first()

    if active_subscription:
        serializer = SubscriptionSerializer(active_subscription)
        return Response({
            'has_subscription': True,
            'subscription': serializer.data
        })

    # Check if user is still on trial
    if user.is_trial_user:
        trial_status = user.get_trial_status()
        return Response({
            'has_subscription': False,
            'is_trial': True,
            'trial_status': trial_status
        })

    return Response({
        'has_subscription': False,
        'is_trial': False
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook(request):
    """Handle Stripe webhook events"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return Response({'error': 'Invalid payload'}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

    # Handle the event
    event_type = event['type']
    event_data = event['data']['object']

    # Import handler to avoid circular imports
    from .webhook_handlers import handle_webhook_event

    try:
        handle_webhook_event(event_type, event_data, event['id'])
        return Response({'status': 'success'})
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
