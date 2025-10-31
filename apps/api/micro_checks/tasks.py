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
    update_store_streak,
    create_corrective_action_for_failure,
    all_run_items_passed
)

# Import shift checker for 7shifts integration
try:
    from integrations.shift_checker import ShiftChecker
    SHIFT_CHECKER_AVAILABLE = True
except ImportError:
    SHIFT_CHECKER_AVAILABLE = False
    logger.warning("7shifts integration not available - shift checking disabled")

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(queue='default', bind=True)
def create_daily_micro_check_runs(self):
    """
    Scheduled task to create daily micro-check runs for all active stores with idempotency.

    Runs every hour and checks if each store's local time matches their configured send time.
    Creates runs and sends magic link emails to store managers when it's time.
    
    Idempotency is ensured by checking for existing runs before creation.
    """
    from brands.models import Store
    from datetime import datetime
    import pytz

    current_utc = timezone.now()
    stores = Store.objects.filter(is_active=True)

    created_count = 0
    skipped_count = 0
    sent_count = 0

    for store in stores:
        try:
            # Get store's current local time
            store_tz = pytz.timezone(store.timezone)
            store_local_time = current_utc.astimezone(store_tz)
            store_local_date = store_local_time.date()

            # Check if it's the configured send time for this store (within the current hour)
            send_time = store.micro_check_send_time
            is_send_hour = (
                store_local_time.hour == send_time.hour and
                store_local_time.minute < 60  # Within the hour
            )

            if not is_send_hour:
                continue  # Not time to send for this store yet

            # Check if this store should get a run today
            should_create = _should_create_run_for_store(store, store_local_date)

            if should_create:
                run = _create_run_for_store(store, store_local_date)
                if run:
                    created_count += 1
                    logger.info(f"Created run {run.id} for store {store.id}")

                    # Auto-send magic link email to store manager(s)
                    emails_sent = _send_run_to_managers(run, store)
                    sent_count += emails_sent
            else:
                skipped_count += 1

        except Exception as e:
            logger.error(f"Error creating run for store {store.id}: {str(e)}")
            continue

    logger.info(f"Daily run creation: {created_count} created, {skipped_count} skipped, {sent_count} emails sent")
    return {'created': created_count, 'skipped': skipped_count, 'sent': sent_count}


