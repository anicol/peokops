from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


class Account(models.Model):
    """Franchisee/Operator account - primary tenant for multi-brand support

    Enables multiple franchisees to operate under the same brand,
    each with their own stores, users, and integrations (e.g., 7shifts).
    """

    name = models.CharField(max_length=200, help_text="Franchisee/operator name (e.g., 'John's Franchise Group')")
    brand = models.ForeignKey('brands.Brand', on_delete=models.PROTECT, related_name='accounts',
                              help_text="Parent brand this account operates under")
    owner = models.ForeignKey('User', on_delete=models.PROTECT, related_name='owned_accounts',
                              help_text="Primary account owner (franchisee)")

    # Contact and billing info
    company_name = models.CharField(max_length=200, blank=True, help_text="Legal company name")
    billing_email = models.EmailField(blank=True, help_text="Email for billing and invoices")
    phone = models.CharField(max_length=20, blank=True)

    # Status
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts'
        ordering = ['brand__name', 'name']
        indexes = [
            models.Index(fields=['brand', 'is_active']),
        ]

    def __str__(self):
        return f"{self.brand.name} - {self.name}"


class MicroCheckDeliveryConfig(models.Model):
    """Configuration for how micro-checks are delivered to an account

    Controls cadence, recipients, and randomization of micro-check delivery.
    """

    class RecipientType(models.TextChoices):
        MANAGERS_ONLY = 'MANAGERS_ONLY', 'Managers Only'
        ALL_EMPLOYEES = 'ALL_EMPLOYEES', 'All Employees'

    class CadenceMode(models.TextChoices):
        DAILY = 'DAILY', 'Daily'
        RANDOMIZED = 'RANDOMIZED', 'Randomized Schedule'

    account = models.OneToOneField(
        Account,
        on_delete=models.CASCADE,
        related_name='micro_check_delivery_config',
        help_text="Account this configuration belongs to"
    )

    # Distribution control
    distribution_enabled = models.BooleanField(
        default=True,
        help_text="Enable or disable micro-check distribution system-wide"
    )

    # Recipient configuration
    send_to_recipients = models.CharField(
        max_length=20,
        choices=RecipientType.choices,
        default=RecipientType.MANAGERS_ONLY,
        help_text="Who should receive micro-checks"
    )

    # Cadence configuration
    cadence_mode = models.CharField(
        max_length=20,
        choices=CadenceMode.choices,
        default=CadenceMode.DAILY,
        help_text="How often to send micro-checks"
    )

    # Randomization settings (for RANDOMIZED mode)
    min_day_gap = models.PositiveSmallIntegerField(
        default=1,
        help_text="Minimum days between micro-checks (1-7)"
    )
    max_day_gap = models.PositiveSmallIntegerField(
        default=3,
        help_text="Maximum days between micro-checks (1-7)"
    )

    # Recipient sampling
    randomize_recipients = models.BooleanField(
        default=False,
        help_text="Randomly select a percentage of eligible recipients"
    )
    recipient_percentage = models.PositiveSmallIntegerField(
        default=100,
        help_text="Percentage of eligible recipients to send to (1-100)"
    )

    # Tracking for randomized scheduling
    last_sent_date = models.DateField(
        null=True,
        blank=True,
        help_text="Last date a micro-check was sent (for calculating next send)"
    )
    next_send_date = models.DateField(
        null=True,
        blank=True,
        help_text="Next scheduled send date (calculated for randomized mode)"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'micro_check_delivery_configs'
        verbose_name = 'Micro-Check Delivery Configuration'
        verbose_name_plural = 'Micro-Check Delivery Configurations'

    def __str__(self):
        return f"Delivery Config for {self.account.name}"


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'  # System-wide authority
        ADMIN = 'ADMIN', 'Admin'  # Brand-level authority
        OWNER = 'OWNER', 'Owner'  # Regional/Franchisee
        GM = 'GM', 'Manager'  # Store manager
        INSPECTOR = 'INSPECTOR', 'Inspector'  # Store inspector
        EMPLOYEE = 'EMPLOYEE', 'Employee'  # Store employee (servers, cooks, hosts, etc.)
        TRIAL_ADMIN = 'TRIAL_ADMIN', 'Trial Admin'  # Trial user admin

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, null=True, blank=True,
                                related_name='users', help_text="Franchisee account this user belongs to")
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Trial functionality
    is_trial_user = models.BooleanField(default=False)
    trial_expires_at = models.DateTimeField(null=True, blank=True)
    trial_videos_used = models.IntegerField(default=0, help_text="Number of videos uploaded in trial")
    trial_stores_used = models.IntegerField(default=0, help_text="Number of stores created in trial") 
    trial_reports_downloaded = models.IntegerField(default=0, help_text="Number of reports downloaded in trial")
    
    # Engagement tracking
    email_verified_at = models.DateTimeField(null=True, blank=True)
    first_video_at = models.DateTimeField(null=True, blank=True)
    first_ai_analysis_at = models.DateTimeField(null=True, blank=True)
    first_team_invite_at = models.DateTimeField(null=True, blank=True)
    last_active_at = models.DateTimeField(auto_now=True)
    
    # Conversion tracking
    trial_conversion_score = models.IntegerField(default=0, help_text="Predictive score for trial to paid conversion")
    referral_code = models.CharField(max_length=10, unique=True, null=True, blank=True)
    referred_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Demo experience tracking
    has_seen_demo = models.BooleanField(default=False, help_text="Whether user has viewed the interactive demo")
    requested_demo = models.BooleanField(default=False, help_text="User explicitly requested to see demo")
    demo_completed_at = models.DateTimeField(null=True, blank=True, help_text="When user completed the demo")

    # Onboarding tracking
    onboarding_completed_at = models.DateTimeField(null=True, blank=True, help_text="When user completed onboarding flow")

    # Password tracking
    password_set_by_user_at = models.DateTimeField(null=True, blank=True, help_text="When user first set their own password (vs admin-assigned)")

    # Micro-check scheduling (per-employee randomization)
    micro_check_last_sent_date = models.DateField(null=True, blank=True, help_text="Last date this employee received a micro-check")
    micro_check_next_send_date = models.DateField(null=True, blank=True, help_text="Next scheduled date for this employee's micro-check")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username

    @property
    def is_super_admin(self):
        """Check if user has super admin privileges"""
        return self.role == self.Role.SUPER_ADMIN

    @property
    def is_trial_expired(self):
        """Check if trial has expired"""
        if not self.is_trial_user or not self.trial_expires_at:
            return False
        return timezone.now() > self.trial_expires_at
    
    @property
    def trial_days_remaining(self):
        """Get number of trial days remaining"""
        if not self.is_trial_user or not self.trial_expires_at:
            return 0
        delta = self.trial_expires_at - timezone.now()
        return max(0, delta.days)
    
    @property
    def trial_hours_remaining(self):
        """Get number of trial hours remaining (for urgency)"""
        if not self.is_trial_user or not self.trial_expires_at:
            return 0
        delta = self.trial_expires_at - timezone.now()
        return max(0, int(delta.total_seconds() / 3600))

    @property
    def accessible_stores_count(self):
        """Get number of stores this user has access to (for navigation mode detection)"""
        from brands.models import Store

        if self.role == self.Role.SUPER_ADMIN:
            # Super admins see all stores
            return Store.objects.filter(is_active=True).count()
        elif self.role == self.Role.ADMIN:
            # Brand admins see all stores in their brand
            if self.account and self.account.brand:
                return Store.objects.filter(brand=self.account.brand, is_active=True).count()
            return 0
        elif self.role == self.Role.OWNER:
            # Owners see stores in their account (franchisee)
            if self.account:
                return Store.objects.filter(account=self.account, is_active=True).count()
            return 0
        elif self.role == self.Role.GM:
            # GMs typically assigned to one store
            if self.store:
                return 1
            return 0
        elif self.role == self.Role.TRIAL_ADMIN:
            # Trial admins manage all stores in their account
            if self.account:
                return Store.objects.filter(account=self.account, is_active=True).count()
            return 0
        else:
            # Employees, Inspectors have no store count
            return 0

    def get_accessible_stores(self):
        """Get QuerySet of stores this user has access to"""
        from brands.models import Store

        if self.role == self.Role.SUPER_ADMIN:
            # Super admins see all stores
            return Store.objects.filter(is_active=True)
        elif self.role == self.Role.ADMIN:
            # Brand admins see all stores in their brand
            if self.account and self.account.brand:
                return Store.objects.filter(brand=self.account.brand, is_active=True)
            # Fallback: if no account but has store, use store's brand
            elif self.store and self.store.brand:
                return Store.objects.filter(brand=self.store.brand, is_active=True)
            return Store.objects.none()
        elif self.role == self.Role.OWNER:
            # Owners see all stores in their account (franchisee), regardless of user.store
            if self.account:
                return Store.objects.filter(account=self.account, is_active=True)
            return Store.objects.none()
        elif self.role == self.Role.TRIAL_ADMIN:
            # Trial admins see all stores in their account (like OWNER)
            # regardless of which store they're assigned to
            if self.account:
                return Store.objects.filter(account=self.account, is_active=True)
            return Store.objects.none()
        elif self.role in [self.Role.GM, self.Role.INSPECTOR, self.Role.EMPLOYEE]:
            # GMs, Inspectors, and Employees see only their assigned store
            if self.store:
                return Store.objects.filter(id=self.store.id, is_active=True)
            return Store.objects.none()
        else:
            return Store.objects.none()

    # Trial limitation checks
    def can_upload_video(self):
        """Check if user can upload more videos (max 10 for trial)"""
        if not self.is_trial_user:
            return True
        return self.trial_videos_used < 10
    
    def can_create_store(self):
        """Check if user can create more stores (max 5 for trial)"""
        if not self.is_trial_user:
            return True
        return self.trial_stores_used < 5
    
    def can_download_report(self):
        """Check if user can download more reports (max 2 for trial)"""
        if not self.is_trial_user:
            return True
        return self.trial_reports_downloaded < 2
    
    def can_access_team_features(self):
        """Team features require paid subscription"""
        return not self.is_trial_user
    
    def increment_trial_usage(self, usage_type):
        """Increment trial usage counters"""
        if not self.is_trial_user:
            return
            
        if usage_type == 'video':
            self.trial_videos_used += 1
            if self.trial_videos_used == 1:
                self.first_video_at = timezone.now()
        elif usage_type == 'store':
            self.trial_stores_used += 1
        elif usage_type == 'report':
            self.trial_reports_downloaded += 1
            
        # Update conversion score based on engagement
        self.update_conversion_score()
        self.save()
    
    def update_conversion_score(self):
        """Update predictive conversion score based on engagement"""
        score = 0
        
        # Engagement milestones (0-100 scale)
        if self.first_video_at:
            score += 20  # Uploaded first video
        if self.trial_videos_used >= 3:
            score += 15  # Multiple videos
        if self.trial_stores_used >= 2:
            score += 10  # Multiple locations
        if self.first_ai_analysis_at:
            score += 15  # Received AI feedback
        if self.trial_reports_downloaded >= 1:
            score += 10  # Downloaded report
        if self.first_team_invite_at:
            score += 20  # Team engagement
        if self.email_verified_at:
            score += 10  # Email verified
            
        # Recency bonus (active in last 24 hours)  
        if self.last_active_at and (timezone.now() - self.last_active_at).total_seconds() < 24 * 3600:
            score += 10
            
        self.trial_conversion_score = min(score, 100)
    
    @property 
    def hours_since_signup(self):
        """Hours since user signup for MVP demo logic"""
        if not self.created_at:
            return 0
        delta = timezone.now() - self.created_at
        return int(delta.total_seconds() / 3600)
    
    @property
    def total_inspections(self):
        """Total real inspections (not demo) completed by user"""
        from inspections.models import Inspection
        # Only count non-demo inspections
        return Inspection.objects.filter(
            created_by=self,
            status='COMPLETED'
        ).exclude(
            videos__is_demo=True
        ).count()
    
    def should_show_demo(self):
        """MVP Demo Experience Logic"""
        return (
            (self.is_trial_user and self.total_inspections < 3) or  # Trial users still exploring
            self.hours_since_signup < 48 or                          # Brand new users (including admins) 
            self.requested_demo                                       # Explicit click on "View Demo"
        )
    
    def get_trial_status(self):
        """Get comprehensive trial status"""
        if not self.is_trial_user:
            return {'is_trial': False}
            
        return {
            'is_trial': True,
            'expires_at': self.trial_expires_at,
            'days_remaining': self.trial_days_remaining,
            'hours_remaining': self.trial_hours_remaining,
            'is_expired': self.is_trial_expired,
            'videos_used': self.trial_videos_used,
            'videos_remaining': max(0, 10 - self.trial_videos_used),
            'stores_used': self.trial_stores_used,
            'stores_remaining': max(0, 5 - self.trial_stores_used),
            'reports_downloaded': self.trial_reports_downloaded,
            'reports_remaining': max(0, 2 - self.trial_reports_downloaded),
            'can_upload_video': self.can_upload_video(),
            'can_create_store': self.can_create_store(),
            'can_download_report': self.can_download_report(),
            'can_access_team_features': self.can_access_team_features(),
            'conversion_score': self.trial_conversion_score
        }


