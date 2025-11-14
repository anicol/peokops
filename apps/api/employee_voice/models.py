import uuid
import hashlib
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class EmployeeVoicePulse(models.Model):
    """
    Employee Voice Pulse Survey configuration.
    Ultra-lightweight (<30 second) sentiment survey for frontline staff.
    """

    class ShiftWindow(models.TextChoices):
        OPEN = 'OPEN', 'Opening Shift'
        MID = 'MID', 'Mid Shift'
        CLOSE = 'CLOSE', 'Closing Shift'

    class Language(models.TextChoices):
        EN = 'en', 'English'
        ES = 'es', 'Spanish (Español)'
        FR = 'fr', 'French (Français)'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        PAUSED = 'PAUSED', 'Paused'
        LOCKED = 'LOCKED', 'Locked (Awaiting Unlock)'

    class DeliveryFrequency(models.TextChoices):
        LOW = 'LOW', 'Low (1-2 times/week, ~20-30% daily chance)'
        MEDIUM = 'MEDIUM', 'Medium (2-3 times/week, ~40% daily chance)'
        HIGH = 'HIGH', 'High (3-4 times/week, ~50-60% daily chance)'

    class PauseReason(models.TextChoices):
        HOLIDAY = 'HOLIDAY', 'Holiday/Seasonal Break'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
        LOW_PARTICIPATION = 'LOW_PARTICIPATION', 'Low Participation'
        RESTRUCTURING = 'RESTRUCTURING', 'Team Restructuring'
        MIGRATED = 'MIGRATED', 'Migrated to single pulse'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Multi-tenant relationships
    store = models.ForeignKey(
        'brands.Store',
        on_delete=models.CASCADE,
        related_name='employee_voice_pulses',
        null=True,
        blank=True,
        help_text="Store this pulse belongs to (null = account-wide pulse)"
    )
    account = models.ForeignKey(
        'accounts.Account',
        on_delete=models.CASCADE,
        related_name='employee_voice_pulses',
        help_text="Account for multi-store management"
    )

    # Survey configuration
    title = models.CharField(max_length=200, default="Team Check-In")
    description = models.TextField(
        default="Quick anonymous survey to help improve daily operations.",
        help_text="Description shown to employees"
    )

    # Scheduling
    shift_window = models.CharField(
        max_length=10,
        choices=ShiftWindow.choices,
        default=ShiftWindow.MID,
        help_text="When during the shift to send the survey"
    )
    language = models.CharField(
        max_length=5,
        choices=Language.choices,
        default=Language.EN,
        help_text="Primary language for this pulse survey"
    )
    send_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Specific time to send (optional, uses shift_window if not set)"
    )

    # Randomization settings (to prevent pencil-whipping)
    delivery_frequency = models.CharField(
        max_length=10,
        choices=DeliveryFrequency.choices,
        default=DeliveryFrequency.MEDIUM,
        help_text="How often employees receive surveys (randomized per employee)"
    )
    randomization_window_minutes = models.IntegerField(
        default=60,
        help_text="Window size in minutes for randomizing send times within shift (e.g., 30-60 min)"
    )

    # Unlocking logic
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.LOCKED,
        help_text="Unlock after 5 unique respondents in 30 days"
    )
    unlocked_at = models.DateTimeField(null=True, blank=True)

    # Privacy settings
    min_respondents_for_display = models.IntegerField(
        default=5,
        help_text="Minimum n for displaying aggregated data (privacy protection)"
    )
    consent_text = models.TextField(
        default="Anonymous, aggregated. Used to improve daily operations.",
        help_text="Consent copy shown to employees"
    )

    # Pause tracking
    pause_reason = models.CharField(
        max_length=50,
        choices=PauseReason.choices,
        null=True,
        blank=True,
        help_text="Reason for pausing the pulse survey"
    )
    pause_notes = models.TextField(
        null=True,
        blank=True,
        help_text="Additional context for pause"
    )
    paused_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when pulse was paused"
    )

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_employee_voice_pulses'
    )

    class Meta:
        db_table = 'employee_voice_pulses'
        indexes = [
            models.Index(fields=['store', 'is_active']),
            models.Index(fields=['account', 'status']),
            models.Index(fields=['status', 'unlocked_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['account'],
                condition=models.Q(store__isnull=True),
                name='unique_account_pulse',
                violation_error_message='An account can only have one account-wide pulse survey.'
            ),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.store.name} ({self.get_shift_window_display()})"

    def check_unlock_status(self):
        """
        Check if this pulse should be unlocked based on unique respondents.
        Unlock requirement: 5 unique respondents in the last 30 days.
        """
        if self.status != self.Status.LOCKED:
            return

        thirty_days_ago = timezone.now() - timedelta(days=30)
        unique_respondents = EmployeeVoiceResponse.objects.filter(
            pulse=self,
            completed_at__gte=thirty_days_ago
        ).values('anonymous_hash').distinct().count()

        if unique_respondents >= 5:
            self.status = self.Status.ACTIVE
            self.unlocked_at = timezone.now()
            self.save(update_fields=['status', 'unlocked_at', 'updated_at'])

    def get_progress_toward_unlock(self):
        """
        Get current progress toward unlocking (X/5 unique respondents).
        """
        thirty_days_ago = timezone.now() - timedelta(days=30)
        unique_respondents = EmployeeVoiceResponse.objects.filter(
            pulse=self,
            completed_at__gte=thirty_days_ago
        ).values('anonymous_hash').distinct().count()

        return {
            'current': unique_respondents,
            'required': 5,
            'remaining': max(0, 5 - unique_respondents),
            'message': f"{unique_respondents}/5 team check-ins — {max(0, 5 - unique_respondents)} to go"
        }


class EmployeeVoiceInvitation(models.Model):
    """
    Magic link invitations for employee voice surveys.
    Sent via SMS, no login required.
    """

    class DeliveryMethod(models.TextChoices):
        SMS = 'SMS', 'SMS'
        QR = 'QR', 'QR Code'
        EMAIL = 'EMAIL', 'Email'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        SENT = 'SENT', 'Sent'
        OPENED = 'OPENED', 'Opened'
        COMPLETED = 'COMPLETED', 'Completed'
        EXPIRED = 'EXPIRED', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pulse = models.ForeignKey(
        EmployeeVoicePulse,
        on_delete=models.CASCADE,
        related_name='invitations'
    )

    # Magic link authentication
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Secure magic link token (hashed)"
    )

    # Delivery
    delivery_method = models.CharField(
        max_length=10,
        choices=DeliveryMethod.choices,
        default=DeliveryMethod.SMS
    )
    recipient_phone = models.CharField(max_length=20, blank=True)
    recipient_email = models.EmailField(blank=True)

    # Tracking
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    scheduled_send_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Randomized time to send this invitation (for staggered delivery)"
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(help_text="Magic link expiration (24 hours)")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employee_voice_invitations'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['pulse', 'status']),
            models.Index(fields=['expires_at', 'status']),
            models.Index(fields=['scheduled_send_at', 'status']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation {self.id} - {self.pulse.title} ({self.get_status_display()})"

    def is_valid(self):
        """Check if magic link is still valid"""
        return (
            self.status in [self.Status.PENDING, self.Status.SCHEDULED, self.Status.SENT, self.Status.OPENED]
            and self.expires_at > timezone.now()
        )

    def mark_opened(self):
        """Mark invitation as opened (user clicked the link)"""
        if self.status == self.Status.SENT:
            self.status = self.Status.OPENED
            self.opened_at = timezone.now()
            self.save(update_fields=['status', 'opened_at', 'updated_at'])

    def mark_completed(self):
        """Mark invitation as completed (survey submitted)"""
        if self.status in [self.Status.OPENED, self.Status.SENT]:
            self.status = self.Status.COMPLETED
            self.completed_at = timezone.now()
            self.save(update_fields=['status', 'completed_at', 'updated_at'])


class EmployeeVoiceResponse(models.Model):
    """
    Individual employee voice survey response.
    Anonymous by default with SHA-256 hash for deduplication.
    """

    class Mood(models.IntegerChoices):
        EXHAUSTED = 1, '😫 Exhausted'
        MEH = 2, '😐 Meh'
        GOOD = 3, '🙂 Good'
        GREAT = 4, '😄 Great'
        FIRE = 5, '🔥 On Fire'

    class Confidence(models.IntegerChoices):
        NO = 1, '❌ No, we\'re short or disorganized'
        MOSTLY = 2, '⚠️ Mostly, a few things missing'
        YES = 3, '✅ Yes, I\'m all set'

    class Bottleneck(models.TextChoices):
        CLEANLINESS = 'CLEANLINESS', '🧹 Cleanliness / Prep setup'
        STAFFING = 'STAFFING', '🧍 Staffing or scheduling'
        EQUIPMENT = 'EQUIPMENT', '⚙️ Equipment issues'
        TASKS = 'TASKS', '📋 Confusion about tasks'
        COMMUNICATION = 'COMMUNICATION', '💬 Communication / leadership'
        GUEST_VOLUME = 'GUEST_VOLUME', '🍴 Guest volume / rush'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pulse = models.ForeignKey(
        EmployeeVoicePulse,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    invitation = models.ForeignKey(
        EmployeeVoiceInvitation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responses'
    )

    # Privacy: anonymous hash for deduplication (device + IP + date)
    anonymous_hash = models.CharField(
        max_length=64,
        db_index=True,
        help_text="SHA-256 hash of device fingerprint + IP + date (non-reversible)"
    )

    # Survey responses
    mood = models.IntegerField(
        choices=Mood.choices,
        help_text="1-5 emoji slider for mood"
    )
    confidence = models.IntegerField(
        choices=Confidence.choices,
        help_text="Do you have what you need to do your job well today?"
    )
    bottlenecks = models.JSONField(
        default=list,
        blank=True,
        help_text="Multi-select: What's slowing the team down? (array of Bottleneck choices)"
    )
    comment = models.TextField(
        max_length=80,
        blank=True,
        help_text="Optional comment: Anything we should fix or celebrate today? (80 chars max)"
    )

    # Metadata
    submitted_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="For hash generation only")
    user_agent = models.TextField(blank=True, help_text="For hash generation only")

    class Meta:
        db_table = 'employee_voice_responses'
        indexes = [
            models.Index(fields=['pulse', 'completed_at']),
            models.Index(fields=['anonymous_hash', 'completed_at']),
            # Note: bottlenecks is now a JSONField (multi-select), so no direct index
        ]
        ordering = ['-completed_at']

    def __str__(self):
        return f"Response {self.id} - {self.pulse.title} (Mood: {self.get_mood_display()})"


class CrossVoiceCorrelation(models.Model):
    """
    Links employee voice pulse trends with micro-check failures.
    Powers smart recommendations like: "Equipment bottleneck ↑ + checks failing → Run Equipment check 3× this week"
    """

    class CorrelationType(models.TextChoices):
        BOTTLENECK_TO_CHECK_FAIL = 'BOTTLENECK_TO_CHECK_FAIL', 'Bottleneck → Check Failure'
        MOOD_TO_CHECK_FAIL = 'MOOD_TO_CHECK_FAIL', 'Mood Decline → Check Failure'
        CONFIDENCE_TO_CHECK_FAIL = 'CONFIDENCE_TO_CHECK_FAIL', 'Low Confidence → Check Failure'

    class Strength(models.TextChoices):
        WEAK = 'WEAK', 'Weak'
        MODERATE = 'MODERATE', 'Moderate'
        STRONG = 'STRONG', 'Strong'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pulse = models.ForeignKey(
        EmployeeVoicePulse,
        on_delete=models.CASCADE,
        related_name='correlations'
    )

    # Correlation details
    correlation_type = models.CharField(
        max_length=50,
        choices=CorrelationType.choices
    )
    strength = models.CharField(
        max_length=20,
        choices=Strength.choices,
        default=Strength.MODERATE
    )

    # Voice data (pulse side)
    bottleneck_type = models.CharField(
        max_length=20,
        blank=True,
        help_text="Which bottleneck is trending"
    )
    avg_mood_score = models.FloatField(null=True, blank=True)
    avg_confidence_score = models.FloatField(null=True, blank=True)

    # Check data (micro-check side)
    check_category = models.CharField(
        max_length=20,
        blank=True,
        help_text="Category of micro-checks that are failing"
    )
    check_fail_rate = models.FloatField(
        null=True,
        blank=True,
        help_text="Percentage of checks failing in this category"
    )

    # Recommendation
    recommendation_text = models.TextField(
        help_text="Actionable recommendation based on correlation"
    )
    is_actionable = models.BooleanField(
        default=True,
        help_text="Can this correlation trigger automated actions?"
    )

    # Auto-created action item (if auto-fix enabled)
    action_item = models.ForeignKey(
        'inspections.ActionItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='voice_correlations',
        help_text="Auto-generated action item from this correlation"
    )

    # Time range
    time_window_start = models.DateTimeField()
    time_window_end = models.DateTimeField()

    # Metadata
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employee_voice_correlations'
        indexes = [
            models.Index(fields=['pulse', 'correlation_type']),
            models.Index(fields=['bottleneck_type', 'created_at']),
            models.Index(fields=['is_resolved', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_correlation_type_display()} - {self.pulse.store.name} ({self.get_strength_display()})"

    @classmethod
    def create_from_bottleneck(cls, pulse, bottleneck_type, mention_count):
        """
        Create a correlation record from bottleneck mentions.
        Used by correlation detection to identify patterns and recommend actions.
        """
        from datetime import timedelta
        from django.utils import timezone

        time_window_end = timezone.now()
        time_window_start = time_window_end - timedelta(days=7)

        # Map bottleneck to check category
        bottleneck_to_category = {
            EmployeeVoiceResponse.Bottleneck.EQUIPMENT: 'EQUIPMENT',
            EmployeeVoiceResponse.Bottleneck.STAFFING: 'STAFFING',
            EmployeeVoiceResponse.Bottleneck.TRAINING: 'TRAINING',
            EmployeeVoiceResponse.Bottleneck.SUPPLIES: 'SUPPLY_CHAIN',
            EmployeeVoiceResponse.Bottleneck.COMMUNICATION: 'PROCEDURES',
            EmployeeVoiceResponse.Bottleneck.PROCESSES: 'PROCEDURES',
        }

        check_category = bottleneck_to_category.get(bottleneck_type, 'PROCEDURES')

        # Generate recommendation text
        recommendation_text = (
            f"{bottleneck_type.replace('_', ' ').title()} bottleneck mentioned {mention_count}× in past 7 days. "
            f"Recommend: Run {check_category} micro-checks 3× this week."
        )

        # Determine strength based on mention count
        if mention_count >= 5:
            strength = cls.Strength.STRONG
        elif mention_count >= 3:
            strength = cls.Strength.MODERATE
        else:
            strength = cls.Strength.WEAK

        correlation = cls.objects.create(
            pulse=pulse,
            correlation_type=cls.CorrelationType.BOTTLENECK_TO_CHECK_FAIL,
            strength=strength,
            bottleneck_type=bottleneck_type,
            check_category=check_category,
            recommendation_text=recommendation_text,
            is_actionable=True,
            time_window_start=time_window_start,
            time_window_end=time_window_end
        )

        return correlation
