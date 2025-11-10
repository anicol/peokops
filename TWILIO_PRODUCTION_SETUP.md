# Twilio Production Environment Setup

This document provides instructions for configuring Twilio SMS in the production environment.

## Production Environment Variables

Add the following environment variables to your production hosting platform (Render, AWS, Heroku, etc.):

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_PHONE_NUMBER=<your-twilio-phone-number>

# Production Base URL for Magic Links
MICRO_CHECK_BASE_URL=https://app.getpeakops.com
```

**Note**: Replace the placeholder values with your actual Twilio credentials from the Twilio console.

## Setup Instructions by Platform

### Render.com

1. Navigate to your service in the Render dashboard
2. Go to **Environment** tab
3. Add each environment variable:
   - Click **Add Environment Variable**
   - Enter the key and value from above
   - Click **Save Changes**
4. Render will automatically redeploy with the new variables

### AWS Elastic Beanstalk

1. Navigate to your Elastic Beanstalk application
2. Go to **Configuration** > **Software**
3. Scroll to **Environment properties**
4. Add each environment variable
5. Click **Apply** to redeploy

### Heroku

```bash
heroku config:set TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
heroku config:set TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
heroku config:set TWILIO_PHONE_NUMBER=<your-twilio-phone-number>
heroku config:set MICRO_CHECK_BASE_URL=https://app.getpeakops.com
```

### Docker Compose (Production)

Add to your production `docker-compose.yml` or `.env` file:

```yaml
environment:
  - TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
  - TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
  - TWILIO_PHONE_NUMBER=<your-twilio-phone-number>
  - MICRO_CHECK_BASE_URL=https://app.getpeakops.com
```

## Features Enabled

Once configured, the following SMS features will be active:

### 1. Passwordless Onboarding (Quick Signup)
- New users receive SMS with magic link
- No password required for first access
- Reduces signup friction

**Endpoint**: `POST /api/auth/quick-signup/`

### 2. Employee Voice Pulse Surveys
- Automatic SMS invitations during shift windows
- Anonymous feedback collection
- Hourly Celery task sends SMS

**Task**: `send_pulse_invitations` (runs hourly)

### 3. Micro-Check Daily Reminders
- Store managers receive SMS with daily check assignments
- Personalized with store name
- Magic link for quick access

**Function**: `send_micro_check_assignment()`

## Verification

After deployment, verify SMS is working:

```bash
# SSH into production container/server
python manage.py shell

# Test Twilio configuration
from django.conf import settings
print(f"Account SID: {settings.TWILIO_ACCOUNT_SID[:10]}...")
print(f"Phone Number: {settings.TWILIO_PHONE_NUMBER}")

# Import Twilio
from twilio.rest import Client
print("✓ Twilio package available")
```

## Monitoring

### Twilio Console
- Monitor SMS delivery at: https://console.twilio.com
- Check **Messaging** > **Logs** for delivery status
- View usage and costs

### Django Logs
SMS send attempts are logged:
```
INFO: SMS sent successfully to +15551234567. SID: SMxxxxxxxxx
ERROR: Failed to send SMS to +15551234567: <error message>
```

## Cost Estimation

**Current Twilio SMS Pricing (US):**
- $0.0079 per SMS sent
- $1.15/month for phone number

**Monthly Cost Examples:**
- 100 SMS/day = ~$24/month
- 500 SMS/day = ~$120/month
- 1000 SMS/day = ~$240/month

## Security Notes

⚠️ **Important**: Keep your Auth Token secure
- Never commit to git
- Use environment variables only
- Rotate token if exposed
- Enable Twilio's Geo Permissions to restrict sending to specific countries

## Troubleshooting

### SMS Not Sending

1. **Check credentials are set**:
   ```python
   from django.conf import settings
   print(settings.TWILIO_ACCOUNT_SID)
   ```

2. **Check Django logs** for error messages

3. **Verify phone number format**: Must be E.164 format (+18005551234)

4. **Check Twilio console** for error codes

### Common Error Codes

- **21211**: Invalid 'To' phone number
- **21408**: Permission denied (geo restrictions)
- **21610**: Message blocked (spam filter)
- **30007**: Carrier violation (message content issue)

See full list: https://www.twilio.com/docs/api/errors

## Support

- **Twilio Support**: https://support.twilio.com
- **Twilio Docs**: https://www.twilio.com/docs/sms
- **Internal Docs**: See `TWILIO_SETUP.md` for development setup
