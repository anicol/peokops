from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
import logging

from .models import (
    MicroCheckRun,
    MicroCheckRunItem,
    MicroCheckAssignment,
    MicroCheckResponse,
    CheckCoverage,
    CorrectiveAction
)
from .utils import (
    generate_magic_link_token,
    hash_token,
    build_magic_link_url,
    get_store_local_date,
    calculate_retention_expiry,
    get_next_sequence_number,
    select_templates_for_run,
    update_streak,
    create_corrective_action_for_failure
)

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(queue='default')
def create_daily_micro_check_runs():
    """
    Scheduled task to create daily micro-check runs for all active stores.

    This should run once per day (e.g., at 2 AM UTC) and create runs
    for stores based on their local timezone and cadence settings.
    """
    from brands.models import Store

    today_utc = timezone.now().date()
    stores = Store.objects.filter(is_active=True)

    created_count = 0
    skipped_count = 0

    for store in stores:
        try:
            # Get store's local date
            local_date = get_store_local_date(store)

            # Check if this store should get a run today
            # This depends on your cadence logic (daily, every 2 days, etc.)
            # For now, we'll create daily runs for all stores
            should_create = _should_create_run_for_store(store, local_date)

            if should_create:
                run = _create_run_for_store(store, local_date)
                if run:
                    created_count += 1
                    logger.info(f"Created run {run.id} for store {store.id}")
            else:
                skipped_count += 1

        except Exception as e:
            logger.error(f"Error creating run for store {store.id}: {str(e)}")
            continue

    logger.info(f"Daily run creation: {created_count} created, {skipped_count} skipped")
    return {'created': created_count, 'skipped': skipped_count}


def _should_create_run_for_store(store, local_date):
    """
    Determine if a run should be created for this store on this date.

    This is where you'd implement cadence logic:
    - Daily (always True)
    - Every 2 days (check last run date)
    - Weekdays only (check day of week)
    - Custom schedule (check store settings)
    """
    # For now, create daily runs for all stores
    # You can extend this to check store.micro_check_cadence field

    # Check if run already exists for today
    existing = MicroCheckRun.objects.filter(
        store=store,
        scheduled_for=local_date
    ).exists()

    return not existing


@transaction.atomic
def _create_run_for_store(store, scheduled_date):
    """
    Create a complete run with 3 selected templates.

    Returns:
        MicroCheckRun instance or None if creation failed
    """
    # Determine retention policy based on store's mode
    retention_policy = 'COACHING'  # Default to coaching mode
    if hasattr(store, 'inspection_mode') and store.inspection_mode == 'ENTERPRISE':
        retention_policy = 'ENTERPRISE'

    # Calculate retention date
    if retention_policy == 'ENTERPRISE':
        retain_until = timezone.now() + timezone.timedelta(days=365)
    else:
        retain_until = timezone.now() + timezone.timedelta(days=7)

    # Get next sequence number (allows multiple runs per day)
    sequence = get_next_sequence_number(store, scheduled_date)

    # Create the run
    run = MicroCheckRun.objects.create(
        store=store,
        scheduled_for=scheduled_date,
        sequence=sequence,
        store_timezone=store.timezone,
        retention_policy=retention_policy,
        retain_until=retain_until,
        created_via='MANUAL',
        status='PENDING'
    )

    # Select 3 templates using smart rotation
    selected = select_templates_for_run(store, num_items=3)

    # Create run items
    for order, (template, coverage, photo_required, photo_reason) in enumerate(selected, start=1):
        MicroCheckRunItem.objects.create(
            run=run,
            template=template,
            order=order,
            photo_required=photo_required,
            photo_required_reason=photo_reason if photo_reason else '',
            # Snapshot immutable template data
            template_version=template.version,
            title_snapshot=template.title,
            category_snapshot=template.category,
            severity_snapshot=template.severity,
            success_criteria_snapshot=template.success_criteria
        )

        # Coverage tracking is updated when responses are submitted
        # For now, we just create the run items

    logger.info(f"Created run {run.id} with {len(selected)} items for store {store.id}")
    return run


