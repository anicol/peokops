import uuid
from django.db import models
from django.conf import settings


class SevenShiftsConfig(models.Model):
    """7shifts integration configuration per account (franchisee)

    Each franchisee account can have its own 7shifts integration,
    allowing them to sync employees and schedules independently.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.OneToOneField('accounts.Account', on_delete=models.CASCADE,
                                    related_name='seven_shifts_config',
                                    help_text="Franchisee account that owns this integration")

    # 7shifts API credentials
    access_token_encrypted = models.BinaryField(help_text="Encrypted 7shifts API access token")
    company_id = models.CharField(max_length=100, help_text="7shifts company ID")

    # Integration status
    is_active = models.BooleanField(default=True, help_text="Whether integration is enabled")
    last_sync_at = models.DateTimeField(null=True, blank=True, help_text="Last successful sync timestamp")

    # Sync configuration
    sync_employees_enabled = models.BooleanField(default=True,
                                                 help_text="Auto-sync employees from 7shifts")
    sync_shifts_enabled = models.BooleanField(default=True,
                                              help_text="Auto-sync shift schedules from 7shifts")

    # Only send micro-checks to employees on shift
    enforce_shift_schedule = models.BooleanField(default=True,
                                                 help_text="Only send checks when employee is on shift")

    # Role filtering
    sync_role_names = models.JSONField(
        default=list,
        blank=True,
        help_text="List of 7shifts role names to sync (e.g., ['Server', 'Manager']). Empty means sync all roles."
    )

    # User creation for employees without email
    create_users_without_email = models.BooleanField(
        default=True,
        help_text="Create user accounts for employees without email addresses using temporary emails"
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_seven_shifts_configs')

    class Meta:
        db_table = 'seven_shifts_configs'
        verbose_name = '7shifts Configuration'
        verbose_name_plural = '7shifts Configurations'

    def __str__(self):
        return f"7shifts Config for {self.account.name}"


class SevenShiftsEmployee(models.Model):
    """Cached employee data from 7shifts

    Synced periodically to match employees with PeakOps users
    and enable shift-based notification delivery.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='seven_shifts_employees',
                                help_text="Franchisee account")
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE, null=True, blank=True,
                             related_name='seven_shifts_employees',
                             help_text="Store this employee works at (mapped from location_id)")

    # Link to PeakOps user account
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                null=True, blank=True,
                                related_name='seven_shifts_employee',
                                help_text="Linked PeakOps user account")

    # 7shifts IDs
    seven_shifts_id = models.CharField(max_length=100, unique=True, db_index=True,
                                       help_text="7shifts user ID")
    seven_shifts_location_id = models.CharField(max_length=100, blank=True,
                                                help_text="7shifts location ID")

    # Employee info
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=20, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    # Status
    is_active = models.BooleanField(default=True, help_text="Employee is active in 7shifts")

    # Roles from 7shifts
    roles = models.JSONField(default=list, blank=True, help_text="List of role names from 7shifts")

    # Sync tracking
    synced_at = models.DateTimeField(auto_now=True, help_text="Last sync from 7shifts")

    class Meta:
        db_table = 'seven_shifts_employees'
        verbose_name = '7shifts Employee'
        verbose_name_plural = '7shifts Employees'
        indexes = [
            models.Index(fields=['account', 'is_active']),
            models.Index(fields=['store', 'is_active']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"


class SevenShiftsShift(models.Model):
    """Cached shift schedules from 7shifts

    Used to determine when employees are working so micro-checks
    are only sent during their shifts.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(SevenShiftsEmployee, on_delete=models.CASCADE,
                                 related_name='shifts', help_text="Employee assigned to this shift")
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='seven_shifts_shifts')
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE,
                             related_name='seven_shifts_shifts',
                             help_text="Store where shift takes place")

    # 7shifts shift data
    seven_shifts_shift_id = models.CharField(max_length=100, unique=True, db_index=True,
                                             help_text="7shifts shift ID")
    start_time = models.DateTimeField(db_index=True, help_text="Shift start time (UTC)")
    end_time = models.DateTimeField(db_index=True, help_text="Shift end time (UTC)")
    role = models.CharField(max_length=100, blank=True, help_text="Employee role for this shift")

    # Sync tracking
    synced_at = models.DateTimeField(auto_now=True, help_text="Last sync from 7shifts")

    class Meta:
        db_table = 'seven_shifts_shifts'
        verbose_name = '7shifts Shift'
        verbose_name_plural = '7shifts Shifts'
        indexes = [
            models.Index(fields=['store', 'start_time', 'end_time']),
            models.Index(fields=['employee', 'start_time']),
            models.Index(fields=['account', 'start_time']),
        ]
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.employee} @ {self.store.name} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"


class SevenShiftsSyncLog(models.Model):
    """Log of sync operations for debugging and monitoring"""

    class SyncType(models.TextChoices):
        EMPLOYEES = 'EMPLOYEES', 'Employees'
        SHIFTS = 'SHIFTS', 'Shifts'
        FULL = 'FULL', 'Full Sync'

    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        PARTIAL = 'PARTIAL', 'Partial Success'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='seven_shifts_sync_logs')
    sync_type = models.CharField(max_length=20, choices=SyncType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)

    # Sync results
    items_synced = models.IntegerField(default=0, help_text="Number of items successfully synced")
    errors_count = models.IntegerField(default=0, help_text="Number of errors encountered")
    error_details = models.JSONField(default=dict, blank=True,
                                    help_text="Details of any errors that occurred")

    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'seven_shifts_sync_logs'
        verbose_name = '7shifts Sync Log'
        verbose_name_plural = '7shifts Sync Logs'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['account', 'sync_type', '-started_at']),
        ]

    def __str__(self):
        return f"{self.sync_type} sync for {self.account.name} - {self.status}"


class SevenShiftsLocationMapping(models.Model):
    """Manual mapping between 7shifts locations and PeakOps stores

    Allows users to explicitly map 7shifts locations to stores
    when automatic name matching doesn't work.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='seven_shifts_location_mappings')

    # 7shifts location info
    seven_shifts_location_id = models.CharField(max_length=100, db_index=True,
                                                help_text="7shifts location ID")
    seven_shifts_location_name = models.CharField(max_length=200,
                                                  help_text="7shifts location name (for display)")

    # PeakOps store mapping
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE,
                             related_name='seven_shifts_location_mappings',
                             help_text="PeakOps store this location maps to")

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_seven_shifts_location_mappings')

    class Meta:
        db_table = 'seven_shifts_location_mappings'
        verbose_name = '7shifts Location Mapping'
        verbose_name_plural = '7shifts Location Mappings'
        unique_together = [('account', 'seven_shifts_location_id')]
        indexes = [
            models.Index(fields=['account', 'seven_shifts_location_id']),
        ]

    def __str__(self):
        return f"{self.seven_shifts_location_name} → {self.store.name}"


class GoogleReviewsConfig(models.Model):
    """Google Business Profile integration configuration per account

    Each account can connect their Google Business Profile to sync reviews
    and automatically generate micro-checks based on customer feedback.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.OneToOneField('accounts.Account', on_delete=models.CASCADE,
                                    related_name='google_reviews_config',
                                    help_text="Account that owns this integration")

    # Google OAuth credentials
    access_token_encrypted = models.BinaryField(help_text="Encrypted Google OAuth access token")
    refresh_token_encrypted = models.BinaryField(help_text="Encrypted Google OAuth refresh token")
    token_expires_at = models.DateTimeField(help_text="When the access token expires")

    # Google Business Profile info
    google_account_id = models.CharField(max_length=200, blank=True, default='',
                                         help_text="Google Business Profile account ID")

    # Integration status
    is_active = models.BooleanField(default=True, help_text="Whether integration is enabled")
    last_sync_at = models.DateTimeField(null=True, blank=True, help_text="Last successful review sync")

    # Sync configuration
    sync_frequency = models.CharField(
        max_length=20,
        choices=[('daily', 'Daily'), ('weekly', 'Weekly')],
        default='daily',
        help_text="How often to sync reviews"
    )

    # Analysis settings
    min_rating_for_analysis = models.IntegerField(
        default=3,
        help_text="Only analyze reviews with rating at or below this (1-5)"
    )
    auto_generate_checks = models.BooleanField(
        default=True,
        help_text="Automatically create micro-checks from review patterns"
    )
    min_reviews_for_check = models.IntegerField(
        default=3,
        help_text="Minimum similar reviews needed before generating a micro-check"
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_google_reviews_configs')

    class Meta:
        db_table = 'google_reviews_configs'
        verbose_name = 'Google Reviews Configuration'
        verbose_name_plural = 'Google Reviews Configurations'

    def __str__(self):
        return f"Google Reviews Config for {self.account.name}"


class GoogleLocation(models.Model):
    """Google Business Profile location mapped to a PeakOps store

    Each Google location corresponds to one physical store.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='google_locations')

    # Google Business Profile info
    google_location_id = models.CharField(max_length=200, unique=True, db_index=True,
                                         help_text="Google Business Profile location ID")
    google_location_name = models.CharField(max_length=200,
                                           help_text="Location name from Google")
    address = models.TextField(blank=True, help_text="Full address from Google")
    place_id = models.CharField(max_length=200, blank=True, db_index=True,
                                help_text="Google Places API place_id")
    place_url = models.URLField(max_length=500, blank=True,
                               help_text="Google Maps URL for this location")

    # PeakOps store mapping (OneToOne - each store has at most one Google location)
    store = models.OneToOneField('brands.Store', on_delete=models.CASCADE, null=True, blank=True,
                                 related_name='google_location',
                                 help_text="PeakOps store this location maps to")

    # Location metadata
    is_active = models.BooleanField(default=True, help_text="Location is active in Google")

    # Review stats
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True,
                                        help_text="Current average rating from Google")
    total_review_count = models.IntegerField(default=0, help_text="Total reviews on Google")

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    synced_at = models.DateTimeField(null=True, blank=True, help_text="Last sync from Google")

    class Meta:
        db_table = 'google_locations'
        verbose_name = 'Google Location'
        verbose_name_plural = 'Google Locations'
        indexes = [
            models.Index(fields=['account', 'is_active']),
            models.Index(fields=['store']),
        ]

    def __str__(self):
        if self.store:
            return f"{self.google_location_name} → {self.store.name}"
        return f"{self.google_location_name} (unmapped)"