class UserBehaviorEvent(models.Model):
    """Track user behavioral events for smart nudges and analytics"""
    
    class EventType(models.TextChoices):
        # Demo events
        DEMO_STARTED = 'DEMO_STARTED', 'Demo Started'
        DEMO_COMPLETED = 'DEMO_COMPLETED', 'Demo Completed'
        DEMO_SKIPPED = 'DEMO_SKIPPED', 'Demo Skipped'

        # Upload events
        UPLOAD_INITIATED = 'UPLOAD_INITIATED', 'Upload Initiated'
        UPLOAD_COMPLETED = 'UPLOAD_COMPLETED', 'Upload Completed'
        UPLOAD_FAILED = 'UPLOAD_FAILED', 'Upload Failed'

        # Engagement events
        LOGIN = 'LOGIN', 'User Login'
        DASHBOARD_VIEW = 'DASHBOARD_VIEW', 'Dashboard Viewed'
        VIDEO_VIEW = 'VIDEO_VIEW', 'Video Viewed'
        INSPECTION_VIEW = 'INSPECTION_VIEW', 'Inspection Viewed'

        # Conversion events
        TRIAL_EXTENDED = 'TRIAL_EXTENDED', 'Trial Extended'
        UPGRADE_CLICKED = 'UPGRADE_CLICKED', 'Upgrade Button Clicked'
        BILLING_VIEW = 'BILLING_VIEW', 'Billing Page Viewed'

        # Churn risk events
        INACTIVITY_7_DAYS = 'INACTIVITY_7_DAYS', '7 Days Inactive'
        TRIAL_EXPIRY_WARNING = 'TRIAL_EXPIRY_WARNING', 'Trial Expiry Warning Shown'
        SESSION_TIMEOUT = 'SESSION_TIMEOUT', 'Session Timed Out'

        # Navigation events
        PAGE_VIEW = 'PAGE_VIEW', 'Page Viewed'
        FEATURE_ACCESSED = 'FEATURE_ACCESSED', 'Feature Accessed'
        TAB_SWITCHED = 'TAB_SWITCHED', 'Tab Switched'
        STORE_SWITCHED = 'STORE_SWITCHED', 'Store Switched'

        # Micro-Check events
        CHECK_CREATED = 'CHECK_CREATED', 'Check Created'
        CHECK_STARTED = 'CHECK_STARTED', 'Check Started'
        CHECK_COMPLETED = 'CHECK_COMPLETED', 'Check Completed'
        CHECK_SKIPPED = 'CHECK_SKIPPED', 'Check Skipped'
        CORRECTIVE_ACTION_CREATED = 'CORRECTIVE_ACTION_CREATED', 'Corrective Action Created'
        CORRECTIVE_ACTION_RESOLVED = 'CORRECTIVE_ACTION_RESOLVED', 'Corrective Action Resolved'

        # Employee Voice events
        PULSE_CREATED = 'PULSE_CREATED', 'Pulse Survey Created'
        PULSE_CONFIGURED = 'PULSE_CONFIGURED', 'Pulse Survey Configured'
        PULSE_PAUSED = 'PULSE_PAUSED', 'Pulse Survey Paused'
        PULSE_RESUMED = 'PULSE_RESUMED', 'Pulse Survey Resumed'
        INVITATION_SENT = 'INVITATION_SENT', 'Survey Invitation Sent'
        RESPONSE_VIEWED = 'RESPONSE_VIEWED', 'Survey Response Viewed'
        PULSE_ANALYTICS_VIEWED = 'PULSE_ANALYTICS_VIEWED', 'Pulse Analytics Viewed'

        # Template events
        TEMPLATE_VIEWED = 'TEMPLATE_VIEWED', 'Template Viewed'
        TEMPLATE_SELECTED = 'TEMPLATE_SELECTED', 'Template Selected'
        TEMPLATE_CUSTOMIZED = 'TEMPLATE_CUSTOMIZED', 'Template Customized'
        AI_GENERATION_USED = 'AI_GENERATION_USED', 'AI Generation Used'
        TEMPLATE_CREATED = 'TEMPLATE_CREATED', 'Custom Template Created'

        # Analytics events
        INSIGHTS_VIEWED = 'INSIGHTS_VIEWED', 'Insights Page Viewed'
        REPORT_FILTERED = 'REPORT_FILTERED', 'Report Filtered'
        DASHBOARD_ACCESSED = 'DASHBOARD_ACCESSED', 'Dashboard Accessed'
        EXPORT_CLICKED = 'EXPORT_CLICKED', 'Export Clicked'
        SEARCH_PERFORMED = 'SEARCH_PERFORMED', 'Search Performed'

        # Media events
        PHOTO_UPLOADED = 'PHOTO_UPLOADED', 'Photo Uploaded'
        VIDEO_UPLOADED = 'VIDEO_UPLOADED', 'Video Uploaded'
        MEDIA_VIEWED = 'MEDIA_VIEWED', 'Media Viewed'

        # Settings events
        SETTINGS_VIEWED = 'SETTINGS_VIEWED', 'Settings Viewed'
        SETTINGS_UPDATED = 'SETTINGS_UPDATED', 'Settings Updated'
        USER_INVITED = 'USER_INVITED', 'User Invited'
        INTEGRATION_CONFIGURED = 'INTEGRATION_CONFIGURED', 'Integration Configured'

    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='behavior_events')
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    metadata = models.JSONField(default=dict, help_text="Additional event context and data")
    timestamp = models.DateTimeField(auto_now_add=True)
    session_id = models.CharField(max_length=100, blank=True, null=True, help_text="Browser session identifier")
    
    class Meta:
        db_table = 'user_behavior_events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'event_type']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['event_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.event_type} at {self.timestamp}"

    @classmethod
    def track_event(cls, user, event_type, metadata=None, session_id=None):
        """Convenient method to track user behavioral events"""
        return cls.objects.create(
            user=user,
            event_type=event_type,
            metadata=metadata or {},
            session_id=session_id
        )


