from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import (
    EmployeeVoicePulse,
    EmployeeVoiceInvitation,
    EmployeeVoiceResponse,
    AutoFixFlowConfig,
    CrossVoiceCorrelation
)

User = get_user_model()


class EmployeeVoicePulseSerializer(serializers.ModelSerializer):
    """
    Pulse survey configuration serializer.
    Includes unlock progress and privacy settings.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    shift_window_display = serializers.CharField(source='get_shift_window_display', read_only=True)
    language_display = serializers.CharField(source='get_language_display', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    unlock_progress = serializers.SerializerMethodField()
    can_view_insights = serializers.SerializerMethodField()

    def get_unlock_progress(self, obj):
        """Get progress toward unlocking (X/5 unique respondents)"""
        return obj.get_progress_toward_unlock()

    def get_can_view_insights(self, obj):
        """Check if current user can view insights (requires n ≥ 5 and proper role)"""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False

        user = request.user

        # Check if user has proper role (OWNER, TRIAL_ADMIN, or SUPER_ADMIN)
        if user.role not in [User.Role.OWNER, User.Role.TRIAL_ADMIN, User.Role.SUPER_ADMIN]:
            return False

        # Check if minimum respondents threshold is met
        thirty_days_ago = timezone.now() - timedelta(days=30)
        unique_respondents = EmployeeVoiceResponse.objects.filter(
            pulse=obj,
            completed_at__gte=thirty_days_ago
        ).values('anonymous_hash').distinct().count()

        return unique_respondents >= obj.min_respondents_for_display

    class Meta:
        model = EmployeeVoicePulse
        fields = [
            'id', 'store', 'store_name', 'account', 'account_name',
            'title', 'description',
            'shift_window', 'shift_window_display', 'language', 'language_display', 'send_time',
            'status', 'status_display', 'unlocked_at', 'unlock_progress',
            'min_respondents_for_display', 'consent_text',
            'auto_fix_flow_enabled', 'can_view_insights',
            'is_active', 'created_at', 'created_by', 'created_by_name', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'unlocked_at', 'created_at', 'created_by', 'updated_at']


class EmployeeVoiceInvitationSerializer(serializers.ModelSerializer):
    """
    Magic link invitation serializer.
    Token is write-only for security.
    """
    pulse_title = serializers.CharField(source='pulse.title', read_only=True)
    delivery_method_display = serializers.CharField(source='get_delivery_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_valid = serializers.SerializerMethodField()

    def get_is_valid(self, obj):
        """Check if magic link is still valid"""
        return obj.is_valid()

    class Meta:
        model = EmployeeVoiceInvitation
        fields = [
            'id', 'pulse', 'pulse_title',
            'token', 'delivery_method', 'delivery_method_display',
            'recipient_phone', 'recipient_email',
            'status', 'status_display', 'is_valid',
            'sent_at', 'opened_at', 'completed_at', 'expires_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'sent_at', 'opened_at', 'completed_at', 'created_at', 'updated_at']
        extra_kwargs = {
            'token': {'write_only': True}  # Don't expose token in responses
        }


class EmployeeVoiceResponseSerializer(serializers.ModelSerializer):
    """
    Survey response serializer with role-based comment filtering.
    Comments are only visible to OWNER/TRIAL_ADMIN/SUPER_ADMIN when n ≥ 5.
    """
    pulse_title = serializers.CharField(source='pulse.title', read_only=True)
    mood_display = serializers.CharField(source='get_mood_display', read_only=True)
    confidence_display = serializers.CharField(source='get_confidence_display', read_only=True)
    comment = serializers.SerializerMethodField()  # Role-gated

    def get_comment(self, obj):
        """
        Role-based comment filtering.
        Only show comments to OWNER/TRIAL_ADMIN/SUPER_ADMIN and only when n ≥ 5.
        """
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None

        user = request.user

        # Check role: Only OWNER, TRIAL_ADMIN, and SUPER_ADMIN can see comments
        if user.role not in [User.Role.OWNER, User.Role.TRIAL_ADMIN, User.Role.SUPER_ADMIN]:
            return None

        # Check n ≥ 5 requirement for privacy
        thirty_days_ago = timezone.now() - timedelta(days=30)
        unique_respondents = EmployeeVoiceResponse.objects.filter(
            pulse=obj.pulse,
            completed_at__gte=thirty_days_ago
        ).values('anonymous_hash').distinct().count()

        if unique_respondents < obj.pulse.min_respondents_for_display:
            return None

        return obj.comment

    class Meta:
        model = EmployeeVoiceResponse
        fields = [
            'id', 'pulse', 'pulse_title', 'invitation',
            'anonymous_hash',
            'mood', 'mood_display',
            'confidence', 'confidence_display',
            'bottlenecks',  # Changed to plural for multi-select
            'comment',
            'submitted_at', 'completed_at'
        ]
        read_only_fields = ['id', 'submitted_at', 'completed_at']
        extra_kwargs = {
            'anonymous_hash': {'write_only': True},  # Don't expose hash
            'ip_address': {'write_only': True},
            'user_agent': {'write_only': True}
        }


class EmployeeVoiceResponseSubmitSerializer(serializers.Serializer):
    """
    Serializer for submitting survey responses via magic link.
    Handles anonymous hash generation and deduplication.
    """
    token = serializers.CharField(required=True, help_text="Magic link token")
    mood = serializers.IntegerField(required=True, min_value=1, max_value=5)
    confidence = serializers.IntegerField(required=True, min_value=1, max_value=3)
    bottlenecks = serializers.ListField(
        child=serializers.ChoiceField(choices=EmployeeVoiceResponse.Bottleneck.choices),
        required=False,
        allow_empty=True,
        default=list
    )
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=80,
        help_text="Optional comment (max 280 chars)"
    )
    device_fingerprint = serializers.CharField(
        required=True,
        help_text="Device fingerprint from frontend (for anonymous hash)"
    )

    def validate_token(self, value):
        """Validate that token exists and is valid"""
        try:
            invitation = EmployeeVoiceInvitation.objects.get(token=value)
            if not invitation.is_valid():
                raise serializers.ValidationError("Magic link has expired or is no longer valid")
            return value
        except EmployeeVoiceInvitation.DoesNotExist:
            raise serializers.ValidationError("Invalid magic link token")

    def validate(self, data):
        """Check for duplicate submissions (same anonymous_hash within 24h)"""
        from .utils import generate_anonymous_hash_from_request

        request = self.context.get('request')
        if request:
            device_fingerprint = data.get('device_fingerprint')
            anonymous_hash = generate_anonymous_hash_from_request(request, device_fingerprint)

            # Check if this hash already submitted today
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            duplicate = EmployeeVoiceResponse.objects.filter(
                anonymous_hash=anonymous_hash,
                completed_at__gte=today_start
            ).exists()

            if duplicate:
                raise serializers.ValidationError(
                    "You've already submitted a response today. Please try again tomorrow."
                )

        return data


class EmployeeVoiceInsightsSerializer(serializers.Serializer):
    """
    Serializer for aggregated insights (n ≥ 5 protection).
    Returns aggregated metrics without exposing individual responses.
    """
    pulse_id = serializers.UUIDField()
    pulse_title = serializers.CharField()
    time_window = serializers.CharField(help_text="e.g., 'Last 30 days'")
    total_responses = serializers.IntegerField()
    unique_respondents = serializers.IntegerField()
    can_display = serializers.BooleanField(help_text="Whether n ≥ 5 threshold is met")

    # Engagement metrics
    engagement_score = serializers.FloatField(
        help_text="Percentage of unique respondents (X/team_size * 100)"
    )

    # Mood metrics
    avg_mood = serializers.FloatField()
    mood_distribution = serializers.DictField()

    # Confidence metrics
    confidence_high_pct = serializers.FloatField()
    confidence_medium_pct = serializers.FloatField()
    confidence_low_pct = serializers.FloatField()

    # Top bottlenecks (sorted by frequency)
    top_bottlenecks = serializers.ListField(
        child=serializers.DictField(),
        help_text="[{'type': 'EQUIPMENT', 'count': 5, 'percentage': 25.0}]"
    )

    # Comments (only if n ≥ 5 and user is OWNER/SUPER_ADMIN)
    comments = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        help_text="Recent comments (role-gated)"
    )

    # Cross-voice correlations
    correlations = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text="Active correlations with micro-check failures"
    )


class AutoFixFlowConfigSerializer(serializers.ModelSerializer):
    """Auto-fix flow configuration serializer"""
    pulse_title = serializers.CharField(source='pulse.title', read_only=True)

    class Meta:
        model = AutoFixFlowConfig
        fields = [
            'id', 'pulse', 'pulse_title',
            'bottleneck_threshold', 'time_window_days',
            'bottleneck_to_category_map',
            'is_enabled', 'notify_on_creation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CrossVoiceCorrelationSerializer(serializers.ModelSerializer):
    """Cross-voice correlation serializer with smart recommendations"""
    pulse_title = serializers.CharField(source='pulse.title', read_only=True)
    store_name = serializers.CharField(source='pulse.store.name', read_only=True)
    correlation_type_display = serializers.CharField(source='get_correlation_type_display', read_only=True)
    strength_display = serializers.CharField(source='get_strength_display', read_only=True)
    action_item_title = serializers.CharField(
        source='action_item.title',
        read_only=True,
        allow_null=True
    )
    action_item_status = serializers.CharField(
        source='action_item.status',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = CrossVoiceCorrelation
        fields = [
            'id', 'pulse', 'pulse_title', 'store_name',
            'correlation_type', 'correlation_type_display',
            'strength', 'strength_display',
            'bottleneck_type', 'avg_mood_score', 'avg_confidence_score',
            'check_category', 'check_fail_rate',
            'recommendation_text', 'is_actionable',
            'action_item', 'action_item_title', 'action_item_status',
            'time_window_start', 'time_window_end',
            'is_resolved', 'resolved_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'avg_mood_score', 'avg_confidence_score', 'check_fail_rate',
            'action_item', 'is_resolved', 'resolved_at', 'created_at', 'updated_at'
        ]


class EmployeeVoicePulseDetailSerializer(EmployeeVoicePulseSerializer):
    """
    Extended pulse serializer with auto-fix config and recent correlations.
    Used for detail views.
    """
    auto_fix_config = AutoFixFlowConfigSerializer(read_only=True, allow_null=True)
    recent_correlations = serializers.SerializerMethodField()

    def get_recent_correlations(self, obj):
        """Get recent unresolved correlations"""
        correlations = CrossVoiceCorrelation.objects.filter(
            pulse=obj,
            is_resolved=False
        ).order_by('-created_at')[:5]
        return CrossVoiceCorrelationSerializer(correlations, many=True).data

    class Meta(EmployeeVoicePulseSerializer.Meta):
        fields = EmployeeVoicePulseSerializer.Meta.fields + [
            'auto_fix_config',
            'recent_correlations'
        ]
