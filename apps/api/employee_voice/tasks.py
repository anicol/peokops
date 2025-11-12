from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Avg, Q
from django.conf import settings
from datetime import timedelta, datetime
import logging
import hashlib
import uuid
import pytz
import random

from .models import (
    EmployeeVoicePulse,
    EmployeeVoiceInvitation,
    EmployeeVoiceResponse,
    AutoFixFlowConfig,
    CrossVoiceCorrelation
)
from inspections.models import ActionItem, Finding
from micro_checks.models import MicroCheckResponse

logger = logging.getLogger(__name__)


@shared_task(queue='default')
def schedule_pulse_invitations():
    """
    Scheduled task to create randomized pulse invitations for the day.

    Runs once daily (early morning) and creates invitations with randomized
    scheduled_send_at times based on:
    - Delivery frequency (LOW/MEDIUM/HIGH) = probability of getting survey
    - Randomization window = minutes within shift window to randomize
    - Shift window = OPEN/MID/CLOSE defines the 2-hour window

    Each employee has individual random schedule:
    - Random day selection (per delivery_frequency %)
    - Random time within first N minutes of shift window

    Invitations are created with status=SCHEDULED and will be sent by
    send_scheduled_invitations task when scheduled_send_at is reached.
    """
    from brands.models import Store

    current_utc = timezone.now()
    active_pulses = EmployeeVoicePulse.objects.filter(
        is_active=True,
        status__in=[EmployeeVoicePulse.Status.ACTIVE, EmployeeVoicePulse.Status.LOCKED]
    ).select_related('store', 'account')

    scheduled_count = 0
    skipped_count = 0

    for pulse in active_pulses:
        try:
            # Get store's current local time
            store = pulse.store
            if not store:
                continue

            store_tz = pytz.timezone(store.timezone)
            store_local_time = current_utc.astimezone(store_tz)
            today_start = store_local_time.replace(hour=0, minute=0, second=0, microsecond=0)

            # Check if we already scheduled invitations for today
            already_scheduled = EmployeeVoiceInvitation.objects.filter(
                pulse=pulse,
                created_at__gte=today_start
            ).exists()

            if already_scheduled:
                skipped_count += 1
                continue

            # Get employees for this store from 7shifts integration
            try:
                from integrations.models import SevenShiftsEmployee
                employees = SevenShiftsEmployee.objects.filter(
                    store=store,
                    is_active=True
                ).exclude(phone_number__isnull=True).exclude(phone_number='')

                # Get delivery frequency probability
                frequency_map = {
                    EmployeeVoicePulse.DeliveryFrequency.LOW: 0.25,      # 25% chance
                    EmployeeVoicePulse.DeliveryFrequency.MEDIUM: 0.40,   # 40% chance
                    EmployeeVoicePulse.DeliveryFrequency.HIGH: 0.55,     # 55% chance
                }
                send_probability = frequency_map.get(
                    pulse.delivery_frequency,
                    0.40  # Default to MEDIUM
                )

                for employee in employees:
                    # Random day selection - each employee has random chance
                    if random.random() > send_probability:
                        continue  # Skip this employee today

                    # Calculate randomized send time
                    scheduled_time = _calculate_randomized_send_time(
                        pulse,
                        store_local_time,
                        store_tz
                    )

                    if scheduled_time:
                        invitation = _create_scheduled_invitation(
                            pulse,
                            employee.phone_number,
                            scheduled_time
                        )
                        if invitation:
                            scheduled_count += 1

            except ImportError:
                logger.warning(f"7shifts integration not available for store {store.id}")
                continue

        except Exception as e:
            logger.error(f"Error scheduling invitations for pulse {pulse.id}: {str(e)}")
            continue

    logger.info(f"Pulse invitations scheduled: {scheduled_count} created, {skipped_count} pulses skipped")
    return {'scheduled': scheduled_count, 'skipped': skipped_count}


