import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import pytz


class MicroCheckTemplate(models.Model):
    """Base template for micro-check items"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Category alignment with Finding model
    from inspections.models import Finding
    category = models.CharField(max_length=20, choices=Finding.Category.choices, db_index=True)
    severity = models.CharField(max_length=20, choices=Finding.Severity.choices)

    # Template content
    title = models.CharField(max_length=200)
    description = models.TextField()
    success_criteria = models.TextField(help_text="What 'PASS' looks like")

    # Versioning for immutability
    version = models.IntegerField(default=1)
    parent_template = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL,
                                        related_name='child_templates')

    # Default requirements (overridden per RunItem)
    default_photo_required = models.BooleanField(default=False)
    default_video_required = models.BooleanField(default=False)
    expected_completion_seconds = models.IntegerField(default=30)

    # AI validation (future)
    ai_validation_enabled = models.BooleanField(default=False)
    ai_validation_prompt = models.TextField(blank=True)

    # Brand and ownership
    brand = models.ForeignKey('brands.Brand', on_delete=models.CASCADE, null=True, blank=True,
                              help_text="Brand that owns this template (null = global/system template)",
                              related_name='micro_check_templates')
    is_local = models.BooleanField(default=False,
                                   help_text="Local template (franchise-specific) vs global (brand-wide)")

    # Selection logic
    include_in_rotation = models.BooleanField(default=True,
                                             help_text="Include in daily auto-rotation")
    rotation_priority = models.IntegerField(default=50,
                                           help_text="Priority for selection (0-100, higher = more likely)")

    # Visual reference
    visual_reference_image = models.ImageField(upload_to='micro_checks/references/',
                                              blank=True, null=True,
                                              help_text="Optional reference image showing 'what good looks like'")

    is_active = models.BooleanField(default=True)

    # Auditing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_micro_check_templates')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True,
                                   related_name='updated_micro_check_templates')

    class Meta:
        db_table = 'micro_check_templates'
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['version', 'parent_template']),
        ]

    def __str__(self):
        return f"{self.get_category_display()} - {self.title} (v{self.version})"


class MicroCheckRun(models.Model):
    """Groups 3 micro-check items for a store/date"""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        EXPIRED = 'EXPIRED', 'Expired'

    class CreatedVia(models.TextChoices):
        SMS = 'SMS', 'SMS'
        EMAIL = 'EMAIL', 'Email'
        PUSH = 'PUSH', 'Push Notification'
        WHATSAPP = 'WHATSAPP', 'WhatsApp'
        MANUAL = 'MANUAL', 'Manual'

    class DayPart(models.TextChoices):
        MORNING = 'MORNING', 'Morning (6am-12pm)'
        AFTERNOON = 'AFTERNOON', 'Afternoon (12pm-6pm)'
        EVENING = 'EVENING', 'Evening (6pm-12am)'
        ANY = 'ANY', 'Any Time'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE, db_index=True,
                              related_name='micro_check_runs')

    # Timezone-aware scheduling (allow multiple runs per day)
    scheduled_for = models.DateField(help_text="Date in store's local timezone")
    daypart = models.CharField(max_length=20, choices=DayPart.choices, default=DayPart.ANY)
    sequence = models.PositiveSmallIntegerField(default=1, help_text="Run number for this day")
    store_timezone = models.CharField(max_length=50)

    created_via = models.CharField(max_length=20, choices=CreatedVia.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Completion tracking
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                     on_delete=models.SET_NULL,
                                     related_name='completed_micro_check_runs')

    # Retention (Coaching vs Enterprise)
    retention_policy = models.CharField(max_length=20,
                                       choices=[('COACHING', 'Coaching'), ('ENTERPRISE', 'Enterprise')],
                                       default='COACHING')
    retain_until = models.DateTimeField(null=True, blank=True,
                                       help_text="Auto-calculated based on mode")

    # Auditing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_micro_check_runs')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True,
                                   related_name='updated_micro_check_runs')

    class Meta:
        db_table = 'micro_check_runs'
        unique_together = [('store', 'scheduled_for', 'sequence')]
        indexes = [
            models.Index(fields=['store', 'scheduled_for', 'status']),
            models.Index(fields=['store', 'status', 'scheduled_for']),
            models.Index(fields=['status', 'scheduled_for']),
            models.Index(fields=['retain_until']),
        ]

    def __str__(self):
        return f"{self.store} - {self.scheduled_for} (#{self.sequence})"


class MicroCheckRunItem(models.Model):
    """Individual check item within a run (1 of 3)"""

    class PhotoRequiredReason(models.TextChoices):
        FIRST_CHECK_OF_WEEK = 'FIRST_CHECK_OF_WEEK', 'First Check of Week'
        CRITICAL_CATEGORY = 'CRITICAL_CATEGORY', 'Critical Category'
        PRIOR_FAIL = 'PRIOR_FAIL', 'Prior Failure'
        RANDOM_AUDIT = 'RANDOM_AUDIT', 'Random Audit'
        ALWAYS = 'ALWAYS', 'Always Required'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(MicroCheckRun, on_delete=models.CASCADE, related_name='items')
    template = models.ForeignKey(MicroCheckTemplate, on_delete=models.PROTECT)

    order = models.PositiveSmallIntegerField(help_text="1, 2, or 3")

    # Per-item requirements (can override template defaults)
    photo_required = models.BooleanField(default=False)
    photo_required_reason = models.CharField(max_length=30, choices=PhotoRequiredReason.choices,
                                             blank=True)
    video_required = models.BooleanField(default=False)

    # Immutable snapshot of template at creation
    template_version = models.IntegerField()
    title_snapshot = models.CharField(max_length=200)
    success_criteria_snapshot = models.TextField()
    from inspections.models import Finding
    category_snapshot = models.CharField(max_length=20, choices=Finding.Category.choices)
    severity_snapshot = models.CharField(max_length=20, choices=Finding.Severity.choices)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'micro_check_run_items'
        unique_together = [('run', 'order'), ('run', 'template')]
        indexes = [
            models.Index(fields=['run', 'order']),
        ]

    def __str__(self):
        return f"{self.run} - #{self.order}: {self.title_snapshot}"


class MicroCheckAssignment(models.Model):
    """Magic link delivery instance for a run"""

    class Purpose(models.TextChoices):
        RUN_ACCESS = 'RUN_ACCESS', 'Run Access'
        REMINDER = 'REMINDER', 'Reminder'

    class SentVia(models.TextChoices):
        SMS = 'SMS', 'SMS'
        EMAIL = 'EMAIL', 'Email'
        PUSH = 'PUSH', 'Push Notification'
        WHATSAPP = 'WHATSAPP', 'WhatsApp'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(MicroCheckRun, on_delete=models.CASCADE, related_name='assignments')
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE, db_index=True)

    sent_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name='micro_check_assignments')

    # Magic link security (hash stored, not raw token)
    access_token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    token_expires_at = models.DateTimeField()
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.RUN_ACCESS)
    scope = models.JSONField(default=dict, help_text="Token scope: {run_id, store_id}")

    # Token rotation
    rotated_from = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL,
                                     related_name='rotated_to')

    # Usage tracking
    max_uses = models.IntegerField(default=1)
    use_count = models.IntegerField(default=0)
    first_used_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    ip_last_used = models.GenericIPAddressField(null=True, blank=True)
    user_agent_last_used = models.TextField(blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    # Delivery tracking
    sent_via = models.CharField(max_length=20, choices=SentVia.choices)
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)

    # Team completion
    claimed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL,
                                   related_name='claimed_micro_check_assignments')
    claimed_at = models.DateTimeField(null=True, blank=True)

    # Retention
    retention_policy = models.CharField(max_length=20,
                                       choices=[('COACHING', 'Coaching'), ('ENTERPRISE', 'Enterprise')],
                                       default='COACHING')
    retain_until = models.DateTimeField(null=True, blank=True)

    # Auditing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_micro_check_assignments')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True,
                                   related_name='updated_micro_check_assignments')

    class Meta:
        db_table = 'micro_check_assignments'
        indexes = [
            models.Index(fields=['access_token_hash']),
            models.Index(fields=['run', 'sent_to']),
            models.Index(fields=['sent_to', 'sent_at']),
            models.Index(fields=['store', 'sent_at']),
        ]

    def __str__(self):
        return f"{self.run} → {self.sent_to} via {self.sent_via}"


class MediaAsset(models.Model):
    """Centralized media handling with retention policies"""

    class Kind(models.TextChoices):
        IMAGE = 'IMAGE', 'Image'
        VIDEO = 'VIDEO', 'Video'

    class RetentionPolicy(models.TextChoices):
        COACHING_7D = 'COACHING_7D', 'Coaching 7 Days'
        ENTERPRISE_90D = 'ENTERPRISE_90D', 'Enterprise 90 Days'
        ENTERPRISE_365D = 'ENTERPRISE_365D', 'Enterprise 1 Year'
        PERMANENT = 'PERMANENT', 'Permanent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE, db_index=True)

    kind = models.CharField(max_length=10, choices=Kind.choices)
    s3_key = models.CharField(max_length=512, unique=True)
    s3_bucket = models.CharField(max_length=100)

    # Integrity & dedup
    sha256 = models.CharField(max_length=64, db_index=True)
    bytes = models.IntegerField()

    # Metadata
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True, help_text="For video")

    # Privacy
    blurred = models.BooleanField(default=False, help_text="Face/brand blur applied")

    # Retention
    retention_policy = models.CharField(max_length=20, choices=RetentionPolicy.choices,
                                       default=RetentionPolicy.COACHING_7D)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Auditing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_media_assets')

    class Meta:
        db_table = 'media_assets'
        indexes = [
            models.Index(fields=['store', 'created_at']),
            models.Index(fields=['sha256']),
            models.Index(fields=['retention_policy', 'expires_at']),
        ]

    def __str__(self):
        return f"{self.kind} - {self.s3_key}"


class MicroCheckResponse(models.Model):
    """Manager's response to a specific check item"""

    class Status(models.TextChoices):
        PASS = 'PASS', 'Pass'
        FAIL = 'FAIL', 'Fail'
        NEEDS_ATTENTION = 'NEEDS_ATTENTION', 'Needs Attention'
        UNCERTAIN = 'UNCERTAIN', 'Uncertain'
        SKIPPED = 'SKIPPED', 'Skipped'

    class SkipReason(models.TextChoices):
        AREA_CLOSED = 'AREA_CLOSED', 'Area Closed'
        IN_USE = 'IN_USE', 'In Use'
        NO_SUPPLIES = 'NO_SUPPLIES', 'No Supplies'
        EQUIPMENT_DOWN = 'EQUIPMENT_DOWN', 'Equipment Down'
        STAFF_UNAVAILABLE = 'STAFF_UNAVAILABLE', 'Staff Unavailable'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to RunItem (primary), template for convenience
    run_item = models.ForeignKey(MicroCheckRunItem, on_delete=models.CASCADE,
                                 related_name='responses')
    run = models.ForeignKey(MicroCheckRun, on_delete=models.CASCADE, related_name='responses')
    assignment = models.ForeignKey(MicroCheckAssignment, on_delete=models.CASCADE,
                                   related_name='responses')
    template = models.ForeignKey(MicroCheckTemplate, on_delete=models.CASCADE)

    # Denormalized for fast reporting (no joins)
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE, db_index=True)
    from inspections.models import Finding
    category = models.CharField(max_length=20, choices=Finding.Category.choices, db_index=True)
    severity_snapshot = models.CharField(max_length=20, choices=Finding.Severity.choices)

    # Response data
    status = models.CharField(max_length=20, choices=Status.choices, db_index=True)
    notes = models.TextField(blank=True)

    # Skip tracking
    skip_reason = models.CharField(max_length=30, choices=SkipReason.choices, blank=True)
    skip_reason_detail = models.TextField(blank=True)

    # Media
    media = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL,
                             related_name='responses')

    # AI validation (future)
    ai_confidence = models.FloatField(null=True, blank=True)
    ai_validated = models.BooleanField(default=False)
    ai_model_version = models.CharField(max_length=50, blank=True)
    ai_inference_ms = models.IntegerField(null=True, blank=True, help_text="AI latency in ms")
    rule_version = models.CharField(max_length=50, blank=True)

    # Override tracking
    overridden_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                      on_delete=models.SET_NULL,
                                      related_name='micro_check_response_overrides')
    overridden_at = models.DateTimeField(null=True, blank=True)
    override_reason = models.TextField(blank=True)
    original_status = models.CharField(max_length=20, blank=True)
    original_ai_confidence = models.FloatField(null=True, blank=True)

    # Timing
    completion_seconds = models.IntegerField(null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                     on_delete=models.SET_NULL,
                                     related_name='completed_micro_check_responses',
                                     help_text="Nullable for no-login flows")
    completed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    local_completed_date = models.DateField(help_text="Date in store TZ for streak queries")

    # Retention
    retention_policy = models.CharField(max_length=20,
                                       choices=[('COACHING', 'Coaching'), ('ENTERPRISE', 'Enterprise')],
                                       default='COACHING')
    retain_until = models.DateTimeField(null=True, blank=True)

    # Auditing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_micro_check_responses')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True,
                                   related_name='updated_micro_check_responses')

    class Meta:
        db_table = 'micro_check_responses'
        unique_together = [('run', 'template')]  # One response per template per run
        indexes = [
            models.Index(fields=['store', 'completed_at']),
            models.Index(fields=['store', 'category', 'status', 'completed_at']),
            models.Index(fields=['category', 'status', 'completed_at']),
            models.Index(fields=['store', 'status']),
            models.Index(fields=['completed_by', 'completed_at']),
            models.Index(fields=['store', 'local_completed_date']),  # For streaks
            models.Index(fields=['retention_policy', 'retain_until']),
        ]
        constraints = [
            # Skipped => must have skip_reason
            models.CheckConstraint(
                name='skipped_has_reason',
                check=~models.Q(status='SKIPPED') | ~models.Q(skip_reason='')
            ),
        ]

    def save(self, *args, **kwargs):
        # Auto-set store from run for consistency
        if not self.store_id:
            self.store = self.run.store

        # Auto-set local_completed_date
        if not self.local_completed_date:
            tz = pytz.timezone(self.run.store_timezone)
            local_dt = self.completed_at.astimezone(tz) if self.completed_at.tzinfo else timezone.now().astimezone(tz)
            self.local_completed_date = local_dt.date()

        # Auto-calculate retention
        if not self.retain_until:
            if self.retention_policy == 'COACHING':
                self.retain_until = timezone.now() + timedelta(days=7)
            else:
                self.retain_until = timezone.now() + timedelta(days=365)

        super().save(*args, **kwargs)

        # Auto-create CorrectiveAction for failures (idempotent check via try/except)
        if self.status in ['FAIL', 'NEEDS_ATTENTION']:
            try:
                # Check if corrective action already exists via reverse OneToOneField
                _ = self.corrective_action
            except CorrectiveAction.DoesNotExist:
                # Import here to avoid circular dependency
                from .utils import create_corrective_action_for_failure
                create_corrective_action_for_failure(self)

    def __str__(self):
        return f"{self.run} - {self.template.title} - {self.status}"


