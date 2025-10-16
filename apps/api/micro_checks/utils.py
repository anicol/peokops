import hashlib
import secrets
import pytz
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings


def generate_magic_link_token():
    """Generate a cryptographically secure token for magic links"""
    return secrets.token_urlsafe(32)


def hash_token(token):
    """Hash token using SHA256 for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()


def verify_token(raw_token, token_hash):
    """Verify a raw token against its stored hash"""
    return hash_token(raw_token) == token_hash


def build_magic_link_url(token, base_url=None):
    """Build the full magic link URL for SMS/Email delivery"""
    if base_url is None:
        # Use marketing site or web app based on settings
        base_url = getattr(settings, 'MICRO_CHECK_BASE_URL', 'https://getpeakops.com')

    return f"{base_url}/check/{token}"


def get_store_local_date(store, dt=None):
    """
    Get the current date in the store's local timezone.

    Args:
        store: Store instance with timezone field
        dt: Optional datetime to convert (defaults to now)

    Returns:
        date object in store's local timezone
    """
    if dt is None:
        dt = timezone.now()

    store_tz = pytz.timezone(store.timezone)
    local_dt = dt.astimezone(store_tz)
    return local_dt.date()


def calculate_retention_expiry(retention_policy, from_date=None):
    """
    Calculate expiry date based on retention policy.

    Args:
        retention_policy: One of COACHING_7D, ENTERPRISE_90D, ENTERPRISE_365D
        from_date: Starting date (defaults to now)

    Returns:
        datetime for expiry
    """
    if from_date is None:
        from_date = timezone.now()

    retention_days = {
        'COACHING_7D': 7,
        'ENTERPRISE_90D': 90,
        'ENTERPRISE_365D': 365,
    }

    days = retention_days.get(retention_policy, 7)
    return from_date + timedelta(days=days)


def get_next_sequence_number(store, scheduled_date):
    """
    Get the next sequence number for a run on a given date.
    Allows multiple runs per day.

    Args:
        store: Store instance
        scheduled_date: Date for the run

    Returns:
        int: Next available sequence number
    """
    from .models import MicroCheckRun

    last_run = MicroCheckRun.objects.filter(
        store=store,
        scheduled_for=scheduled_date
    ).order_by('-sequence').first()

    return (last_run.sequence + 1) if last_run else 1


def should_require_photo(template, coverage):
    """
    Determine if photo should be required for this check.

    Logic:
    - FIRST_TIME: Require if this is the first time for this template
    - AFTER_FAIL: Require if last response was a failure
    - Default: Use template's default setting

    Args:
        template: MicroCheckTemplate instance
        coverage: CheckCoverage instance (or None if first time)

    Returns:
        tuple: (bool: require_photo, str: reason)
    """
    from .models import MicroCheckRunItem

    # Check template's default photo requirement
    if not template.default_photo_required:
        return False, ''

    # Check template's default photo requirement logic
    if coverage is None:
        # First time seeing this template
        return True, MicroCheckRunItem.PhotoRequiredReason.FIRST_CHECK_OF_WEEK

    if coverage.last_visual_status == 'FAIL':
        # Previous failure
        return True, MicroCheckRunItem.PhotoRequiredReason.PRIOR_FAIL

    # Random 10% chance
    import random
    if random.random() < 0.1:
        return True, MicroCheckRunItem.PhotoRequiredReason.RANDOM_AUDIT

    return False, ''


def select_templates_for_run(store, num_items=3):
    """
    Select templates for a micro-check run using smart rotation.

    Strategy:
    1. Prioritize templates not seen recently (by last_used_date)
    2. Balance across categories
    3. Weight by consecutive fails (more fails = higher priority)
    4. Ensure no duplicates within the same run

    Args:
        store: Store instance
        num_items: Number of templates to select (default 3)

    Returns:
        list: List of (template, coverage, photo_required, photo_reason) tuples
    """
    from .models import MicroCheckTemplate, CheckCoverage
    from django.db.models import Q
    import random

    # Get all active templates
    active_templates = MicroCheckTemplate.objects.filter(is_active=True)

    # Get coverage data for this store
    coverage_map = {
        c.template_id: c
        for c in CheckCoverage.objects.filter(store=store)
    }

    # Build selection pool with weights
    selection_pool = []
    for template in active_templates:
        coverage = coverage_map.get(template.id)

        # Calculate priority score
        priority = 100  # Base priority

        if coverage:
            # Reduce priority based on recent usage
            days_since_use = (timezone.now() - coverage.last_visual_verified_at).days
            priority += days_since_use * 2

            # Increase priority if last check failed
            if coverage.last_visual_status == 'FAIL':
                priority += 30
        else:
            # Never seen before - high priority
            priority += 200

        # Increase priority for high severity items
        if template.severity == 'CRITICAL':
            priority += 50
        elif template.severity == 'HIGH':
            priority += 25

        selection_pool.append((template, coverage, max(1, priority)))

    # Weighted random selection
    selected = []
    for _ in range(min(num_items, len(selection_pool))):
        if not selection_pool:
            break

        # Weight-based selection
        weights = [item[2] for item in selection_pool]
        template, coverage, _ = random.choices(selection_pool, weights=weights, k=1)[0]

        # Determine photo requirement
        photo_required, photo_reason = should_require_photo(template, coverage)

        selected.append((template, coverage, photo_required, photo_reason))

        # Remove selected template from pool to avoid duplicates
        selection_pool = [item for item in selection_pool if item[0].id != template.id]

    return selected


def update_streak(store, manager, completed_date, passed):
    """
    Update streak information after a run is completed.

    Args:
        store: Store instance
        manager: User instance (manager who completed the check)
        completed_date: Date of completion (in store's local timezone)
        passed: Boolean indicating if all checks passed
    """
    from .models import MicroCheckStreak
    from datetime import timedelta

    streak, created = MicroCheckStreak.objects.get_or_create(
        store=store,
        user=manager,  # Model uses 'user' field, not 'manager'
        defaults={
            'current_streak': 0,
            'longest_streak': 0,
            'total_completions': 0,
        }
    )

    # Update totals
    streak.total_completions += 1

    # Update streak logic
    if streak.last_completion_date:
        days_since_last = (completed_date - streak.last_completion_date).days

        if days_since_last == 1:
            # Consecutive day - increment streak
            streak.current_streak += 1
        elif days_since_last == 0:
            # Same day - don't change streak
            pass
        else:
            # Streak broken
            streak.current_streak = 1
    else:
        # First completion
        streak.current_streak = 1

    # Update longest streak
    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    streak.last_completion_date = completed_date
    streak.save()

    return streak


def update_store_streak(store, completed_date):
    """
    Update store-level streak information after a run is completed.

    Args:
        store: Store instance
        completed_date: Date of completion (in store's local timezone)
    """
    from .models import StoreStreak

    streak, created = StoreStreak.objects.get_or_create(
        store=store,
        defaults={
            'current_streak': 0,
            'longest_streak': 0,
            'total_completions': 0,
        }
    )

    # Update total completions
    streak.total_completions += 1

    # Update streak logic
    if streak.last_completion_date:
        days_since_last = (completed_date - streak.last_completion_date).days

        if days_since_last == 1:
            # Consecutive day - increment streak
            streak.current_streak += 1
        elif days_since_last == 0:
            # Same day - don't change streak
            pass
        else:
            # Streak broken
            streak.current_streak = 1
    else:
        # First completion
        streak.current_streak = 1

    # Update longest streak
    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    streak.last_completion_date = completed_date
    streak.save()

    return streak


def create_corrective_action_for_failure(response, assigned_to=None):
    """
    Auto-create a corrective action when a check fails.

    Args:
        response: MicroCheckResponse instance (with status=FAIL)
        assigned_to: Optional User to assign to (defaults to store's GM)

    Returns:
        CorrectiveAction instance (existing or newly created)
    """
    from .models import CorrectiveAction
    from datetime import timedelta

    if response.status != 'FAIL':
        return None

    # Check if corrective action already exists (OneToOneField)
    try:
        return response.corrective_action
    except CorrectiveAction.DoesNotExist:
        pass

    # Default to store's primary contact if not specified
    if assigned_to is None and hasattr(response.store, 'primary_contact'):
        assigned_to = response.store.primary_contact

    # Calculate due date based on severity
    severity_due_days = {
        'CRITICAL': 1,
        'HIGH': 3,
        'MEDIUM': 7,
        'LOW': 14,
    }
    due_days = severity_due_days.get(response.severity_snapshot, 7)
    due_at = timezone.now() + timedelta(days=due_days)

    # Get before media from response (media is a ForeignKey, not ManyToMany)
    before_media = response.media

    # Create corrective action
    action = CorrectiveAction.objects.create(
        response=response,
        store=response.store,
        category=response.category,
        due_at=due_at,
        assigned_to=assigned_to,
        created_by=response.completed_by,
        before_media=before_media,
        created_from='MICRO_CHECK'
    )

    return action


def seed_default_templates(brand, created_by=None):
    """
    Seed default coaching templates for a new brand.

    This function automatically creates 15 industry-standard micro-check
    templates when a brand is created, providing an immediate "batteries included"
    experience where managers can start running Quick Checks on day 1.

    Args:
        brand: Brand instance to associate templates with
        created_by: Optional User instance who created the brand

    Returns:
        list: List of created MicroCheckTemplate instances
    """
    from .models import MicroCheckTemplate
    from .default_templates import get_default_templates

    templates_created = []
    default_templates = get_default_templates()

    for template_data in default_templates:
        template = MicroCheckTemplate.objects.create(
            brand=brand,
            is_local=False,
            include_in_rotation=True,
            is_active=True,
            created_by=created_by,
            **template_data
        )
        templates_created.append(template)

    return templates_created


def send_magic_link_sms(phone, token, store_name="Your Store"):
    """
    Send magic link SMS using Twilio.

    Args:
        phone: Phone number in E.164 format (e.g., +15551234567)
        token: Magic link token
        store_name: Name of the store for personalization

    Returns:
        bool: True if SMS sent successfully, False otherwise
    """
    from django.conf import settings
    import logging

    logger = logging.getLogger(__name__)

    # Check if Twilio is configured
    twilio_account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
    twilio_auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
    twilio_phone_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)

    if not all([twilio_account_sid, twilio_auth_token, twilio_phone_number]):
        logger.warning("Twilio credentials not configured. Skipping SMS send.")
        return False

    try:
        from twilio.rest import Client

        # Initialize Twilio client
        client = Client(twilio_account_sid, twilio_auth_token)

        # Build magic link URL
        magic_link = build_magic_link_url(token)

        # Craft message
        message_body = (
            f"✨ Your first {store_name} checks are ready!\n\n"
            f"Complete 3 quick checks (under 2 min):\n"
            f"{magic_link}\n\n"
            f"No login required - just tap the link!"
        )

        # Send SMS
        message = client.messages.create(
            body=message_body,
            from_=twilio_phone_number,
            to=phone
        )

        logger.info(f"SMS sent successfully to {phone}. SID: {message.sid}")
        return True

    except Exception as e:
        logger.error(f"Failed to send SMS to {phone}: {str(e)}")
        return False


def send_magic_link_email(email, token, store_name="Your Store", recipient_name=None):
    """
    Send magic link email as fallback when SMS fails.

    Args:
        email: Email address
        token: Magic link token
        store_name: Name of the store for personalization
        recipient_name: Optional recipient name for personalization

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    from django.core.mail import EmailMultiAlternatives
    from django.conf import settings
    import logging

    logger = logging.getLogger(__name__)

    try:
        # Build magic link URL
        magic_link = build_magic_link_url(token)

        # Personalize greeting
        greeting = f"Hi {recipient_name}," if recipient_name else "Hi there,"

        # Craft email subject
        subject = f"Your {store_name} Quick Checks Are Ready! 🎯"

        # Plain text version (no markdown)
        text_content = f"""{greeting}

Welcome to PeakOps! Your first 3 quick checks are ready to complete.

GET STARTED IN 2 MINUTES

Complete your checks by clicking this link:
{magic_link}

WHAT TO EXPECT:
- 3 simple checks for {store_name}
- Takes under 2 minutes
- No login required - just click the link
- Works on your phone or computer

QUESTIONS?
Just reply to this email - we're here to help!

Thanks,
The PeakOps Team

---
This link is valid for 30 days, but we recommend completing your checks today to build the habit!
"""

        # HTML version (properly formatted)
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <p style="font-size: 16px; margin-bottom: 20px;">{greeting}</p>

    <p style="font-size: 16px; margin-bottom: 20px;">Welcome to <strong>PeakOps</strong>! Your first 3 quick checks are ready to complete.</p>

    <div style="background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <h2 style="color: white; margin: 0 0 16px 0; font-size: 20px;">✨ Get Started in 2 Minutes</h2>
        <a href="{magic_link}" style="display: inline-block; background: white; color: #0d9488; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Start Your Checks</a>
    </div>

    <div style="background: #f9fafb; border-left: 4px solid #0d9488; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #111;">What to Expect:</h3>
        <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">3 simple checks for {store_name}</li>
            <li style="margin-bottom: 8px;">Takes under 2 minutes</li>
            <li style="margin-bottom: 8px;">No login required - just click the link</li>
            <li style="margin-bottom: 8px;">Works on your phone or computer</li>
        </ul>
    </div>

    <p style="font-size: 16px; margin-bottom: 8px;"><strong>Questions?</strong></p>
    <p style="font-size: 16px; margin-bottom: 24px;">Just reply to this email - we're here to help!</p>

    <p style="font-size: 16px; margin-bottom: 8px;">Thanks,<br>The PeakOps Team</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="font-size: 12px; color: #6b7280; margin: 0;">This link is valid for 30 days, but we recommend completing your checks today to build the habit!</p>
</body>
</html>
"""

        # Create email with both plain text and HTML
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

        logger.info(f"Magic link email sent successfully to {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {email}: {str(e)}")
        return False
