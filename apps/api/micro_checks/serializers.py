from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    MicroCheckTemplate,
    MicroCheckRun,
    MicroCheckRunItem,
    MicroCheckAssignment,
    MediaAsset,
    MicroCheckResponse,
    CheckCoverage,
    MicroCheckStreak,
    StoreStreak,
    CorrectiveAction
)

User = get_user_model()


class MicroCheckTemplateSerializer(serializers.ModelSerializer):
    """Template serializer with version tracking"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True, allow_null=True)
    store_name = serializers.CharField(source='store.name', read_only=True, allow_null=True)
    usage_stats = serializers.SerializerMethodField()

    def get_usage_stats(self, obj):
        """Calculate context-aware usage statistics for this template"""
        from django.db.models import Count, Q

        # Get viewing context from request
        request = self.context.get('request')
        store_id = request.query_params.get('store') if request else None
        account_id = request.query_params.get('account') if request else None

        # Build filter based on context
        responses = MicroCheckResponse.objects.filter(template=obj)

        if store_id:
            # Store context: show store-level stats
            responses = responses.filter(store_id=store_id)
            context = 'store'
        elif account_id:
            # Account context: aggregate across account's stores
            responses = responses.filter(store__account_id=account_id)
            context = 'account'
        else:
            # Brand context: aggregate across all stores in brand (if template has brand)
            if obj.brand:
                responses = responses.filter(store__brand=obj.brand)
            context = 'brand'

        total_count = responses.count()

        if total_count == 0:
            return {
                'times_used': 0,
                'pass_rate': None,
                'context': context
            }

        # Count passed responses
        passed_count = responses.filter(status='PASS').count()
        pass_rate = round((passed_count / total_count) * 100, 1) if total_count > 0 else None

        return {
            'times_used': total_count,
            'pass_rate': pass_rate,
            'context': context
        }

    class Meta:
        model = MicroCheckTemplate
        fields = [
            'id', 'brand', 'category', 'category_display', 'severity', 'severity_display',
            'title', 'description', 'success_criteria',
            'source',
            'level', 'level_display', 'account', 'account_name', 'store', 'store_name',
            'version', 'parent_template',
            'default_photo_required', 'default_video_required', 'expected_completion_seconds',
            'ai_validation_enabled', 'ai_validation_prompt',
            'is_local', 'include_in_rotation', 'rotation_priority',
            'visual_reference_image', 'is_active',
            'usage_stats',
            'created_at', 'created_by', 'created_by_name', 'updated_at', 'updated_by'
        ]
        read_only_fields = ['id', 'brand', 'version', 'parent_template', 'created_at', 'created_by', 'updated_at', 'updated_by']


class MicroCheckRunItemSerializer(serializers.ModelSerializer):
    """Individual check item within a run (1 of 3)"""
    template_title = serializers.CharField(source='template.title', read_only=True)
    template_description = serializers.CharField(source='template.description', read_only=True)
    template_reference_image = serializers.ImageField(source='template.visual_reference_image', read_only=True)
    photo_required_reason_display = serializers.CharField(source='get_photo_required_reason_display', read_only=True)

    class Meta:
        model = MicroCheckRunItem
        fields = [
            'id', 'run', 'template', 'template_title', 'template_description', 'template_reference_image', 'order',
            'photo_required', 'photo_required_reason', 'photo_required_reason_display',
            'template_version', 'title_snapshot', 'category_snapshot', 'severity_snapshot',
            'success_criteria_snapshot'
        ]
        read_only_fields = ['id']


class MicroCheckRunSerializer(serializers.ModelSerializer):
    """Run with nested items"""
    items = MicroCheckRunItemSerializer(many=True, read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    retention_policy_display = serializers.CharField(source='get_retention_policy_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    completed_by_name = serializers.CharField(source='completed_by.get_full_name', read_only=True, allow_null=True)
    completed_item_ids = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = MicroCheckRun
        fields = [
            'id', 'store', 'store_name', 'scheduled_for', 'sequence',
            'store_timezone', 'retention_policy', 'retention_policy_display',
            'retain_until', 'status', 'status_display', 'completed_at', 'completed_by', 'completed_by_name',
            'items', 'completed_item_ids', 'completed_count',
            'created_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']

    def get_completed_item_ids(self, obj):
        """Get list of run_item IDs that already have responses"""
        return list(
            MicroCheckResponse.objects.filter(run=obj)
            .values_list('run_item_id', flat=True)
        )

    def get_completed_count(self, obj):
        """Get count of completed items"""
        return MicroCheckResponse.objects.filter(run=obj).count()


class MicroCheckAssignmentSerializer(serializers.ModelSerializer):
    """Assignment with magic link token (hashed)"""
    run_details = MicroCheckRunSerializer(source='run', read_only=True)
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    manager_email = serializers.EmailField(source='manager.email', read_only=True)
    delivery_method_display = serializers.CharField(source='get_delivery_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MicroCheckAssignment
        fields = [
            'id', 'run', 'run_details', 'manager', 'manager_name', 'manager_email',
            'token_hash', 'delivery_method', 'delivery_method_display',
            'sent_at', 'first_accessed_at', 'completed_at', 'access_count',
            'last_access_ip', 'expires_at', 'status', 'status_display',
            'created_at', 'created_by', 'updated_at', 'updated_by'
        ]
        read_only_fields = [
            'id', 'token_hash', 'sent_at', 'first_accessed_at',
            'completed_at', 'access_count', 'last_access_ip',
            'created_at', 'created_by', 'updated_at', 'updated_by'
        ]


class MediaAssetSerializer(serializers.ModelSerializer):
    """Media asset with retention policy"""
    retention_policy_display = serializers.CharField(source='get_retention_policy_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = MediaAsset
        fields = [
            'id', 'store', 'kind', 's3_key', 's3_bucket', 'bytes',
            'sha256', 'width', 'height', 'retention_policy', 'retention_policy_display',
            'expires_at', 'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'sha256', 'created_at', 'created_by']


class MicroCheckResponseSerializer(serializers.ModelSerializer):
    """Response with denormalized fields for performance"""
    run_item_details = MicroCheckRunItemSerializer(source='run_item', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_snapshot_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    skip_reason_display = serializers.CharField(source='get_skip_reason_display', read_only=True)
    completed_by_name = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()

    def get_completed_by_name(self, obj):
        """Return display name for completed_by user, falling back to email/username"""
        if not obj.completed_by:
            return None
        full_name = obj.completed_by.get_full_name().strip()
        if full_name:
            return full_name
        if obj.completed_by.email:
            return obj.completed_by.email
        return obj.completed_by.username

    def get_media_url(self, obj):
        """Return presigned URL for media asset if it exists"""
        if not obj.media:
            return None

        import boto3
        from django.conf import settings

        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )

            # Generate presigned URL for GET operation (1 hour expiry)
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': obj.media.s3_bucket,
                    'Key': obj.media.s3_key,
                },
                ExpiresIn=3600
            )
            return url
        except Exception as e:
            # Log error and return None
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error generating presigned URL for media {obj.media.id}: {e}")
            return None

    class Meta:
        model = MicroCheckResponse
        fields = [
            'id', 'run_item', 'run_item_details', 'run', 'assignment', 'template',
            'store', 'store_name', 'category', 'category_display',
            'severity_snapshot', 'severity_display', 'status', 'status_display',
            'notes', 'skip_reason', 'skip_reason_display', 'skip_reason_detail',
            'media', 'media_url', 'completed_by', 'completed_by_name', 'completed_at',
            'local_completed_date', 'completion_seconds',
            'override_reason', 'overridden_by', 'overridden_at',
            'created_at', 'created_by', 'updated_at', 'updated_by'
        ]
        read_only_fields = [
            'id', 'run', 'assignment', 'template', 'store', 'category',
            'severity_snapshot', 'local_completed_date', 'completed_at',
            'created_at', 'created_by', 'updated_at', 'updated_by'
        ]


class CheckCoverageSerializer(serializers.ModelSerializer):
    """Coverage tracking for template rotation"""
    template_title = serializers.CharField(source='template.title', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = CheckCoverage
        fields = [
            'id', 'store', 'store_name', 'template', 'template_title',
            'category', 'category_display', 'last_used_date',
            'times_used', 'last_response_status', 'consecutive_passes',
            'consecutive_fails', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'times_used', 'last_response_status',
            'consecutive_passes', 'consecutive_fails',
            'created_at', 'updated_at'
        ]


class MicroCheckStreakSerializer(serializers.ModelSerializer):
    """Streak tracking for gamification"""
    store_name = serializers.CharField(source='store.name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    current_streak = serializers.SerializerMethodField()

    class Meta:
        model = MicroCheckStreak
        fields = [
            'id', 'store', 'store_name', 'user', 'user_name',
            'current_streak', 'longest_streak', 'last_completion_date',
            'total_completions',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'current_streak', 'longest_streak', 'last_completion_date',
            'total_completions',
            'created_at', 'updated_at'
        ]

    def get_current_streak(self, obj):
        """
        Calculate real-time streak status.
        If last completion was more than 1 day ago, streak is broken (return 0).
        """
        if not obj.last_completion_date:
            return 0

        from django.utils import timezone
        from .utils import get_store_local_date

        # Get today's date in the store's timezone
        today = get_store_local_date(obj.store)

        # Calculate days since last completion
        days_since_last = (today - obj.last_completion_date).days

        # If more than 1 day has passed, streak is broken
        if days_since_last > 1:
            return 0

        return obj.current_streak


class StoreStreakSerializer(serializers.ModelSerializer):
    """Store-level streak tracking"""
    store_name = serializers.CharField(source='store.name', read_only=True)
    current_streak = serializers.SerializerMethodField()

    class Meta:
        model = StoreStreak
        fields = [
            'id', 'store', 'store_name',
            'current_streak', 'longest_streak', 'last_completion_date',
            'total_completions',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'current_streak', 'longest_streak', 'last_completion_date',
            'total_completions',
            'created_at', 'updated_at'
        ]

    def get_current_streak(self, obj):
        """
        Calculate real-time streak status.
        If last completion was more than 1 day ago, streak is broken (return 0).
        """
        if not obj.last_completion_date:
            return 0

        from django.utils import timezone
        from .utils import get_store_local_date

        # Get today's date in the store's timezone
        today = get_store_local_date(obj.store)

        # Calculate days since last completion
        days_since_last = (today - obj.last_completion_date).days

        # If more than 1 day has passed, streak is broken
        if days_since_last > 1:
            return 0

        return obj.current_streak


class CorrectiveActionSerializer(serializers.ModelSerializer):
    """Corrective action auto-created on failures"""
    response_details = MicroCheckResponseSerializer(source='response', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, allow_null=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True, allow_null=True)
    before_media_url = serializers.SerializerMethodField()
    after_media_url = serializers.SerializerMethodField()

    def _get_media_url(self, media_asset):
        """Helper to generate presigned URL for a media asset"""
        if not media_asset:
            return None

        import boto3
        from django.conf import settings

        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )

            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': media_asset.s3_bucket,
                    'Key': media_asset.s3_key,
                },
                ExpiresIn=3600
            )
            return url
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error generating presigned URL for media {media_asset.id}: {e}")
            return None

    def get_before_media_url(self, obj):
        """Return presigned URL for before_media if it exists"""
        return self._get_media_url(obj.before_media)

    def get_after_media_url(self, obj):
        """Return presigned URL for after_media if it exists"""
        return self._get_media_url(obj.after_media)

    class Meta:
        model = CorrectiveAction
        fields = [
            'id', 'response', 'response_details', 'store', 'store_name',
            'category', 'category_display', 'status',
            'due_at', 'assigned_to', 'assigned_to_name',
            'before_media', 'before_media_url', 'after_media', 'after_media_url',
            'resolved_at', 'resolved_by', 'resolved_by_name', 'resolution_notes',
            'fixed_during_session', 'created_from', 'verified_at', 'verification_confidence',
            'created_at', 'created_by', 'updated_at', 'updated_by'
        ]
        read_only_fields = [
            'id', 'resolved_at', 'resolved_by', 'verified_at',
            'created_at', 'created_by', 'updated_at', 'updated_by'
        ]
