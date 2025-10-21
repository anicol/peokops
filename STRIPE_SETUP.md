# Stripe Integration Setup Guide

This guide walks through setting up Stripe for trial-to-paid subscription conversion.

## Overview

The integration includes:
- **Backend**: Django billing app with Stripe API integration
- **Frontend**: Checkout page with plan selection
- **Webhook handling**: Automatic subscription management
- **Trial conversion**: Seamless upgrade from trial to paid

## Setup Steps

### 1. Create Stripe Account

1. Sign up at https://stripe.com
2. Get your API keys from the Dashboard → Developers → API keys
3. You'll need:
   - **Secret key** (sk_test_... for test mode)
   - **Publishable key** (pk_test_... for test mode)

### 2. Create Products and Prices in Stripe

#### Via Stripe Dashboard:

1. Go to **Products** → **Add product**
2. Create two products matching the pricing page:

**Product 1: Starter Coaching**
- Name: `Starter Coaching`
- Description: `Private AI coaching to build confidence`
- Pricing: `$49/month per store`
- Billing period: `Monthly`
- Pricing model: `Per unit`
- Copy the **Product ID** (starts with `prod_`)
- Copy the **Price ID** (starts with `price_`)

**Product 2: Pro Coaching**
- Name: `Pro Coaching`
- Description: `Everything in Starter plus multi-manager analytics`
- Pricing: `$79/month per store`
- Billing period: `Monthly`
- Pricing model: `Per unit`
- Copy the **Product ID** (starts with `prod_`)
- Copy the **Price ID** (starts with `price_`)

### 3. Configure Environment Variables

Add to your `.env` file:

```bash
# Stripe Settings
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
FRONTEND_URL=http://localhost:5174
```

### 4. Run Database Migrations

```bash
cd apps/api
python manage.py makemigrations billing
python manage.py migrate
```

### 5. Create Subscription Plans

```bash
python manage.py create_subscription_plans
```

Then update the Stripe IDs via Django Admin:
1. Go to http://localhost:8000/admin/billing/subscriptionplan/
2. Update each plan with the correct `stripe_price_id` and `stripe_product_id` from Step 2

### 6. Setup Stripe Webhooks

#### For Local Development (using Stripe CLI):

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:8000/api/billing/webhook/
   ```
4. Copy the webhook secret (starts with `whsec_`) and add to `.env`

#### For Production:

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://api.getpeakops.com/api/billing/webhook/`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the webhook signing secret and add to production environment

### 7. Enable Stripe Customer Portal (Optional)

1. Go to **Settings** → **Billing** → **Customer portal**
2. Enable portal and configure:
   - Allow customers to update payment methods
   - Allow customers to cancel subscriptions
   - Configure cancellation options

### 8. Test the Integration

#### Test with Stripe Test Cards:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

#### Test Flow:

1. Create a trial account: http://localhost:5174/trial-signup
2. Login and see trial status banner
3. Click "Upgrade Now"
4. Select a plan on checkout page
5. Enter test card details
6. Complete payment
7. Verify:
   - User is redirected to dashboard
   - `user.is_trial_user = False`
   - Subscription record created in database
   - Trial limitations removed

## Database Models

### SubscriptionPlan
Stores available subscription plans matching the pricing page.

### StripeCustomer
Links Django users to Stripe customers.

### Subscription
Tracks user subscriptions with status and billing periods.

### PaymentEvent
Logs all Stripe webhook events for auditing.

## API Endpoints

### `/api/billing/plans/`
GET - List available subscription plans

### `/api/billing/create-checkout-session/`
POST - Create a Stripe checkout session
```json
{
  "plan_type": "STARTER_COACHING",
  "store_count": 1
}
```

### `/api/billing/subscription-status/`
GET - Get current user's subscription status

### `/api/billing/create-portal-session/`
POST - Create Stripe customer portal session (for managing subscriptions)