def _should_create_run_for_store(store, local_date):
    """
    Determine if a run should be created for this store on this date.

    Checks delivery configuration for cadence settings:
    - DAILY mode: create run every day
    - RANDOMIZED mode: create run based on random day gaps
    """
    from accounts.models import MicroCheckDeliveryConfig
    import random

    # Check if run already exists for today
    existing = MicroCheckRun.objects.filter(
        store=store,
        scheduled_for=local_date
    ).exists()

    if existing:
        return False

    # Get account delivery config if available
    if not store.account:
        return True  # Default to daily if no account

    try:
        config = MicroCheckDeliveryConfig.objects.get(account=store.account)
    except MicroCheckDeliveryConfig.DoesNotExist:
        return True  # Default to daily if no config

    # Handle cadence modes
    if config.cadence_mode == 'DAILY':
        return True

    elif config.cadence_mode == 'RANDOMIZED':
        # Check if we should send based on randomized schedule
        if config.next_send_date:
            # Use pre-calculated next send date
            return local_date >= config.next_send_date
        elif config.last_sent_date:
            # Calculate if enough time has passed
            days_since_last = (local_date - config.last_sent_date).days
            min_gap = config.min_day_gap or 1
            return days_since_last >= min_gap
        else:
            # First time sending - send it
            return True

    return True  # Default to sending


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

    # Select 3 templates using ML-enhanced smart rotation
    selected = select_templates_for_run(store, num_items=3)

    # Create run items and ML metrics
    for order, (template, coverage, photo_required, photo_reason, metrics_data) in enumerate(selected, start=1):
        run_item = MicroCheckRunItem.objects.create(
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

        # Save ML scoring metrics for observability
        from .models import MicroCheckMLMetrics
        model_metadata = metrics_data.get('model_metadata') or {}

        MicroCheckMLMetrics.objects.create(
            run_item=run_item,
            template=template,
            store=store,
            rule_score=metrics_data.get('rule_score', 0),
            ml_score=metrics_data.get('ml_score'),
            personalized_score=metrics_data.get('personalized_score'),
            final_score=metrics_data.get('final_score', 0),
            selection_method=metrics_data.get('selection_method', 'RULE_BASED'),
            model_version=model_metadata.get('training_date', ''),
            training_date=model_metadata.get('training_date'),
            training_f1_score=model_metadata.get('f1_score'),
            local_prior=metrics_data.get('local_prior'),
            local_total=metrics_data.get('local_total'),
        )

        # Coverage tracking is updated when responses are submitted
        # For now, we just create the run items

    # Update delivery config if using randomized cadence
    if store.account:
        from accounts.models import MicroCheckDeliveryConfig
        import random
        from datetime import timedelta

        try:
            config = MicroCheckDeliveryConfig.objects.get(account=store.account)
            if config.cadence_mode == 'RANDOMIZED':
                # Update last sent date
                config.last_sent_date = scheduled_date

                # Calculate next send date with random gap
                min_gap = config.min_day_gap or 1
                max_gap = config.max_day_gap or 3
                random_gap = random.randint(min_gap, max_gap)
                config.next_send_date = scheduled_date + timedelta(days=random_gap)

                config.save()
                logger.info(f"Updated delivery config: next send in {random_gap} days ({config.next_send_date})")
        except MicroCheckDeliveryConfig.DoesNotExist:
            pass  # No config, continue

    logger.info(f"Created run {run.id} with {len(selected)} items for store {store.id}")
    return run


def _send_run_to_managers(run, store):
    """
    Send magic link emails to eligible recipients based on delivery configuration.

    Handles:
    - Manager-only vs all-employee delivery
    - 7shifts shift-based filtering (if enabled)
    - Random recipient sampling (if enabled)

    Returns the number of emails sent.
    """
    from .utils import send_magic_link_email
    from accounts.models import MicroCheckDeliveryConfig
    import random

    # Get delivery config
    delivery_config = None
    if store.account:
        try:
            delivery_config = MicroCheckDeliveryConfig.objects.get(account=store.account)
        except MicroCheckDeliveryConfig.DoesNotExist:
            pass

    # Determine eligible recipients based on config
    if delivery_config and delivery_config.send_to_recipients == 'ALL_EMPLOYEES':
        # Send to all active employees at this store
        recipients = User.objects.filter(
            store=store,
            is_active=True,
            role__in=['GM', 'EMPLOYEE']
        )
    else:
        # Default: send only to managers
        recipients = User.objects.filter(
            store=store,
            role='GM',
            is_active=True
        )

    # Convert to list for manipulation
    recipients_list = list(recipients)

    # Filter by per-employee scheduling (for randomized mode)
    if delivery_config and delivery_config.cadence_mode == 'RANDOMIZED':
        from datetime import date
        today = date.today()

        # Only send to employees whose next_send_date is today or earlier
        recipients_list = [
            r for r in recipients_list
            if r.micro_check_next_send_date is None or r.micro_check_next_send_date <= today
        ]
        logger.info(f"Filtered to {len(recipients_list)} employees due for randomized check today")

    # Check 7shifts integration for shift-based filtering
    if SHIFT_CHECKER_AVAILABLE and store.account:
        from integrations.models import SevenShiftsConfig
        try:
            shifts_config = SevenShiftsConfig.objects.get(
                account=store.account,
                is_active=True
            )
            if shifts_config.enforce_shift_schedule:
                # Filter to only employees currently on shift
                shift_checker = ShiftChecker()
                on_shift_employees = shift_checker.get_employees_on_shift_at_store(
                    store=store,
                    check_time=timezone.now()
                )
                on_shift_emails = {emp['email'].lower() for emp in on_shift_employees}

                # Filter recipients to those on shift
                recipients_list = [
                    r for r in recipients_list
                    if r.email.lower() in on_shift_emails
                ]
                logger.info(f"Filtered to {len(recipients_list)} employees on shift")
        except:
            pass  # No 7shifts config or error, continue with all recipients

    # Apply recipient randomization if enabled
    if delivery_config and delivery_config.randomize_recipients:
        percentage = delivery_config.recipient_percentage or 100
        if percentage < 100:
            # Calculate how many to send to
            num_to_send = max(1, int(len(recipients_list) * (percentage / 100.0)))
            # Randomly sample
            recipients_list = random.sample(recipients_list, num_to_send)
            logger.info(f"Randomly selected {num_to_send} of {len(recipients)} recipients ({percentage}%)")

    # Send to all selected recipients
    sent_count = 0
    for recipient in recipients_list:
        try:
            # Generate magic link token
            raw_token = generate_magic_link_token()
            token_hash = hash_token(raw_token)

            # Create assignment
            assignment = MicroCheckAssignment.objects.create(
                run=run,
                manager=recipient,
                token_hash=token_hash,
                delivery_method='EMAIL',
                sent_at=timezone.now()
            )

            # Send email with magic link
            success = send_magic_link_email(
                email=recipient.email,
                token=raw_token,
                store_name=store.name,
                recipient_name=recipient.first_name or recipient.username
            )

            if success:
                sent_count += 1
                logger.info(f"Sent micro-check email to {recipient.email} for run {run.id}")

                # Update per-employee scheduling
                if delivery_config and delivery_config.cadence_mode == 'RANDOMIZED':
                    from datetime import date, timedelta
                    import random

                    recipient.micro_check_last_sent_date = date.today()

                    # Calculate next send date with random gap
                    min_gap = delivery_config.min_day_gap or 1
                    max_gap = delivery_config.max_day_gap or 3
                    random_gap = random.randint(min_gap, max_gap)
                    recipient.micro_check_next_send_date = date.today() + timedelta(days=random_gap)

                    recipient.save(update_fields=['micro_check_last_sent_date', 'micro_check_next_send_date'])
                    logger.info(f"Updated {recipient.email} schedule: next check in {random_gap} days")
            else:
                logger.warning(f"Failed to send email to {recipient.email} for run {run.id}")

        except Exception as e:
            logger.error(f"Error sending to recipient {recipient.id}: {str(e)}")
            continue

    return sent_count


@shared_task(queue='default')
def send_micro_check_assignment(run_id, manager_id, delivery_method='SMS'):
    """
    Create and send a magic link assignment to a manager.

    Checks 7shifts integration to ensure the employee is on shift before sending.

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

    # Check 7shifts shift schedule if integration is enabled
    if SHIFT_CHECKER_AVAILABLE and manager.email and manager.store:
        shift_check = ShiftChecker.should_send_micro_check(
            email=manager.email,
            store=manager.store,
            check_time=timezone.now()
        )

        if not shift_check['should_send']:
            logger.info(
                f"Skipping micro-check for {manager.email} - {shift_check['reason']}"
            )
            return {
                'success': False,
                'error': 'employee_not_on_shift',
                'reason': shift_check['reason'],
                'skipped': True
            }

        logger.info(
            f"Sending micro-check to {manager.email} - {shift_check['reason']}"
        )

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


@shared_task(queue='default', bind=True)
def process_micro_check_response(self, response_id):
    """
    Process a micro-check response after submission with idempotency protection.

    This handles:
    - Updating coverage statistics
    - Creating corrective actions for failures
    - Updating streaks
    - Checking if entire run is complete

    Args:
        response_id: UUID of MicroCheckResponse
    """
    from django.core.cache import cache
    
    cache_key = f'process_response_{response_id}'
    if cache.get(cache_key):
        logger.info(f"Response {response_id} already being processed, skipping")
        return {'success': True, 'skipped': True, 'reason': 'already_processing'}
    
    cache.set(cache_key, True, timeout=300)
    
    try:
        response = MicroCheckResponse.objects.select_related(
            'run_item__run',
            'store',
            'completed_by'
        ).get(id=response_id)
    except MicroCheckResponse.DoesNotExist:
        logger.error(f"Response {response_id} not found")
        cache.delete(cache_key)
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
        run.completed_by = response.completed_by
        run.save()

        # Update streak for the user who completed the run
        if response.completed_by:
            all_passed = all_run_items_passed(run)
            update_streak(
                store=store,
                manager=response.completed_by,
                completed_date=response.local_completed_date,
                passed=all_passed
            )

        # Update store-level streak
        update_store_streak(
            store=store,
            completed_date=response.local_completed_date
        )

        logger.info(f"Run {run.id} completed")

    cache.delete(cache_key)
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


@shared_task(queue='maintenance')
def refresh_store_template_stats():
    """
    Refresh StoreTemplateStats with yesterday's micro-check responses.

    This task runs nightly at 2 AM to update local prior statistics
    for ML-based template selection.
    """
    from .models import MicroCheckResponse, StoreTemplateStats
    from datetime import timedelta

    logger.info("Starting StoreTemplateStats refresh")

    # Get yesterday's date
    yesterday = (timezone.now() - timedelta(days=1)).date()

    # Get all responses from yesterday
    responses = MicroCheckResponse.objects.filter(
        local_completed_date=yesterday
    ).select_related('store', 'template')

    logger.info(f"Found {responses.count()} responses from {yesterday}")

    # Track updates
    updated_count = 0
    created_count = 0

    # Group responses by (store, template)
    from collections import defaultdict
    stats_map = defaultdict(lambda: {'fails': 0, 'total': 0})

    for response in responses:
        key = (response.store_id, response.template_id)
        stats_map[key]['total'] += 1
        if response.status in ['FAIL', 'NEEDS_ATTENTION']:
            stats_map[key]['fails'] += 1

    # Update or create StoreTemplateStats
    for (store_id, template_id), counts in stats_map.items():
        stats, created = StoreTemplateStats.objects.get_or_create(
            store_id=store_id,
            template_id=template_id,
            defaults={
                'fails': 0,
                'total': 0
            }
        )

        # Increment counters
        stats.fails += counts['fails']
        stats.total += counts['total']
        stats.save()

        if created:
            created_count += 1
        else:
            updated_count += 1

    logger.info(f"StoreTemplateStats refresh complete: {created_count} created, {updated_count} updated")
    return {
        'responses_processed': responses.count(),
        'stats_created': created_count,
        'stats_updated': updated_count,
    }


@shared_task(queue='ml')
def train_micro_check_ml_models(dry_run=False):
    """
    Train ML models for all brands (weekly task).

    This task runs every Sunday at 3 AM to retrain failure prediction models
    using the latest response data.

    Args:
        dry_run: If True, don't save models (for testing)
    """
    from .ml_training import train_all_brand_models

    logger.info("Starting weekly ML model training")

    results = train_all_brand_models(dry_run=dry_run)

    # Log summary
    successful = sum(1 for r in results if r.get('success'))
    failed = len(results) - successful

    logger.info(f"ML model training complete: {successful} successful, {failed} failed")

    return {
        'total': len(results),
        'successful': successful,
        'failed': failed,
        'results': results
    }