class GoogleReview(models.Model):
    """Cached review data from Google Business Profile

    Reviews are synced periodically and analyzed by AI to identify
    recurring issues that should become micro-checks.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(GoogleLocation, on_delete=models.CASCADE,
                                 related_name='reviews')
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='google_reviews')

    # Google review data
    google_review_id = models.CharField(max_length=200, unique=True, db_index=True,
                                       help_text="Google review ID")
    reviewer_name = models.CharField(max_length=200, blank=True,
                                    help_text="Reviewer display name")
    rating = models.IntegerField(help_text="Star rating 1-5")
    review_text = models.TextField(blank=True, help_text="Review comment text")
    review_reply = models.TextField(blank=True, help_text="Business owner reply")

    # Timestamps
    review_created_at = models.DateTimeField(db_index=True,
                                            help_text="When review was posted on Google")
    synced_at = models.DateTimeField(auto_now=True, help_text="Last sync from Google")

    # Analysis flags
    needs_analysis = models.BooleanField(default=True, db_index=True,
                                        help_text="Review needs AI analysis")
    analyzed_at = models.DateTimeField(null=True, blank=True,
                                      help_text="When AI analysis was completed")

    # Source tracking (unified storage for scraped + OAuth)
    source = models.CharField(
        max_length=20,
        choices=[
            ('oauth', 'OAuth Sync'),
            ('scraped', 'Public Scrape')
        ],
        default='oauth',
        db_index=True,
        help_text="Where this review came from"
    )
    is_verified = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True if from authenticated OAuth, False if from public scrape"
    )

    class Meta:
        db_table = 'google_reviews'
        verbose_name = 'Google Review'
        verbose_name_plural = 'Google Reviews'
        ordering = ['-review_created_at']
        indexes = [
            models.Index(fields=['location', 'rating', '-review_created_at']),
            models.Index(fields=['account', '-review_created_at']),
            models.Index(fields=['needs_analysis', 'rating']),
            models.Index(fields=['source', 'is_verified']),
            models.Index(fields=['account', 'source', '-review_created_at']),
        ]

    def __str__(self):
        return f"{self.rating}★ at {self.location.google_location_name} - {self.review_created_at.strftime('%Y-%m-%d')}"


class GoogleReviewAnalysis(models.Model):
    """AI analysis results for a Google review

    Extracts topics, sentiment, and actionable insights from review text.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.OneToOneField(GoogleReview, on_delete=models.CASCADE,
                                  related_name='analysis')

    # AI-extracted data
    topics = models.JSONField(
        default=list,
        help_text="List of topics mentioned (e.g., ['cleanliness', 'service'])"
    )
    sentiment_score = models.FloatField(
        help_text="Sentiment score from -1.0 (very negative) to 1.0 (very positive)"
    )
    actionable_issues = models.JSONField(
        default=list,
        help_text="List of specific actionable problems identified"
    )
    suggested_category = models.CharField(
        max_length=100,
        blank=True,
        help_text="Suggested micro-check category (e.g., 'cleanliness', 'service')"
    )

    # AI model info
    model_used = models.CharField(max_length=100, help_text="AI model that performed analysis")
    confidence = models.FloatField(
        null=True,
        blank=True,
        help_text="Confidence score for analysis (0.0-1.0)"
    )

    # Processing metadata
    created_at = models.DateTimeField(auto_now_add=True)
    processing_time_ms = models.IntegerField(null=True, blank=True,
                                            help_text="Time taken to analyze (milliseconds)")

    class Meta:
        db_table = 'google_review_analyses'
        verbose_name = 'Google Review Analysis'
        verbose_name_plural = 'Google Review Analyses'
        indexes = [
            models.Index(fields=['suggested_category', '-created_at']),
        ]

    def __str__(self):
        return f"Analysis of {self.review}"


class ReviewSyncLog(models.Model):
    """Log of review sync operations for debugging and monitoring"""

    class SyncType(models.TextChoices):
        LOCATIONS = 'LOCATIONS', 'Locations'
        REVIEWS = 'REVIEWS', 'Reviews'
        FULL = 'FULL', 'Full Sync'

    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        PARTIAL = 'PARTIAL', 'Partial Success'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='review_sync_logs')
    sync_type = models.CharField(max_length=20, choices=SyncType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)

    # Sync results
    items_synced = models.IntegerField(default=0, help_text="Number of items successfully synced")
    errors_count = models.IntegerField(default=0, help_text="Number of errors encountered")
    error_details = models.JSONField(default=dict, blank=True,
                                    help_text="Details of any errors that occurred")

    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'review_sync_logs'
        verbose_name = 'Review Sync Log'
        verbose_name_plural = 'Review Sync Logs'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['account', 'sync_type', '-started_at']),
        ]

    def __str__(self):
        return f"{self.sync_type} sync for {self.account.name} - {self.status}"