class CheckCoverage(models.Model):
    """Track when each check item was last verified with visual evidence"""

    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE)
    template = models.ForeignKey(MicroCheckTemplate, on_delete=models.CASCADE)

    last_visual_verified_at = models.DateTimeField()
    last_verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    last_visual_status = models.CharField(max_length=20,
                                         choices=MicroCheckResponse.Status.choices)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'check_coverage'
        unique_together = [('store', 'template')]
        indexes = [
            models.Index(fields=['store', 'last_visual_verified_at']),
        ]

    def __str__(self):
        return f"{self.store} - {self.template}"


class MicroCheckStreak(models.Model):
    """Track user completion streaks per store"""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE)

    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    total_completions = models.IntegerField(default=0)

    last_completion_date = models.DateField(null=True, blank=True,
                                            help_text="Date in store TZ")

    badges = models.JSONField(default=list, help_text="Array of earned badge IDs")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'micro_check_streaks'
        unique_together = [('user', 'store')]
        indexes = [
            models.Index(fields=['user', 'store']),
        ]

    def __str__(self):
        return f"{self.user} @ {self.store} - {self.current_streak} day streak"


class StoreStreak(models.Model):
    """Track store-level completion streaks (aggregate across all users)"""

    store = models.OneToOneField('brands.Store', on_delete=models.CASCADE, related_name='streak')

    current_streak = models.IntegerField(default=0, help_text="Days with at least one completed run")
    longest_streak = models.IntegerField(default=0)
    total_completions = models.IntegerField(default=0, help_text="Total runs completed")

    last_completion_date = models.DateField(null=True, blank=True,
                                            help_text="Date in store TZ of last completed run")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'store_streaks'
        indexes = [
            models.Index(fields=['store']),
        ]

    def __str__(self):
        return f"{self.store} - {self.current_streak} day streak"


