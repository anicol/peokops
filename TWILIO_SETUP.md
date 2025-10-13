# Twilio SMS Setup Guide

This guide will help you configure Twilio SMS for sending magic links during onboarding.

## Prerequisites

- A Twilio account ([Sign up for free](https://www.twilio.com/try-twilio))
- A Twilio phone number with SMS capabilities

## Step 1: Get Your Twilio Credentials

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. From the dashboard, find:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "Show" to reveal)
3. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
4. Copy your Twilio phone number (format: `+15551234567`)

## Step 2: Add Credentials to Environment

Add these variables to your `.env` file:

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# Micro-check Base URL (adjust for production)
MICRO_CHECK_BASE_URL=http://localhost:3001
```

**For Production:**
```bash
MICRO_CHECK_BASE_URL=https://app.getpeakops.com
```

## Step 3: Install Twilio Package (if not already installed)

The Twilio package is already in `requirements.txt`:

```bash
cd apps/api
pip install -r requirements.txt
```

Or in Docker:
```bash
docker-compose build api
docker-compose up -d
```

## Step 4: Test SMS Sending

The SMS integration is automatically used during the quick-signup flow.

### Manual Test

You can test SMS sending directly:

```python
from micro_checks.utils import send_magic_link_sms

# Test sending
success = send_magic_link_sms(
    phone="+15551234567",  # Your test phone number
    token="test_token_abc123",
    store_name="Test Store"
)

print(f"SMS sent: {success}")
```

### API Test

Create a test user via the API:

```bash
curl -X POST http://localhost:8000/api/auth/quick-signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+15551234567",
    "email": "test@example.com",
    "store_name": "Test Store",
    "industry": "RESTAURANT"
  }'
```

You should receive an SMS with the magic link!

## SMS Message Format

The message sent looks like:

```
✨ Your first Test Store checks are ready!

Complete 3 quick checks (under 2 min):
http://localhost:3001/check/abc123token

No login required - just tap the link!
```

## Troubleshooting

### SMS Not Sending

1. **Check credentials**: Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` are correct
2. **Check logs**: Look for error messages in Django logs:
   ```bash
   docker-compose logs -f api | grep -i twilio
   ```
3. **Verify phone number format**: Must be E.164 format (`+15551234567`)
4. **Check Twilio balance**: Free trial accounts need credits
5. **Verify phone number**: Trial accounts can only send to verified numbers

### "Twilio credentials not configured" Warning

If you see this warning, SMS sending is disabled (app works fine without SMS). To enable:
- Add credentials to `.env`
- Restart the API server

### Trial Account Limitations

Twilio trial accounts have restrictions:
- Can only send to **verified phone numbers**
- Messages include "Sent from your Twilio trial account" prefix
- Limited free credits

**To verify a number on trial:**
1. Go to Twilio Console → Phone Numbers → Verified Caller IDs
2. Click **Add a new Caller ID**
3. Enter the phone number and verify via SMS code

### Production Considerations

For production:
1. **Upgrade to paid account** - Remove trial restrictions
2. **Update base URL** - Set `MICRO_CHECK_BASE_URL=https://app.getpeakops.com`
3. **Set up monitoring** - Track SMS delivery rates
4. **Configure webhooks** - Get delivery status callbacks
5. **Consider message templates** - Comply with carrier regulations

## Cost Estimates

Twilio SMS pricing (as of 2024):
- **Outbound SMS (US)**: ~$0.0079 per message
- **Phone number rental**: ~$1.15/month

**Example costs:**
- 100 signups/day = 100 SMS × $0.0079 = **$0.79/day** (~$24/month)
- 1,000 signups/day = **$7.90/day** (~$237/month)

## Alternative: Disable SMS

If you don't want to use SMS, the app works fine without it:
1. Leave Twilio credentials empty in `.env`
2. Users can still use the magic link returned in the API response
3. Frontend displays the link to copy/paste

## Support

- Twilio Support: https://support.twilio.com/
- Twilio Console: https://console.twilio.com/
- API Documentation: https://www.twilio.com/docs/sms/api