class SmartNudge(models.Model):
    """Smart nudges shown to users based on behavioral patterns"""
    
    class NudgeType(models.TextChoices):
        # Onboarding nudges
        UPLOAD_FIRST_VIDEO = 'UPLOAD_FIRST_VIDEO', 'Upload Your First Video'
        COMPLETE_DEMO = 'COMPLETE_DEMO', 'Complete the Demo'
        EXPLORE_FEATURES = 'EXPLORE_FEATURES', 'Explore More Features'
        
        # Engagement nudges
        RETURN_AFTER_UPLOAD = 'RETURN_AFTER_UPLOAD', 'Check Your Analysis Results'
        TRY_SECOND_VIDEO = 'TRY_SECOND_VIDEO', 'Upload Another Video'
        VIEW_DETAILED_REPORT = 'VIEW_DETAILED_REPORT', 'View Detailed Report'
        
        # Conversion nudges
        TRIAL_EXPIRING_SOON = 'TRIAL_EXPIRING_SOON', 'Trial Expiring Soon'
        UPGRADE_PROMPT = 'UPGRADE_PROMPT', 'Upgrade to Continue'
        FEATURE_LIMIT_REACHED = 'FEATURE_LIMIT_REACHED', 'Feature Limit Reached'
        
        # Re-engagement nudges
        INACTIVE_USER = 'INACTIVE_USER', 'We Miss You'
        UNFINISHED_UPLOAD = 'UNFINISHED_UPLOAD', 'Complete Your Upload'
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SHOWN = 'SHOWN', 'Shown'
        CLICKED = 'CLICKED', 'Clicked'
        DISMISSED = 'DISMISSED', 'Dismissed'
        EXPIRED = 'EXPIRED', 'Expired'
    
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='nudges')
    nudge_type = models.CharField(max_length=50, choices=NudgeType.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    cta_text = models.CharField(max_length=100, blank=True, help_text="Call to action button text")
    cta_url = models.CharField(max_length=500, blank=True, help_text="Call to action URL")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    priority = models.IntegerField(default=1, help_text="1=highest, 5=lowest priority")
    
    # Timing and conditions
    trigger_condition = models.JSONField(default=dict, help_text="Conditions that triggered this nudge")
    show_after = models.DateTimeField(help_text="Earliest time to show this nudge")
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When this nudge expires")
    
    # Tracking
    shown_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True) 
    dismissed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'smart_nudges'
        ordering = ['priority', '-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'show_after']),
            models.Index(fields=['nudge_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.nudge_type} ({self.status})"
    
    def mark_shown(self):
        """Mark nudge as shown to user"""
        self.status = self.Status.SHOWN
        self.shown_at = timezone.now()
        self.save()
    
    def mark_clicked(self):
        """Mark nudge as clicked by user"""
        self.status = self.Status.CLICKED
        self.clicked_at = timezone.now()
        self.save()
    
    def mark_dismissed(self):
        """Mark nudge as dismissed by user"""
        self.status = self.Status.DISMISSED  
        self.dismissed_at = timezone.now()
        self.save()
    
    @property
    def is_expired(self):
        """Check if nudge has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
    @classmethod
    def create_nudge(cls, user, nudge_type, title, message, cta_text="", cta_url="",
                     show_after=None, expires_at=None, priority=1, trigger_condition=None):
        """Convenient method to create smart nudges"""
        return cls.objects.create(
            user=user,
            nudge_type=nudge_type,
            title=title,
            message=message,
            cta_text=cta_text,
            cta_url=cta_url,
            show_after=show_after or timezone.now(),
            expires_at=expires_at,
            priority=priority,
            trigger_condition=trigger_condition or {}
        )


class ImpersonationSession(models.Model):
    """Track when super admins impersonate users for customer support"""

    super_admin = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='impersonation_sessions_as_admin',
        help_text="The super admin performing the impersonation"
    )
    impersonated_user = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='impersonation_sessions_as_target',
        help_text="The user being impersonated"
    )
    impersonated_account = models.ForeignKey(
        'Account',
        on_delete=models.CASCADE,
        related_name='impersonation_sessions',
        null=True,
        blank=True,
        help_text="The account being accessed (if applicable)"
    )

    # Session tracking
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True, help_text="When impersonation ended")

    # Audit info
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address of super admin")
    user_agent = models.TextField(blank=True, help_text="Browser user agent")
    notes = models.TextField(blank=True, help_text="Optional notes about why impersonation was needed")

    class Meta:
        db_table = 'impersonation_sessions'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['super_admin', 'started_at']),
            models.Index(fields=['impersonated_user', 'started_at']),
            models.Index(fields=['impersonated_account', 'started_at']),
        ]

    def __str__(self):
        return f"{self.super_admin.username} impersonating {self.impersonated_user.username} at {self.started_at}"

    @property
    def is_active(self):
        """Check if this impersonation session is still active"""
        return self.ended_at is None

    @property
    def duration(self):
        """Get duration of impersonation session"""
        if self.ended_at:
            return self.ended_at - self.started_at
        return timezone.now() - self.started_at

    def end_session(self):
        """Mark this impersonation session as ended"""
        if not self.ended_at:
            self.ended_at = timezone.now()
            self.save()


class PasswordlessLoginToken(models.Model):
    """Token for passwordless magic link login"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'passwordless_login_tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'expires_at']),
        ]

    def __str__(self):
        return f"Login token for {self.user.email} - {'used' if self.used_at else 'valid'}"

    @property
    def is_expired(self):
        """Check if token has expired"""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if token is valid (not used and not expired)"""
        return not self.used_at and not self.is_expired

    def mark_as_used(self):
        """Mark token as used"""
        self.used_at = timezone.now()
        self.save()

    @classmethod
    def generate_token(cls, user, expires_in_minutes=15):
        """Generate a new login token for user"""
        import secrets
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=expires_in_minutes)

        return cls.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )