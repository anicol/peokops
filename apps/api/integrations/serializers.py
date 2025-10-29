from rest_framework import serializers
from .models import (
    SevenShiftsConfig, SevenShiftsEmployee, SevenShiftsShift,
    SevenShiftsSyncLog, SevenShiftsLocationMapping
)


class SevenShiftsConfigSerializer(serializers.ModelSerializer):
    """Serializer for 7shifts configuration (hides encrypted token)"""

    access_token = serializers.CharField(write_only=True, required=False,
                                        help_text="7shifts API access token (write-only)")
    is_configured = serializers.SerializerMethodField()
    last_sync_status = serializers.SerializerMethodField()

    class Meta:
        model = SevenShiftsConfig
        fields = ('id', 'account', 'company_id', 'is_active', 'last_sync_at',
                 'sync_employees_enabled', 'sync_shifts_enabled', 'enforce_shift_schedule',
                 'sync_role_names', 'create_users_without_email', 'created_at', 'updated_at',
                 'access_token', 'is_configured', 'last_sync_status')
        read_only_fields = ('id', 'created_at', 'updated_at', 'last_sync_at',
                           'is_configured', 'last_sync_status')

    def get_is_configured(self, obj):
        """Check if integration has valid credentials"""
        return bool(obj.access_token_encrypted)

    def get_last_sync_status(self, obj):
        """Get status of last sync operation"""
        last_log = obj.account.seven_shifts_sync_logs.first()  # Ordered by -started_at
        if not last_log:
            return None

        return {
            'sync_type': last_log.sync_type,
            'status': last_log.status,
            'items_synced': last_log.items_synced,
            'started_at': last_log.started_at,
            'completed_at': last_log.completed_at
        }


class SevenShiftsEmployeeSerializer(serializers.ModelSerializer):
    """Serializer for cached 7shifts employees"""

    store_name = serializers.CharField(source='store.name', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = SevenShiftsEmployee
        fields = ('id', 'account', 'store', 'store_name', 'seven_shifts_id',
                 'seven_shifts_location_id', 'email', 'phone', 'first_name',
                 'last_name', 'full_name', 'is_active', 'synced_at')
        read_only_fields = ('id', 'synced_at')

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class SevenShiftsShiftSerializer(serializers.ModelSerializer):
    """Serializer for cached 7shifts shifts"""

    employee_name = serializers.CharField(source='employee.first_name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)

    class Meta:
        model = SevenShiftsShift
        fields = ('id', 'employee', 'employee_name', 'employee_email', 'store',
                 'store_name', 'seven_shifts_shift_id', 'start_time', 'end_time',
                 'role', 'synced_at')
        read_only_fields = ('id', 'synced_at')


class SevenShiftsSyncLogSerializer(serializers.ModelSerializer):
    """Serializer for sync operation logs"""

    class Meta:
        model = SevenShiftsSyncLog
        fields = ('id', 'account', 'sync_type', 'status', 'items_synced',
                 'errors_count', 'error_details', 'started_at', 'completed_at',
                 'duration_seconds')
        read_only_fields = fields


class SevenShiftsConfigureRequestSerializer(serializers.Serializer):
    """Serializer for configuration request (create or update)"""

    access_token = serializers.CharField(required=False, write_only=True,
                                        help_text="7shifts API access token (optional for updates)")
    company_id = serializers.CharField(required=True,
                                      help_text="7shifts company ID")
    sync_employees_enabled = serializers.BooleanField(default=True)
    sync_shifts_enabled = serializers.BooleanField(default=True)
    enforce_shift_schedule = serializers.BooleanField(default=True)
    sync_role_names = serializers.ListField(
        child=serializers.CharField(),
        default=list,
        required=False,
        help_text="List of role names to sync (e.g., ['Server', 'Manager']). Empty means sync all roles."
    )
    create_users_without_email = serializers.BooleanField(
        default=True,
        help_text="Create user accounts for employees without email addresses using temporary emails"
    )


class SevenShiftsSyncRequestSerializer(serializers.Serializer):
    """Serializer for manual sync request"""

    sync_type = serializers.ChoiceField(
        choices=['employees', 'shifts', 'full'],
        default='full',
        help_text="Type of data to sync"
    )


class SevenShiftsLocationMappingSerializer(serializers.ModelSerializer):
    """Serializer for location mappings"""

    store_name = serializers.CharField(source='store.name', read_only=True)

    class Meta:
        model = SevenShiftsLocationMapping
        fields = ('id', 'account', 'seven_shifts_location_id', 'seven_shifts_location_name',
                 'store', 'store_name', 'created_at', 'updated_at')
        read_only_fields = ('id', 'account', 'created_at', 'updated_at')


class SevenShiftsLocationSerializer(serializers.Serializer):
    """Serializer for 7shifts locations (from API)"""

    id = serializers.CharField(help_text="7shifts location ID")
    name = serializers.CharField(help_text="Location name")
    is_mapped = serializers.BooleanField(default=False, help_text="Whether this location has a mapping")
    mapped_store_id = serializers.UUIDField(required=False, allow_null=True,
                                            help_text="PeakOps store ID if mapped")
    mapped_store_name = serializers.CharField(required=False, allow_null=True,
                                              help_text="PeakOps store name if mapped")


# ============================================================================
# Google Reviews Integration Serializers
# ============================================================================

class GoogleReviewsConfigSerializer(serializers.ModelSerializer):
    """Serializer for GoogleReviewsConfig model"""

    class Meta:
        model = None  # Will be imported to avoid circular import
        fields = [
            'id', 'account', 'is_active', 'google_account_id',
            'access_token_encrypted', 'refresh_token_encrypted', 'token_expires_at',
            'last_sync_at', 'sync_frequency', 'auto_generate_checks',
            'min_rating_for_analysis', 'min_reviews_for_check',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_sync_at']
        extra_kwargs = {
            'access_token_encrypted': {'write_only': True},
            'refresh_token_encrypted': {'write_only': True}
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Lazy import to avoid circular dependency
        from .models import GoogleReviewsConfig
        self.Meta.model = GoogleReviewsConfig


class GoogleLocationSerializer(serializers.ModelSerializer):
    """Serializer for GoogleLocation model"""

    review_count = serializers.SerializerMethodField()
    unread_review_count = serializers.SerializerMethodField()

    class Meta:
        model = None  # Will be imported to avoid circular import
        fields = [
            'id', 'account', 'google_location_id', 'google_location_name',
            'address', 'phone', 'website', 'average_rating', 'total_review_count',
            'is_active', 'last_sync_at', 'review_count', 'unread_review_count'
        ]
        read_only_fields = ['id', 'last_sync_at', 'review_count', 'unread_review_count']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Lazy import to avoid circular dependency
        from .models import GoogleLocation
        self.Meta.model = GoogleLocation

    def get_review_count(self, obj):
        """Get count of reviews stored locally"""
        return obj.reviews.count()

    def get_unread_review_count(self, obj):
        """Get count of unread reviews"""
        return obj.reviews.filter(read_at__isnull=True).count()


class GoogleReviewSerializer(serializers.ModelSerializer):
    """Serializer for GoogleReview model"""

    analysis = serializers.SerializerMethodField()

    class Meta:
        model = None  # Will be imported to avoid circular import
        fields = [
            'id', 'google_review_id', 'location', 'account', 'reviewer_name',
            'reviewer_profile_photo_url', 'rating', 'review_text', 'review_reply',
            'review_created_at', 'review_updated_at', 'reply_created_at',
            'source', 'is_verified', 'read_at', 'flagged', 'analyzed_at',
            'needs_analysis', 'analysis'
        ]
        read_only_fields = ['id', 'analyzed_at', 'analysis']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Lazy import to avoid circular dependency
        from .models import GoogleReview
        self.Meta.model = GoogleReview

    def get_analysis(self, obj):
        """Get AI analysis if available"""
        try:
            analysis = obj.analysis
            return {
                'topics': analysis.topics,
                'sentiment_score': analysis.sentiment_score,
                'actionable_issues': analysis.actionable_issues,
                'suggested_category': analysis.suggested_category,
                'confidence': analysis.confidence
            }
        except:
            return None


class GoogleReviewsOAuthRequestSerializer(serializers.Serializer):
    """Serializer for OAuth callback data"""

    code = serializers.CharField(required=True, help_text="OAuth authorization code")
    state = serializers.CharField(required=False, help_text="OAuth state parameter for CSRF protection")


class GoogleReviewsSyncRequestSerializer(serializers.Serializer):
    """Serializer for manual sync requests"""

    location_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Specific location ID to sync (if not provided, syncs all locations)"
    )
