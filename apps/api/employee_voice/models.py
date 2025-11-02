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

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Multi-tenant relationships
    store = models.ForeignKey(
        'brands.Store',
        on_delete=models.CASCADE,
        related_name='employee_voice_pulses',
        help_text="Store this pulse belongs to"
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

    # Feature flags
    auto_fix_flow_enabled = models.BooleanField(
        default=False,
        help_text="Auto-create ActionItem when bottleneck mentioned ≥3× in 7 days"
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
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation {self.id} - {self.pulse.title} ({self.get_status_display()})"

    def is_valid(self):
        """Check if magic link is still valid"""
        return (
            self.status in [self.Status.PENDING, self.Status.SENT, self.Status.OPENED]
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
        VERY_BAD = 1, '😞 Very Bad'
        BAD = 2, '😕 Bad'
        NEUTRAL = 3, '😐 Neutral'
        GOOD = 4, '🙂 Good'
        VERY_GOOD = 5, '😊 Very Good'

    class Confidence(models.TextChoices):
        LOW = 'LOW', 'Could use more training'
        MEDIUM = 'MEDIUM', 'Mostly confident'
        HIGH = 'HIGH', 'Very confident'

    class Bottleneck(models.TextChoices):
        EQUIPMENT = 'EQUIPMENT', 'Equipment/Tools'
        STAFFING = 'STAFFING', 'Staffing/Scheduling'
        TRAINING = 'TRAINING', 'Training/Knowledge'
        SUPPLIES = 'SUPPLIES', 'Supplies/Inventory'
        COMMUNICATION = 'COMMUNICATION', 'Communication'
        PROCESSES = 'PROCESSES', 'Processes/Procedures'
        NONE = 'NONE', 'No bottlenecks'

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
    confidence = models.CharField(
        max_length=20,
        choices=Confidence.choices,
        help_text="How confident are you in your role today?"
    )
    bottleneck = models.CharField(
        max_length=20,
        choices=Bottleneck.choices,
        null=True,
        blank=True,
        help_text="Biggest bottleneck faced today (optional)"
    )
    comment = models.TextField(
        max_length=280,
        blank=True,
        help_text="Optional comment (80-280 chars, role-gated viewing)"
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
            models.Index(fields=['bottleneck', 'completed_at']),
        ]
        ordering = ['-completed_at']

    def __str__(self):
        return f"Response {self.id} - {self.pulse.title} (Mood: {self.get_mood_display()})"


class AutoFixFlowConfig(models.Model):
    """
    Configuration for automatic action item creation.
    When a bottleneck is mentioned ≥3× in 7 days, auto-create ActionItem.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pulse = models.OneToOneField(
        EmployeeVoicePulse,
        on_delete=models.CASCADE,
        related_name='auto_fix_config'
    )

    # Trigger thresholds
    bottleneck_threshold = models.IntegerField(
        default=3,
        help_text="Number of times bottleneck must be mentioned to trigger"
    )
    time_window_days = models.IntegerField(
        default=7,
        help_text="Time window for counting bottleneck mentions"
    )

    # Target mapping (bottleneck → corrective action category)
    bottleneck_to_category_map = models.JSONField(
        default=dict,
        help_text="Maps bottleneck types to micro-check categories for corrective actions"
    )

    # Feature flags
    is_enabled = models.BooleanField(default=True)
    notify_on_creation = models.BooleanField(
        default=True,
        help_text="Send notification when ActionItem is auto-created"
    )

    # Auditing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employee_voice_auto_fix_configs'

    def __str__(self):
        return f"AutoFix Config for {self.pulse.title}"

    def check_and_create_action_items(self):
        """
        Check if any bottleneck has crossed the threshold and create ActionItem.
        Called by Celery task after each response submission.
        """
        if not self.is_enabled:
            return

        from datetime import timedelta
        from django.utils import timezone
        from inspections.models import ActionItem

        time_window_start = timezone.now() - timedelta(days=self.time_window_days)

        # Count bottleneck mentions in time window
        bottleneck_counts = {}
        responses = EmployeeVoiceResponse.objects.filter(
            pulse=self.pulse,
            completed_at__gte=time_window_start,
            bottleneck__isnull=False
        ).exclude(bottleneck=EmployeeVoiceResponse.Bottleneck.NONE)

        for response in responses:
            bottleneck = response.bottleneck
            bottleneck_counts[bottleneck] = bottleneck_counts.get(bottleneck, 0) + 1

        # Create ActionItem for bottlenecks that cross threshold
        for bottleneck, count in bottleneck_counts.items():
            if count >= self.bottleneck_threshold:
                # Check if we already created an action for this bottleneck recently
                recent_correlation = CrossVoiceCorrelation.objects.filter(
                    pulse=self.pulse,
                    bottleneck_type=bottleneck,
                    created_at__gte=time_window_start,
                    action_item__isnull=False
                ).exists()

                if not recent_correlation:
                    # Create the action item
                    category = self.bottleneck_to_category_map.get(bottleneck)
                    if category:
                        # Create correlation record that will trigger ActionItem creation
                        CrossVoiceCorrelation.create_from_bottleneck(
                            pulse=self.pulse,
                            bottleneck_type=bottleneck,
                            mention_count=count
                        )


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
        Used by AutoFixFlowConfig to trigger corrective actions.
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
