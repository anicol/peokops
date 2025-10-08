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
    CorrectiveAction
)

User = get_user_model()


class MicroCheckTemplateSerializer(serializers.ModelSerializer):
    """Template serializer with version tracking"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = MicroCheckTemplate
        fields = [
            'id', 'brand', 'category', 'category_display', 'severity', 'severity_display',
            'title', 'description', 'success_criteria',
            'version', 'parent_template',
            'default_photo_required', 'default_video_required', 'expected_completion_seconds',
            'ai_validation_enabled', 'ai_validation_prompt',
            'is_local', 'include_in_rotation', 'rotation_priority',
            'visual_reference_image', 'is_active',
            'created_at', 'created_by', 'created_by_name', 'updated_at', 'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'created_by', 'updated_at', 'updated_by']


class MicroCheckRunItemSerializer(serializers.ModelSerializer):
    """Individual check item within a run (1 of 3)"""
    template_title = serializers.CharField(source='template.title', read_only=True)
    photo_required_reason_display = serializers.CharField(source='get_photo_required_reason_display', read_only=True)

    class Meta:
        model = MicroCheckRunItem
        fields = [
            'id', 'run', 'template', 'template_title', 'order',
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

    class Meta:
        model = MicroCheckRun
        fields = [
            'id', 'store', 'store_name', 'scheduled_for', 'sequence',
            'store_timezone', 'retention_policy', 'retention_policy_display',
            'retain_until', 'status', 'status_display', 'completed_at',
            'items', 'created_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']


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
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = MediaAsset
        fields = [
            'id', 'store', 's3_key', 's3_bucket', 'file_size_bytes',
            'mime_type', 'sha256', 'retention_policy', 'retention_policy_display',
            'expires_at', 'uploaded_at', 'uploaded_by', 'uploaded_by_name'
        ]
        read_only_fields = ['id', 'sha256', 'uploaded_at', 'uploaded_by']


class MicroCheckResponseSerializer(serializers.ModelSerializer):
    """Response with denormalized fields for performance"""
    run_item_details = MicroCheckRunItemSerializer(source='run_item', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    skip_reason_display = serializers.CharField(source='get_skip_reason_display', read_only=True)
    responder_name = serializers.CharField(source='responder.get_full_name', read_only=True)

    class Meta:
        model = MicroCheckResponse
        fields = [
            'id', 'run_item', 'run_item_details', 'store', 'store_name',
            'category', 'category_display', 'severity', 'severity_display',
            'status', 'status_display', 'pass_fail_override', 'override_reason',
            'skip_reason', 'skip_reason_display', 'notes', 'responder', 'responder_name',
            'photo', 'completed_at', 'local_completed_date', 'ip_address',
            'user_agent', 'created_at', 'created_by', 'updated_at', 'updated_by'
        ]
        read_only_fields = [
            'id', 'completed_at', 'local_completed_date',
            'ip_address', 'user_agent',
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
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)

    class Meta:
        model = MicroCheckStreak
        fields = [
            'id', 'store', 'store_name', 'manager', 'manager_name',
            'current_streak', 'longest_streak', 'last_completed_date',
            'total_completed', 'total_passed', 'total_failed', 'total_skipped',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'current_streak', 'longest_streak', 'last_completed_date',
            'total_completed', 'total_passed', 'total_failed', 'total_skipped',
            'created_at', 'updated_at'
        ]


class CorrectiveActionSerializer(serializers.ModelSerializer):
    """Corrective action auto-created on failures"""
    response_details = MicroCheckResponseSerializer(source='response', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)

    class Meta:
        model = CorrectiveAction
        fields = [
            'id', 'response', 'response_details', 'store', 'store_name',
            'category', 'category_display', 'severity', 'severity_display',
            'description', 'due_date', 'assigned_to', 'assigned_to_name',
            'resolved_at', 'resolved_by', 'resolved_by_name', 'resolution_notes',
            'created_at', 'created_by', 'updated_at', 'updated_by'
        ]
        read_only_fields = [
            'id', 'resolved_at', 'resolved_by',
            'created_at', 'created_by', 'updated_at', 'updated_by'
        ]