@shared_task(queue='default')
def send_scheduled_invitations():
    """
    Scheduled task to send pulse invitations that are ready.

    Runs every hour and sends invitations where:
    - status = SCHEDULED
    - scheduled_send_at <= current time

    Updates status to SENT after successful SMS delivery.
    """
    current_utc = timezone.now()

    # Get invitations ready to send
    ready_invitations = EmployeeVoiceInvitation.objects.filter(
        status=EmployeeVoiceInvitation.Status.SCHEDULED,
        scheduled_send_at__lte=current_utc,
        expires_at__gt=current_utc
    ).select_related('pulse', 'pulse__store')

    sent_count = 0
    failed_count = 0

    for invitation in ready_invitations:
        try:
            # Send SMS via Twilio
            success = _send_sms_invitation(invitation, invitation.recipient_phone)

            if success:
                invitation.status = EmployeeVoiceInvitation.Status.SENT
                invitation.sent_at = timezone.now()
                invitation.save(update_fields=['status', 'sent_at', 'updated_at'])
                sent_count += 1
            else:
                failed_count += 1

        except Exception as e:
            logger.error(f"Error sending scheduled invitation {invitation.id}: {str(e)}")
            failed_count += 1
            continue

    logger.info(f"Scheduled invitations sent: {sent_count} sent, {failed_count} failed")
    return {'sent': sent_count, 'failed': failed_count}


def _is_shift_window_hour(shift_window, store_local_time):
    """Check if current hour matches the shift window"""
    hour = store_local_time.hour

    if shift_window == EmployeeVoicePulse.ShiftWindow.OPEN:
        return 6 <= hour < 8
    elif shift_window == EmployeeVoicePulse.ShiftWindow.MID:
        return 12 <= hour < 14
    elif shift_window == EmployeeVoicePulse.ShiftWindow.CLOSE:
        return 20 <= hour < 22

    return False


def _get_shift_window_start_hour(shift_window):
    """Get the starting hour for a shift window"""
    if shift_window == EmployeeVoicePulse.ShiftWindow.OPEN:
        return 6
    elif shift_window == EmployeeVoicePulse.ShiftWindow.MID:
        return 12
    elif shift_window == EmployeeVoicePulse.ShiftWindow.CLOSE:
        return 20
    return 12  # Default to MID


def _calculate_randomized_send_time(pulse, store_local_time, store_tz):
    """
    Calculate a randomized send time for an invitation.

    Returns a timezone-aware datetime within the first N minutes of the shift window,
    where N = pulse.randomization_window_minutes.

    Example: If shift is MID (12pm-2pm) and randomization_window = 60 minutes,
    returns a random time between 12:00 PM and 1:00 PM.
    """
    try:
        # Get shift window start hour
        start_hour = _get_shift_window_start_hour(pulse.shift_window)

        # Create datetime for start of shift window today
        shift_start = store_local_time.replace(
            hour=start_hour,
            minute=0,
            second=0,
            microsecond=0
        )

        # Randomize within the specified window (default 60 minutes)
        randomization_window = pulse.randomization_window_minutes or 60
        random_minutes = random.randint(0, randomization_window - 1)

        # Calculate scheduled time
        scheduled_local = shift_start + timedelta(minutes=random_minutes)

        # Convert to UTC for storage
        scheduled_utc = scheduled_local.astimezone(pytz.UTC)

        return scheduled_utc

    except Exception as e:
        logger.error(f"Error calculating randomized send time for pulse {pulse.id}: {str(e)}")
        return None


def _create_scheduled_invitation(pulse, phone_number, scheduled_send_at):
    """Create a scheduled invitation (not sent immediately)"""
    try:
        # Generate secure token
        token = hashlib.sha256(f"{uuid.uuid4()}{timezone.now()}".encode()).hexdigest()

        # Create invitation with SCHEDULED status
        invitation = EmployeeVoiceInvitation.objects.create(
            pulse=pulse,
            token=token,
            delivery_method=EmployeeVoiceInvitation.DeliveryMethod.SMS,
            recipient_phone=phone_number,
            scheduled_send_at=scheduled_send_at,
            status=EmployeeVoiceInvitation.Status.SCHEDULED,
            expires_at=scheduled_send_at + timedelta(hours=24)
        )

        logger.debug(
            f"Scheduled invitation {invitation.id} for {phone_number} "
            f"at {scheduled_send_at.strftime('%Y-%m-%d %H:%M %Z')}"
        )

        return invitation

    except Exception as e:
        logger.error(f"Error creating scheduled invitation for pulse {pulse.id}: {str(e)}")
        return None