class CorrectiveAction(models.Model):
    """Follow-through on failed check items"""

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        RESOLVED = 'RESOLVED', 'Resolved'
        VERIFIED = 'VERIFIED', 'Verified'
        DISMISSED = 'DISMISSED', 'Dismissed'

    class CreatedFrom(models.TextChoices):
        MICRO_CHECK = 'MICRO_CHECK', 'Micro Check'
        MANUAL = 'MANUAL', 'Manual'
        AI_DETECTED = 'AI_DETECTED', 'AI Detected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    response = models.OneToOneField(MicroCheckResponse, on_delete=models.CASCADE,
                                    related_name='corrective_action')

    # Denormalized for reporting
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE, db_index=True)
    from inspections.models import Finding
    category = models.CharField(max_length=20, choices=Finding.Category.choices, db_index=True)

    # Assignment & SLA
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                    on_delete=models.SET_NULL)
    due_at = models.DateTimeField(null=True, blank=True)

    # Before/After evidence
    before_media = models.ForeignKey(MediaAsset, null=True, blank=True,
                                     on_delete=models.SET_NULL, related_name='ca_before')
    after_media = models.ForeignKey(MediaAsset, null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name='ca_after')

    # Resolution
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                    on_delete=models.SET_NULL,
                                    related_name='resolved_corrective_actions')
    resolution_notes = models.TextField(blank=True)

    # Inline fix tracking
    fixed_during_session = models.BooleanField(default=False, help_text="Fixed immediately during check session")
    created_from = models.CharField(max_length=20, choices=CreatedFrom.choices, default=CreatedFrom.MICRO_CHECK)
    verified_at = models.DateTimeField(null=True, blank=True, help_text="When AI verified the fix")
    verification_confidence = models.FloatField(null=True, blank=True, help_text="AI confidence score 0-1")

    # Retention
    retention_policy = models.CharField(max_length=20,
                                       choices=[('COACHING', 'Coaching'), ('ENTERPRISE', 'Enterprise')],
                                       default='COACHING')
    retain_until = models.DateTimeField(null=True, blank=True)

    # Auditing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_corrective_actions')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True,
                                   related_name='updated_corrective_actions')

    class Meta:
        db_table = 'corrective_actions'
        indexes = [
            models.Index(fields=['store', 'status', 'due_at']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['retention_policy', 'retain_until']),
        ]

    def __str__(self):
        return f"CA: {self.response.template.title} ({self.status})"
