# Stripe Integration - Quick Start Guide

## ✅ Installation Complete!

All components are now running with Stripe integration ready. Here's what to do next:

## Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com (create account if needed)
2. Switch to **Test mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy:
   - **Secret key** (starts with `sk_test_`)
   - **Publishable key** (starts with `pk_test_`)

## Step 2: Create Stripe Products

### Create Product 1: Starter Coaching ($49/month)

1. Go to **Products** → **Add product**
2. Fill in:
   - **Name**: Starter Coaching
   - **Description**: Private AI coaching to build confidence
   - **Pricing model**: Standard pricing
   - **Price**: $49.00
   - **Billing period**: Monthly
   - **Pricing type**: Per unit
3. Click **Add product**
4. **Copy the Price ID** (starts with `price_`) and **Product ID** (starts with `prod_`)

### Create Product 2: Pro Coaching ($79/month)

1. Go to **Products** → **Add product**
2. Fill in:
   - **Name**: Pro Coaching
   - **Description**: Everything in Starter plus multi-manager analytics
   - **Pricing model**: Standard pricing
   - **Price**: $79.00
   - **Billing period**: Monthly
   - **Pricing type**: Per unit
3. Click **Add product**
4. **Copy the Price ID** (starts with `price_`) and **Product ID** (starts with `prod_`)

## Step 3: Update Environment Variables

Add these to your `.env` file:

```bash
# Stripe Settings
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

Then restart the API:
```bash
docker-compose restart api celery celery-beat
```

## Step 4: Initialize Subscription Plans

```bash
# Create the plan records in database
docker-compose exec api python manage.py create_subscription_plans

# You should see:
# ✓ Created: Starter Coaching
# ✓ Created: Pro Coaching
```

## Step 5: Update Plans with Stripe IDs

1. Open Django Admin: http://localhost:8000/admin/
2. Login with your admin account
3. Go to **Billing** → **Subscription plans**
4. For **Starter Coaching**:
   - Update `stripe_price_id` with the Price ID from Step 2
   - Update `stripe_product_id` with the Product ID from Step 2
   - Click **Save**
5. For **Pro Coaching**:
   - Update `stripe_price_id` with the Price ID from Step 2
   - Update `stripe_product_id` with the Product ID from Step 2
   - Click **Save**

## Step 6: Setup Webhook (Local Development)

### Option A: Using Stripe CLI (Recommended)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli#install
2. Login to Stripe:
   ```bash
   stripe login
   ```
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:8000/api/billing/webhook/
   ```
4. **Copy the webhook signing secret** from the output (starts with `whsec_`)
5. Add it to your `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_FROM_CLI
   ```
6. Restart API:
   ```bash
   docker-compose restart api celery celery-beat
   ```

### Option B: Skip webhooks for now
You can test checkout without webhooks, but the subscription won't be created automatically. Good for initial testing only.

## Step 7: Test the Integration

### 1. Create a trial account
- Go to http://localhost:5174/trial-signup
- Fill in email and password
- Click **Start Free Trial**

### 2. Verify trial status
- You should be redirected to the dashboard
- See trial status banner at the top
- Try uploading a video to see the trial limits

### 3. Test checkout flow
- Click **Upgrade Now** on the trial banner
- Or go directly to http://localhost:5174/checkout
- Select a plan (Starter or Pro)
- Adjust store count if needed
- Click **Continue to Payment**

### 4. Complete payment with test card
- Card number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)
- Click **Pay**

### 5. Verify conversion
- You should be redirected back to your app with success message
- User's trial status should be removed
- All trial limitations should be lifted
- Check Django Admin → **Billing** → **Subscriptions** to see the new subscription

## Test Cards

Stripe provides these test cards:

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline (generic) |
| 4000 0025 0000 3155 | Requires 3D Secure |
| 4000 0000 0000 9995 | Insufficient funds |

Always use:
- Any **future expiry date**
- Any **3-digit CVC**
- Any **5-digit ZIP code**

## Troubleshooting

### Plans not showing on checkout page
- Check that you ran `create_subscription_plans` command
- Verify Stripe Price IDs are set in Django Admin
- Check browser console for API errors

### Checkout session creation fails
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check API logs: `docker-compose logs api`
- Ensure Stripe products exist in your dashboard

### Payment succeeds but subscription not created
- Check webhook is running (Stripe CLI or configured in dashboard)
- Verify `STRIPE_WEBHOOK_SECRET` is set
- Check webhook logs: `docker-compose logs api | grep webhook`
- Check PaymentEvents in Django Admin

### Webhook signature verification fails
- Make sure webhook secret matches between Stripe CLI output and `.env`
- Restart API after updating webhook secret

## API Endpoints

Test these directly if needed:

```bash
# Get available plans
curl http://localhost:8000/api/billing/plans/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get subscription status
curl http://localhost:8000/api/billing/subscription-status/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create checkout session
curl -X POST http://localhost:8000/api/billing/create-checkout-session/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_type": "STARTER_COACHING",
    "store_count": 1
  }'
```

## Going to Production

When ready for production:

1. Switch to **Live mode** in Stripe Dashboard
2. Get live API keys (start with `sk_live_` and `pk_live_`)
3. Recreate products in live mode
4. Update `.env` with live keys and product IDs
5. Configure webhook in Stripe Dashboard:
   - URL: `https://api.getpeakops.com/api/billing/webhook/`
   - Events: All subscription and invoice events
6. Update `STRIPE_WEBHOOK_SECRET` with live webhook secret
7. Test with real card (small amount first!)

## Support

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Docs**: https://stripe.com/docs
- **Django Admin**: http://localhost:8000/admin/
- **API Docs**: http://localhost:8000/api/docs/

See **STRIPE_SETUP.md** for detailed documentation.