def _create_and_send_invitation(pulse, phone_number):
    """Create invitation and send SMS via Twilio"""
    try:
        # Generate secure token
        token = hashlib.sha256(f"{uuid.uuid4()}{timezone.now()}".encode()).hexdigest()

        # Create invitation
        invitation = EmployeeVoiceInvitation.objects.create(
            pulse=pulse,
            token=token,
            delivery_method=EmployeeVoiceInvitation.DeliveryMethod.SMS,
            recipient_phone=phone_number,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        # Send SMS via Twilio
        success = _send_sms_invitation(invitation, phone_number)

        if success:
            invitation.status = EmployeeVoiceInvitation.Status.SENT
            invitation.sent_at = timezone.now()
            invitation.save(update_fields=['status', 'sent_at', 'updated_at'])
            return invitation

        return None

    except Exception as e:
        logger.error(f"Error creating invitation for pulse {pulse.id}: {str(e)}")
        return None


def _send_sms_invitation(invitation, phone_number):
    """Send SMS via Twilio"""
    try:
        from twilio.rest import Client

        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            logger.warning("Twilio credentials not configured")
            return False

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        # Build magic link URL
        magic_link = f"{settings.FRONTEND_URL}/pulse-survey/{invitation.token}"

        # Construct message
        message_body = (
            f"Quick team check-in 📋\n\n"
            f"{invitation.pulse.title}\n"
            f"Takes <30 seconds, anonymous.\n\n"
            f"{magic_link}\n\n"
            f"Expires in 24h."
        )

        message = client.messages.create(
            body=message_body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone_number
        )

        logger.info(f"SMS sent to {phone_number}: {message.sid}")
        return True

    except Exception as e:
        logger.error(f"Error sending SMS to {phone_number}: {str(e)}")
        return False


@shared_task(queue='default')
def check_pulse_unlock_status():
    """
    Scheduled task to check and update unlock status for all locked pulses.

    Unlocks pulses that have reached 5 unique respondents in last 30 days.
    Runs daily at 3 AM UTC.
    """
    locked_pulses = EmployeeVoicePulse.objects.filter(
        status=EmployeeVoicePulse.Status.LOCKED,
        is_active=True
    )

    unlocked_count = 0

    for pulse in locked_pulses:
        try:
            pulse.check_unlock_status()

            # Check if it got unlocked
            pulse.refresh_from_db()
            if pulse.status == EmployeeVoicePulse.Status.ACTIVE:
                unlocked_count += 1
                logger.info(f"Pulse {pulse.id} unlocked: {pulse.title}")

        except Exception as e:
            logger.error(f"Error checking unlock status for pulse {pulse.id}: {str(e)}")
            continue

    logger.info(f"Unlock check: {unlocked_count} pulses unlocked")
    return {'unlocked': unlocked_count, 'checked': locked_pulses.count()}


@shared_task(queue='default')
def evaluate_auto_fix_flows():
    """
    Scheduled task to evaluate auto-fix flow configs and create ActionItems.

    Checks if any bottleneck has crossed threshold (e.g., ≥3 mentions in 7 days).
    Auto-creates ActionItem when threshold is met.
    Runs daily at 4 AM UTC.
    """
    enabled_configs = AutoFixFlowConfig.objects.filter(
        is_enabled=True,
        pulse__is_active=True
    ).select_related('pulse', 'pulse__store', 'pulse__account')

    actions_created = 0

    for config in enabled_configs:
        try:
            config.check_and_create_action_items()

            # Check if any new correlations were created (which trigger actions)
            new_correlations = CrossVoiceCorrelation.objects.filter(
                pulse=config.pulse,
                created_at__gte=timezone.now() - timedelta(hours=1),
                action_item__isnull=False
            )

            actions_created += new_correlations.count()

            if new_correlations.exists():
                logger.info(
                    f"Auto-fix: {new_correlations.count()} actions created for pulse {config.pulse.id}"
                )

        except Exception as e:
            logger.error(f"Error evaluating auto-fix config {config.id}: {str(e)}")
            continue

    logger.info(f"Auto-fix evaluation: {actions_created} actions created")
    return {'actions_created': actions_created, 'configs_checked': enabled_configs.count()}


@shared_task(queue='default')
def detect_cross_voice_correlations():
    """
    Scheduled task to detect correlations between employee voice and micro-check failures.

    Analyzes:
    - Bottleneck trends vs. check failure rates
    - Mood decline vs. check failures
    - Low confidence vs. check failures

    Creates CrossVoiceCorrelation records with actionable recommendations.
    Runs daily at 5 AM UTC.
    """
    active_pulses = EmployeeVoicePulse.objects.filter(
        status=EmployeeVoicePulse.Status.ACTIVE,
        is_active=True
    ).select_related('store', 'account')

    correlations_created = 0

    for pulse in active_pulses:
        try:
            # Analyze last 7 days
            seven_days_ago = timezone.now() - timedelta(days=7)

            # Get responses
            responses = EmployeeVoiceResponse.objects.filter(
                pulse=pulse,
                completed_at__gte=seven_days_ago
            )

            if responses.count() < 5:
                continue  # Need minimum 5 responses for correlation

            # Analyze bottleneck trends
            correlations_created += _analyze_bottleneck_correlations(pulse, responses, seven_days_ago)

            # Analyze mood correlations
            correlations_created += _analyze_mood_correlations(pulse, responses, seven_days_ago)

            # Analyze confidence correlations
            correlations_created += _analyze_confidence_correlations(pulse, responses, seven_days_ago)

        except Exception as e:
            logger.error(f"Error detecting correlations for pulse {pulse.id}: {str(e)}")
            continue

    logger.info(f"Correlation detection: {correlations_created} correlations created")
    return {'correlations_created': correlations_created, 'pulses_analyzed': active_pulses.count()}


def _analyze_bottleneck_correlations(pulse, responses, time_window_start):
    """Analyze bottleneck trends vs check failures"""
    correlations_created = 0

    # Count bottleneck mentions
    bottleneck_counts = responses.exclude(
        Q(bottleneck__isnull=True) | Q(bottleneck='NONE')
    ).values('bottleneck').annotate(count=Count('bottleneck'))

    for item in bottleneck_counts:
        bottleneck_type = item['bottleneck']
        mention_count = item['count']

        # Map bottleneck to check category
        category_map = {
            'EQUIPMENT': 'EQUIPMENT',
            'STAFFING': 'STAFFING',
            'TRAINING': 'TRAINING',
            'SUPPLIES': 'SUPPLY_CHAIN',
            'COMMUNICATION': 'PROCEDURES',
            'PROCESSES': 'PROCEDURES',
        }

        check_category = category_map.get(bottleneck_type)
        if not check_category:
            continue

        # Get check failure rate for this category
        check_responses = MicroCheckResponse.objects.filter(
            store=pulse.store,
            completed_at__gte=time_window_start,
            template__category=check_category
        )

        if check_responses.count() == 0:
            continue

        fail_count = check_responses.filter(status='FAIL').count()
        fail_rate = (fail_count / check_responses.count()) * 100

        # Create correlation if fail rate > 30% and mentions ≥ 3
        if fail_rate > 30 and mention_count >= 3:
            # Check if correlation already exists
            existing = CrossVoiceCorrelation.objects.filter(
                pulse=pulse,
                bottleneck_type=bottleneck_type,
                created_at__gte=time_window_start,
                is_resolved=False
            ).exists()

            if not existing:
                # Determine strength
                if fail_rate > 50 and mention_count >= 5:
                    strength = CrossVoiceCorrelation.Strength.STRONG
                elif fail_rate > 40 or mention_count >= 4:
                    strength = CrossVoiceCorrelation.Strength.MODERATE
                else:
                    strength = CrossVoiceCorrelation.Strength.WEAK

                recommendation = (
                    f"{bottleneck_type.replace('_', ' ').title()} bottleneck mentioned {mention_count}× "
                    f"in past 7 days while {check_category} checks failing {fail_rate:.0f}%. "
                    f"Recommend: Run {check_category} micro-checks 3× this week and address root causes."
                )

                CrossVoiceCorrelation.objects.create(
                    pulse=pulse,
                    correlation_type=CrossVoiceCorrelation.CorrelationType.BOTTLENECK_TO_CHECK_FAIL,
                    strength=strength,
                    bottleneck_type=bottleneck_type,
                    check_category=check_category,
                    check_fail_rate=fail_rate,
                    recommendation_text=recommendation,
                    is_actionable=True,
                    time_window_start=time_window_start,
                    time_window_end=timezone.now()
                )

                correlations_created += 1
                logger.info(f"Created bottleneck correlation: {bottleneck_type} → {check_category}")

    return correlations_created


def _analyze_mood_correlations(pulse, responses, time_window_start):
    """Analyze mood decline vs check failures"""
    correlations_created = 0

    # Calculate average mood
    avg_mood = responses.aggregate(avg=Avg('mood'))['avg']

    if not avg_mood or avg_mood > 3:  # Only trigger if mood is below neutral
        return 0

    # Get overall check failure rate
    check_responses = MicroCheckResponse.objects.filter(
        store=pulse.store,
        completed_at__gte=time_window_start
    )

    if check_responses.count() < 5:
        return 0

    fail_count = check_responses.filter(status='FAIL').count()
    fail_rate = (fail_count / check_responses.count()) * 100

    if fail_rate > 35:  # Correlation threshold
        # Check if correlation already exists
        existing = CrossVoiceCorrelation.objects.filter(
            pulse=pulse,
            correlation_type=CrossVoiceCorrelation.CorrelationType.MOOD_TO_CHECK_FAIL,
            created_at__gte=time_window_start,
            is_resolved=False
        ).exists()

        if not existing:
            strength = CrossVoiceCorrelation.Strength.MODERATE
            if avg_mood < 2.5 and fail_rate > 50:
                strength = CrossVoiceCorrelation.Strength.STRONG

            recommendation = (
                f"Team mood declining (avg {avg_mood:.1f}/5) while checks failing {fail_rate:.0f}%. "
                f"Recommend: Review team workload, address training gaps, and improve communication."
            )

            CrossVoiceCorrelation.objects.create(
                pulse=pulse,
                correlation_type=CrossVoiceCorrelation.CorrelationType.MOOD_TO_CHECK_FAIL,
                strength=strength,
                avg_mood_score=avg_mood,
                check_fail_rate=fail_rate,
                recommendation_text=recommendation,
                is_actionable=True,
                time_window_start=time_window_start,
                time_window_end=timezone.now()
            )

            correlations_created += 1
            logger.info(f"Created mood correlation: avg={avg_mood:.1f}, fail_rate={fail_rate:.0f}%")

    return correlations_created


def _analyze_confidence_correlations(pulse, responses, time_window_start):
    """Analyze low confidence vs check failures"""
    correlations_created = 0

    # Calculate confidence stats
    total = responses.count()
    low_confidence = responses.filter(confidence='LOW').count()
    low_confidence_pct = (low_confidence / total * 100) if total > 0 else 0

    if low_confidence_pct < 30:  # Only trigger if >30% low confidence
        return 0

    # Get check failure rate in TRAINING category
    check_responses = MicroCheckResponse.objects.filter(
        store=pulse.store,
        completed_at__gte=time_window_start,
        template__category='TRAINING'
    )

    if check_responses.count() < 3:
        return 0

    fail_count = check_responses.filter(status='FAIL').count()
    fail_rate = (fail_count / check_responses.count()) * 100

    if fail_rate > 30:  # Correlation threshold
        # Check if correlation already exists
        existing = CrossVoiceCorrelation.objects.filter(
            pulse=pulse,
            correlation_type=CrossVoiceCorrelation.CorrelationType.CONFIDENCE_TO_CHECK_FAIL,
            created_at__gte=time_window_start,
            is_resolved=False
        ).exists()

        if not existing:
            strength = CrossVoiceCorrelation.Strength.MODERATE
            if low_confidence_pct > 50 and fail_rate > 50:
                strength = CrossVoiceCorrelation.Strength.STRONG

            # Calculate average confidence score (LOW=1, MEDIUM=2, HIGH=3)
            confidence_values = {
                'LOW': 1,
                'MEDIUM': 2,
                'HIGH': 3
            }
            avg_confidence = sum(
                confidence_values.get(r.confidence, 2) for r in responses
            ) / total if total > 0 else 0

            recommendation = (
                f"{low_confidence_pct:.0f}% of team reporting low confidence while "
                f"training checks failing {fail_rate:.0f}%. "
                f"Recommend: Schedule additional training sessions and create training resources."
            )

            CrossVoiceCorrelation.objects.create(
                pulse=pulse,
                correlation_type=CrossVoiceCorrelation.CorrelationType.CONFIDENCE_TO_CHECK_FAIL,
                strength=strength,
                avg_confidence_score=avg_confidence,
                check_category='TRAINING',
                check_fail_rate=fail_rate,
                recommendation_text=recommendation,
                is_actionable=True,
                time_window_start=time_window_start,
                time_window_end=timezone.now()
            )

            correlations_created += 1
            logger.info(f"Created confidence correlation: low_conf={low_confidence_pct:.0f}%, fail_rate={fail_rate:.0f}%")

    return correlations_created