@shared_task(queue='default')
def send_micro_check_assignment(run_id, manager_id, delivery_method='SMS'):
    """
    Create and send a magic link assignment to a manager.

    Args:
        run_id: UUID of MicroCheckRun
        manager_id: ID of User (manager)
        delivery_method: 'SMS', 'EMAIL', or 'WHATSAPP'
    """
    try:
        run = MicroCheckRun.objects.get(id=run_id)
        manager = User.objects.get(id=manager_id)
    except (MicroCheckRun.DoesNotExist, User.DoesNotExist) as e:
        logger.error(f"Assignment creation failed: {str(e)}")
        return {'success': False, 'error': str(e)}

    # Generate magic link token
    raw_token = generate_magic_link_token()
    token_hash = hash_token(raw_token)

    # Calculate expiry (24 hours from now)
    expires_at = timezone.now() + timezone.timedelta(hours=24)

    # Create assignment
    assignment = MicroCheckAssignment.objects.create(
        run=run,
        manager=manager,
        token_hash=token_hash,
        delivery_method=delivery_method,
        expires_at=expires_at,
        status='SENT'
    )

    # Build magic link URL
    magic_link = build_magic_link_url(raw_token)

    # Send via appropriate channel
    if delivery_method == 'SMS':
        success = _send_sms(manager.phone_number, magic_link, run)
    elif delivery_method == 'EMAIL':
        success = _send_email(manager.email, magic_link, run)
    elif delivery_method == 'WHATSAPP':
        success = _send_whatsapp(manager.phone_number, magic_link, run)
    else:
        logger.error(f"Unknown delivery method: {delivery_method}")
        return {'success': False, 'error': 'Unknown delivery method'}

    if success:
        assignment.sent_at = timezone.now()
        assignment.save()
        logger.info(f"Sent assignment {assignment.id} to {manager.email} via {delivery_method}")
        return {'success': True, 'assignment_id': str(assignment.id)}
    else:
        assignment.status = 'FAILED'
        assignment.save()
        return {'success': False, 'error': 'Delivery failed'}


def _send_sms(phone_number, magic_link, run):
    """Send SMS with magic link using AWS SNS or Twilio"""
    # Placeholder - implement with your SMS provider
    # Example with AWS SNS:
    # import boto3
    # sns = boto3.client('sns')
    # message = f"Your daily PeakOps check is ready! Complete in 2 minutes: {magic_link}"
    # sns.publish(PhoneNumber=phone_number, Message=message)

    logger.info(f"SMS would be sent to {phone_number}: {magic_link}")
    return True


def _send_email(email, magic_link, run):
    """Send email with magic link"""
    from django.core.mail import send_mail
    from django.conf import settings

    subject = "Your Daily PeakOps Check is Ready"
    message = f"""
    Hi there,

    Your daily check is ready! Complete these 3 quick items in just 2 minutes:

    {magic_link}

    This link will expire in 24 hours.

    Thanks,
    PeakOps Team
    """

    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.error(f"Email send failed: {str(e)}")
        return False


def _send_whatsapp(phone_number, magic_link, run):
    """Send WhatsApp message with magic link using Twilio"""
    # Placeholder - implement with Twilio WhatsApp API
    logger.info(f"WhatsApp would be sent to {phone_number}: {magic_link}")
    return True


@shared_task(queue='default')
def process_micro_check_response(response_id):
    """
    Process a micro-check response after submission.

    This handles:
    - Updating coverage statistics
    - Creating corrective actions for failures
    - Updating streaks
    - Checking if entire run is complete

    Args:
        response_id: UUID of MicroCheckResponse
    """
    try:
        response = MicroCheckResponse.objects.select_related(
            'run_item__run',
            'store',
            'responder'
        ).get(id=response_id)
    except MicroCheckResponse.DoesNotExist:
        logger.error(f"Response {response_id} not found")
        return {'success': False, 'error': 'Response not found'}

    run = response.run_item.run
    store = response.store

    # Update coverage statistics
    _update_coverage_stats(response)

    # Create corrective action if failed
    if response.status == 'FAIL':
        create_corrective_action_for_failure(response)

    # Check if all items in run are complete
    all_items_complete = _check_run_completion(run)

    if all_items_complete:
        run.status = 'COMPLETED'
        run.completed_at = timezone.now()
        run.save()

        # Update streak for the responder
        all_passed = _all_run_items_passed(run)
        update_streak(
            store=store,
            manager=response.responder,
            completed_date=response.local_completed_date,
            passed=all_passed
        )

        logger.info(f"Run {run.id} completed")

    return {'success': True, 'run_complete': all_items_complete}


def _update_coverage_stats(response):
    """Update CheckCoverage statistics based on response"""
    try:
        coverage = CheckCoverage.objects.get(
            store=response.store,
            template=response.run_item.template
        )

        coverage.last_response_status = response.status

        if response.status == 'PASS':
            coverage.consecutive_passes += 1
            coverage.consecutive_fails = 0
        elif response.status == 'FAIL':
            coverage.consecutive_fails += 1
            coverage.consecutive_passes = 0
        else:
            # SKIPPED - reset both
            coverage.consecutive_passes = 0
            coverage.consecutive_fails = 0

        coverage.save()
    except CheckCoverage.DoesNotExist:
        logger.warning(f"Coverage not found for response {response.id}")


def _check_run_completion(run):
    """Check if all items in a run have responses"""
    total_items = run.items.count()
    completed_items = MicroCheckResponse.objects.filter(
        run_item__run=run
    ).count()

    return total_items == completed_items


def _all_run_items_passed(run):
    """Check if all items in a run passed (no failures)"""
    has_failures = MicroCheckResponse.objects.filter(
        run_item__run=run,
        status='FAIL'
    ).exists()

    return not has_failures


@shared_task(queue='maintenance')
def cleanup_expired_runs():
    """
    Cleanup expired runs based on retention policies.

    This should run daily as part of maintenance.
    """
    from django.db.models import Q

    now = timezone.now()

    # Find expired runs
    expired_runs = MicroCheckRun.objects.filter(
        expires_at__lt=now
    )

    count = expired_runs.count()

    if count > 0:
        # Delete cascades to RunItems, Responses, etc.
        expired_runs.delete()
        logger.info(f"Cleaned up {count} expired runs")

    return {'deleted': count}


@shared_task(queue='maintenance')
def cleanup_expired_media():
    """
    Cleanup expired media assets based on retention policies.

    This should run daily as part of maintenance.
    """
    from .models import MediaAsset

    now = timezone.now()

    # Find expired media
    expired_media = MediaAsset.objects.filter(
        expires_at__lt=now
    )

    count = 0
    for media in expired_media:
        try:
            # Delete from S3
            # import boto3
            # s3 = boto3.client('s3')
            # s3.delete_object(Bucket=media.s3_bucket, Key=media.s3_key)

            # Delete from database
            media.delete()
            count += 1
        except Exception as e:
            logger.error(f"Failed to delete media {media.id}: {str(e)}")
            continue

    logger.info(f"Cleaned up {count} expired media assets")
    return {'deleted': count}


@shared_task(queue='default')
def rotate_expired_magic_links():
    """
    Find and rotate expired or heavily-used magic links.

    This improves security by ensuring tokens aren't reused indefinitely.
    """
    now = timezone.now()

    # Find assignments with expired tokens
    expired = MicroCheckAssignment.objects.filter(
        expires_at__lt=now,
        status__in=['SENT', 'ACCESSED']
    )

    # Also find assignments with excessive access (possible token leak)
    overused = MicroCheckAssignment.objects.filter(
        access_count__gte=10,  # Threshold for "suspicious" access
        status='ACCESSED'
    )

    rotated_count = 0

    for assignment in expired | overused:
        # Generate new token
        raw_token = generate_magic_link_token()
        token_hash = hash_token(raw_token)

        assignment.token_hash = token_hash
        assignment.expires_at = timezone.now() + timezone.timedelta(hours=24)
        assignment.access_count = 0
        assignment.status = 'SENT'
        assignment.save()

        rotated_count += 1

        # Optionally resend the new link
        # send_micro_check_assignment.delay(assignment.run_id, assignment.manager_id)

    logger.info(f"Rotated {rotated_count} magic links")
    return {'rotated': rotated_count}
