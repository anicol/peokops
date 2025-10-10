from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'  # System-wide authority
        ADMIN = 'ADMIN', 'Admin'  # Brand-level authority
        OWNER = 'OWNER', 'Owner'  # Regional/Franchisee
        GM = 'GM', 'General Manager'  # Store manager
        INSPECTOR = 'INSPECTOR', 'Inspector'  # Store inspector
        TRIAL_ADMIN = 'TRIAL_ADMIN', 'Trial Admin'  # Trial user admin

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.INSPECTOR)
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