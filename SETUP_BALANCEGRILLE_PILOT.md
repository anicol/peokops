# BalanceGrille Pilot Account Setup - Technical Guide

**Date**: November 11, 2025
**Account**: BalanceGrille (4 stores)
**Features**: 7shifts Integration, Micro-Checks, Employee Pulse Surveys

---

## Prerequisites

- Django shell access to production/staging environment
- Superadmin credentials
- Twilio account configured (SMS delivery)
- 7shifts OAuth credentials from BalanceGrille
- Store information collected (see BALANCEGRILLE_DATA_COLLECTION.md)

---

## Step 1: Create Brand

```python
# Access Django shell
docker-compose exec api python manage.py shell

from brands.models import Brand

brand = Brand.objects.create(
    name="BalanceGrille",
    industry="RESTAURANT",
    subtype="CASUAL_DINING",
    retention_days_inspection=365,
    retention_days_coaching=7,
    is_active=True
)

print(f"✓ Brand created: {brand.name} (ID: {brand.id})")
```

---

## Step 2: Create Account and Owner User

```python
from accounts.models import Account, User

# Create owner user
owner = User.objects.create_user(
    username="balancegrille_owner",
    email="shannon@balancegrille.com",  # Replace with actual email
    password="",  # They'll reset on first login
    first_name="Shannon",  # Replace with actual name
    last_name="Owner",
    role=User.Role.OWNER,
    phone="+15551234567",  # Replace with actual phone
    is_active=True
)

# Create account
account = Account.objects.create(
    name="BalanceGrille",
    brand=brand,
    owner=owner,
    company_name="BalanceGrille LLC",
    billing_email="billing@balancegrille.com",  # Replace with actual
    phone="+15551234567",  # Replace with actual
    is_active=True
)

# Link owner to account
owner.account = account
owner.save()

print(f"✓ Account created: {account.name} (ID: {account.id})")
print(f"✓ Owner created: {owner.email}")
```

---

## Step 3: Create 4 Stores

```python
from brands.models import Store
from datetime import time

# Store data - REPLACE WITH ACTUAL DATA FROM SHANNON
stores_data = [
    {
        "name": "BalanceGrille Downtown",
        "code": "BG-DT",
        "address": "123 Main Street",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02101",
        "phone": "+16175551001",
        "manager_email": "manager.downtown@balancegrille.com",
        "timezone": "America/New_York",
        "segment": "high_vol",
        "micro_check_send_time": time(8, 0, 0)  # 8 AM
    },
    {
        "name": "BalanceGrille Back Bay",
        "code": "BG-BB",
        "address": "456 Newbury Street",
        "city": "Boston",
        "state": "MA",
        "zip_code": "02116",
        "phone": "+16175551002",
        "manager_email": "manager.backbay@balancegrille.com",
        "timezone": "America/New_York",
        "segment": "high_vol",
        "micro_check_send_time": time(8, 0, 0)
    },
    {
        "name": "BalanceGrille Cambridge",
        "code": "BG-CB",
        "address": "789 Mass Ave",
        "city": "Cambridge",
        "state": "MA",
        "zip_code": "02139",
        "phone": "+16175551003",
        "manager_email": "manager.cambridge@balancegrille.com",
        "timezone": "America/New_York",
        "segment": "med_vol",
        "micro_check_send_time": time(8, 0, 0)
    },
    {
        "name": "BalanceGrille Brookline",
        "code": "BG-BK",
        "address": "321 Harvard Street",
        "city": "Brookline",
        "state": "MA",
        "zip_code": "02446",
        "phone": "+16175551004",
        "manager_email": "manager.brookline@balancegrille.com",
        "timezone": "America/New_York",
        "segment": "med_vol",
        "micro_check_send_time": time(8, 0, 0)
    }
]

stores = []
for store_data in stores_data:
    store = Store.objects.create(
        account=account,
        brand=brand,
        **store_data
    )
    stores.append(store)
    print(f"✓ Store created: {store.name} (ID: {store.id})")

# Verify
print(f"\n✓ Total stores created: {Store.objects.filter(account=account).count()}")
```

---

## Step 4: Seed Micro-Check Templates

```bash
# Exit Django shell (Ctrl+D) and run management command
docker-compose exec api python manage.py seed_micro_check_templates

# This creates 30+ default templates covering:
# - PPE (hair restraints, gloves, uniforms)
# - Safety (wet floors, fire extinguishers, electrical)
# - Cleanliness (surfaces, handwashing, drains)
# - Food handling (temps, separation, date marking)
# - Equipment (refrigeration, cleaning, dish machines)
# - Waste management
# - Pest control
# - Storage (chemical, dry goods)
# - Documentation (logs, schedules)
# - Facility (lighting, walls/ceiling)
```

**Verify templates:**
```python
# Back in Django shell
from micro_checks.models import MicroCheckTemplate

template_count = MicroCheckTemplate.objects.filter(
    brand=brand,
    level='BRAND'
).count()

print(f"✓ {template_count} brand-level templates created")

# Show sample templates
for template in MicroCheckTemplate.objects.filter(brand=brand)[:5]:
    print(f"  - {template.category}: {template.title}")
```

---

## Step 5: Configure Micro-Check Delivery

```python
from accounts.models import MicroCheckDeliveryConfig

delivery_config = MicroCheckDeliveryConfig.objects.create(
    account=account,
    send_to_recipients="MANAGERS_ONLY",  # Options: MANAGERS_ONLY, ALL_EMPLOYEES
    cadence_mode="DAILY",  # Options: DAILY, RANDOMIZED
    min_day_gap=1,
    max_day_gap=3,
    randomize_recipients=False,
    recipient_percentage=100,
    created_by=owner
)

print(f"✓ Delivery config created (ID: {delivery_config.id})")
print(f"  - Mode: {delivery_config.cadence_mode}")
print(f"  - Recipients: {delivery_config.send_to_recipients}")
```

---

## Step 6: Configure 7shifts Integration

**IMPORTANT**: You'll need Shannon's 7shifts OAuth credentials first.

```python
from integrations.models import SevenShiftsConfig
from cryptography.fernet import Fernet
from django.conf import settings

# Get encryption key from settings
cipher = Fernet(settings.ENCRYPTION_KEY.encode())

# REPLACE WITH ACTUAL 7SHIFTS CREDENTIALS FROM SHANNON
access_token = "7shifts_access_token_here"
company_id = "7shifts_company_id_here"

# Encrypt the access token
access_token_encrypted = cipher.encrypt(access_token.encode())

seven_shifts_config = SevenShiftsConfig.objects.create(
    account=account,
    access_token_encrypted=access_token_encrypted,
    company_id=company_id,
    is_active=True,
    sync_employees_enabled=True,
    sync_shifts_enabled=True,
    enforce_shift_schedule=True,  # Only send checks when on shift
    sync_frequency="daily",
    sync_role_names=["Manager", "Shift Lead", "Assistant Manager"],  # Adjust as needed
    created_by=owner
)

print(f"✓ 7shifts integration configured (ID: {seven_shifts_config.id})")
```

**Map 7shifts locations to stores:**
```python
from integrations.models import SevenShiftsLocation

# REPLACE WITH ACTUAL 7SHIFTS LOCATION IDs FROM SHANNON
location_mappings = [
    {"seven_shifts_id": "7shifts_location_1", "store": stores[0]},  # Downtown
    {"seven_shifts_id": "7shifts_location_2", "store": stores[1]},  # Back Bay
    {"seven_shifts_id": "7shifts_location_3", "store": stores[2]},  # Cambridge
    {"seven_shifts_id": "7shifts_location_4", "store": stores[3]},  # Brookline
]

for mapping in location_mappings:
    location = SevenShiftsLocation.objects.create(
        account=account,
        store=mapping["store"],
        seven_shifts_location_id=mapping["seven_shifts_id"],
        is_active=True
    )
    print(f"✓ Mapped 7shifts location {mapping['seven_shifts_id']} to {mapping['store'].name}")
```

**Initial employee sync:**
```bash
# Trigger first sync to import employees from 7shifts
docker-compose exec api python manage.py sync_7shifts_employees --account-id=<account_id>

# This will:
# - Import all employees from 7shifts
# - Create User records with appropriate roles
# - Link employees to their assigned stores
```

---

## Step 7: Configure Employee Pulse Surveys

```python
from pulse_surveys.models import PulseSurveyConfig, PulseSurveyQuestion

# Create pulse survey configuration
pulse_config = PulseSurveyConfig.objects.create(
    account=account,
    is_active=True,
    frequency="DAILY",  # Options: DAILY, WEEKLY, BIWEEKLY
    send_time=time(18, 0, 0),  # 6 PM - after shift
    response_anonymity="ANONYMOUS",  # Options: ANONYMOUS, IDENTIFIED
    min_response_rate=70,
    auto_escalate_negative=True,
    created_by=owner
)

print(f"✓ Pulse survey config created (ID: {pulse_config.id})")

# Create default pulse survey questions
default_questions = [
    {
        "question_text": "How supported did you feel by your manager today?",
        "question_type": "RATING_5",
        "category": "MANAGEMENT",
        "is_active": True,
        "order": 1
    },
    {
        "question_text": "Did you have everything you needed to do your job well today?",
        "question_type": "YES_NO",
        "category": "RESOURCES",
        "is_active": True,
        "order": 2
    },
    {
        "question_text": "How would you rate today's shift overall?",
        "question_type": "RATING_5",
        "category": "OVERALL",
        "is_active": True,
        "order": 3
    },
    {
        "question_text": "Any concerns or suggestions? (Optional)",
        "question_type": "FREE_TEXT",
        "category": "FEEDBACK",
        "is_active": True,
        "order": 4,
        "is_optional": True
    }
]

for q_data in default_questions:
    question = PulseSurveyQuestion.objects.create(
        account=account,
        created_by=owner,
        **q_data
    )
    print(f"✓ Question created: {question.question_text[:50]}...")

print(f"✓ {len(default_questions)} pulse survey questions created")
```

---

## Step 8: Create Store Managers (If Not Using 7shifts Sync)

**Skip this if using 7shifts employee sync** - employees will be auto-created.

If creating managers manually:
```python
# Create a general manager for each store
managers_data = [
    {"store": stores[0], "name": "Manager One", "email": "manager1@balancegrille.com", "phone": "+16175551101"},
    {"store": stores[1], "name": "Manager Two", "email": "manager2@balancegrille.com", "phone": "+16175551102"},
    {"store": stores[2], "name": "Manager Three", "email": "manager3@balancegrille.com", "phone": "+16175551103"},
    {"store": stores[3], "name": "Manager Four", "email": "manager4@balancegrille.com", "phone": "+16175551104"},
]

for manager_data in managers_data:
    manager = User.objects.create_user(
        username=f"gm_{manager_data['store'].code.lower()}",
        email=manager_data["email"],
        password="",  # Will be set via password reset link
        first_name=manager_data["name"].split()[0],
        last_name=manager_data["name"].split()[1] if len(manager_data["name"].split()) > 1 else "",
        role=User.Role.GM,
        account=account,
        store=manager_data["store"],
        phone=manager_data["phone"],
        is_active=True
    )
    print(f"✓ Manager created: {manager.email} for {manager_data['store'].name}")
```

---

## Step 9: Verify Environment Variables

Ensure these are set in `.env`:

```bash
# Twilio (SMS delivery)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+18663788796

# Micro-check delivery
MICRO_CHECK_BASE_URL=https://app.peakops.com

# 7shifts
SEVEN_SHIFTS_API_BASE_URL=https://api.7shifts.com/v2
SEVEN_SHIFTS_CLIENT_ID=your-client-id
SEVEN_SHIFTS_CLIENT_SECRET=your-client-secret

# Encryption
ENCRYPTION_KEY=your-fernet-encryption-key
```

---

## Step 10: Testing & Verification

### A. Test Micro-Check Creation
```python
# Manually create a test run
from micro_checks.models import MicroCheckRun
from django.utils import timezone

test_run = MicroCheckRun.objects.create(
    account=account,
    store=stores[0],  # Test with first store
    scheduled_for=timezone.now(),
    status='PENDING',
    created_by=owner
)

print(f"✓ Test run created (ID: {test_run.id})")

# Trigger selection of items for this run
from micro_checks.tasks import populate_micro_check_run
populate_micro_check_run(test_run.id)

# Verify items were created
print(f"✓ Items created: {test_run.items.count()}")
for item in test_run.items.all():
    print(f"  - {item.template.category}: {item.template.title}")
```

### B. Test SMS Delivery
```python
# Send test SMS with magic link
from micro_checks.utils import send_micro_check_sms

manager = User.objects.filter(
    account=account,
    role=User.Role.GM,
    store=stores[0]
).first()

if manager and manager.phone:
    send_micro_check_sms(test_run, manager)
    print(f"✓ Test SMS sent to {manager.phone}")
else:
    print("⚠ No manager with phone number found")
```

### C. Verify 7shifts Sync
```bash
# Check that employees were synced
docker-compose exec api python manage.py shell
```

```python
from integrations.models import SevenShiftsEmployee

synced_employees = SevenShiftsEmployee.objects.filter(account=account)
print(f"✓ {synced_employees.count()} employees synced from 7shifts")

for emp in synced_employees[:5]:
    print(f"  - {emp.first_name} {emp.last_name} ({emp.role})")
```

### D. Test Pulse Survey
```python
from pulse_surveys.models import PulseSurveyResponse

# Verify questions are active
active_questions = PulseSurveyQuestion.objects.filter(
    account=account,
    is_active=True
).order_by('order')

print(f"✓ {active_questions.count()} active pulse survey questions")
for q in active_questions:
    print(f"  - {q.question_text}")
```

---

## Step 11: Share Credentials with Shannon

**Email to Shannon:**
```
Subject: BalanceGrille PeakOps Account Setup Complete

Hi Shannon,

Your BalanceGrille pilot account is now set up and ready to go!

LOGIN CREDENTIALS:
- URL: https://app.peakops.com
- Email: shannon@balancegrille.com (replace with actual)
- Password will be sent via password reset link

WHAT'S CONFIGURED:
✓ 4 stores added (Downtown, Back Bay, Cambridge, Brookline)
✓ Micro-check templates seeded (30+ food safety & operations checks)
✓ Daily micro-check delivery enabled (8 AM each day)
✓ 7shifts integration configured
✓ Employee pulse surveys enabled (daily at 6 PM)
✓ SMS delivery for passwordless access

NEXT STEPS:
1. Log in and reset your password
2. Review the attached "BALANCEGRILLE_SHANNON_INSTRUCTIONS.md" guide
3. Verify store information and update as needed
4. Complete 7shifts OAuth connection (see instructions)
5. Invite your store managers
6. Customize micro-check templates if desired
7. Test completing a micro-check via SMS

SUPPORT:
- Documentation: [link to shannon instructions]
- Support email: support@peakops.com
- My direct contact: [your email/phone]

Looking forward to seeing how the pilot goes!

Best,
[Your name]
```

---

## Troubleshooting

### Issue: Templates not appearing in rotation
**Solution:**
```python
# Verify templates are active and included in rotation
from micro_checks.models import MicroCheckTemplate

templates = MicroCheckTemplate.objects.filter(
    brand=brand,
    include_in_rotation=True,
    is_active=True
)
print(f"Active templates: {templates.count()}")
```

### Issue: SMS not delivering
**Solution:**
- Verify Twilio credentials in `.env`
- Check user has valid phone number with country code
- Check Twilio console for delivery errors
- Verify `MICRO_CHECK_BASE_URL` is correct

### Issue: 7shifts sync not working
**Solution:**
```bash
# Check sync logs
docker-compose logs api | grep "7shifts"

# Manually trigger sync
docker-compose exec api python manage.py sync_7shifts_employees --account-id=<account_id> --verbose
```

### Issue: Pulse surveys not sending
**Solution:**
```python
# Verify pulse config is active
from pulse_surveys.models import PulseSurveyConfig

config = PulseSurveyConfig.objects.get(account=account)
print(f"Active: {config.is_active}")
print(f"Frequency: {config.frequency}")
print(f"Send time: {config.send_time}")
```

---

## Celery Tasks to Monitor

These background tasks handle automation:
- `micro_checks.tasks.create_daily_micro_check_runs` - Creates daily runs at scheduled time
- `micro_checks.tasks.send_micro_check_notifications` - Sends SMS/email with magic links
- `integrations.tasks.sync_7shifts_employees` - Syncs employees from 7shifts
- `integrations.tasks.sync_7shifts_shifts` - Syncs shift schedules
- `pulse_surveys.tasks.send_pulse_surveys` - Sends daily pulse surveys
- `pulse_surveys.tasks.analyze_pulse_sentiment` - AI sentiment analysis on responses

**Monitor task queue:**
```bash
docker-compose logs celery-beat
docker-compose logs celery-worker
```

---

## Summary

**Account Setup Complete:**
- ✅ Brand: BalanceGrille (Casual Dining)
- ✅ Account: BalanceGrille (Owner: Shannon)
- ✅ Stores: 4 locations configured
- ✅ Micro-checks: 30+ templates, daily delivery at 8 AM
- ✅ 7shifts: Integration configured, employee sync enabled
- ✅ Pulse surveys: 4 questions, daily at 6 PM, anonymous
- ✅ SMS delivery: Enabled via Twilio

**Next Steps:**
1. Share credentials with Shannon
2. Provide Shannon with BALANCEGRILLE_SHANNON_INSTRUCTIONS.md
3. Schedule onboarding call to walk through dashboard
4. Monitor first week of micro-check delivery
5. Review pulse survey results after 1 week
6. Collect feedback and iterate

---

**Setup completed by**: [Your name]
**Date**: November 11, 2025
**Account ID**: [record account.id here]
**Brand ID**: [record brand.id here]