### `/api/billing/webhook/`
POST - Stripe webhook endpoint (called by Stripe, not the frontend)

### `/api/billing/subscriptions/`
GET - List user's subscriptions

### `/api/billing/subscriptions/{id}/cancel/`
POST - Cancel subscription at period end

### `/api/billing/subscriptions/{id}/reactivate/`
POST - Reactivate canceled subscription

## Frontend Components

### CheckoutPage (`/checkout`)
- Displays available plans
- Store count selector
- Total calculation
- Redirects to Stripe Checkout

### Upgrade Click Handlers
Wired up in:
- `TrialStatusBanner` (apps/web/src/components/TrialStatusBanner.tsx:140)
- `UploadLimitGuard` (apps/web/src/components/UploadLimitGuard.tsx:106)
- `Dashboard` (apps/web/src/pages/Dashboard.tsx:140)
- `VideoUploadPage` (apps/web/src/pages/VideoUploadPage.tsx:102)

## Webhook Event Handlers

Located in `billing/webhook_handlers.py`:

- **checkout.session.completed**: Records successful checkout
- **customer.subscription.created**: Creates subscription, converts trial
- **customer.subscription.updated**: Updates subscription status
- **customer.subscription.deleted**: Marks subscription as canceled
- **invoice.paid**: Records successful payment
- **invoice.payment_failed**: Updates subscription to past_due

## Trial to Paid Conversion Logic

When a trial user completes checkout:

1. Stripe checkout session includes metadata:
   ```python
   metadata={
       'user_id': user.id,
       'plan_type': plan_type,
       'is_trial_conversion': user.is_trial_user
   }
   ```

2. On `customer.subscription.created` webhook:
   ```python
   if is_trial_conversion and user.is_trial_user:
       subscription.convert_from_trial()
       # Sets user.is_trial_user = False
       # Removes all trial limitations
   ```

3. User gains access to:
   - Unlimited video uploads
   - All plan features
   - No expiry date

## Monitoring and Analytics

### Track Conversion Events
Key metrics to monitor:
- Trial signups
- Trial-to-paid conversion rate
- Days to conversion
- Churn rate
- MRR (Monthly Recurring Revenue)

### Useful Queries

```python
# Get conversion rate
from accounts.models import User
from billing.models import Subscription

total_trials = User.objects.filter(is_trial_user=True).count()
conversions = Subscription.objects.filter(trial_converted=True).count()
conversion_rate = (conversions / total_trials) * 100

# Get trial users close to conversion
high_score_trials = User.objects.filter(
    is_trial_user=True,
    trial_conversion_score__gte=70
).order_by('-trial_conversion_score')
```

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is publicly accessible
- Verify webhook secret matches
- Check Stripe CLI is running (local dev)
- Check webhook signature verification

### Checkout session not creating
- Verify Stripe API keys are correct
- Check plan IDs match Stripe products
- Ensure user has StripeCustomer record

### Trial not converting
- Check webhook handler logs
- Verify `is_trial_conversion` metadata is set
- Check subscription created successfully

### Payment failed
- User sees error from Stripe
- Check `PaymentEvent` records
- Review Stripe dashboard for details

## Security Best Practices

1. **Never expose secret keys**: Keep `STRIPE_SECRET_KEY` server-side only
2. **Verify webhook signatures**: Always validate `stripe.Webhook.construct_event()`
3. **Use HTTPS in production**: Required for PCI compliance
4. **Validate amounts**: Check prices match expected values
5. **Idempotency**: Handle duplicate webhook deliveries gracefully

## Going to Production

1. Switch to live mode API keys
2. Update webhook endpoint to production URL
3. Test with real credit cards (small amounts)
4. Set up monitoring and alerting
5. Configure Stripe Radar for fraud prevention
6. Enable 3D Secure authentication
7. Set up email notifications for payment events

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Testing](https://stripe.com/docs/testing)
