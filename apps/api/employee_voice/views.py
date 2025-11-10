from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg, F
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from datetime import timedelta

from core.tenancy.mixins import ScopedQuerysetMixin, ScopedCreateMixin
from core.tenancy.permissions import TenantObjectPermission

from .models import (
    EmployeeVoicePulse,
    EmployeeVoiceInvitation,
    EmployeeVoiceResponse,
    AutoFixFlowConfig,
    CrossVoiceCorrelation
)
from .serializers import (
    EmployeeVoicePulseSerializer,
    EmployeeVoicePulseDetailSerializer,
    EmployeeVoiceInvitationSerializer,
    EmployeeVoiceResponseSerializer,
    EmployeeVoiceResponseSubmitSerializer,
    EmployeeVoiceInsightsSerializer,
    AutoFixFlowConfigSerializer,
    CrossVoiceCorrelationSerializer
)
from .utils import generate_anonymous_hash_from_request
from accounts.models import User


class EmployeeVoicePulseViewSet(ScopedQuerysetMixin, ScopedCreateMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing employee voice pulse surveys.

    Access Control:
    - OWNER/SUPER_ADMIN: Full access (create, edit, delete, view insights)
    - ADMIN: View-only access
    - GM/TRIAL_ADMIN: No access
    - INSPECTOR: No access
    """
    queryset = EmployeeVoicePulse.objects.all()
    permission_classes = [IsAuthenticated, TenantObjectPermission]
    filterset_fields = ['store', 'account', 'status', 'is_active', 'shift_window', 'language']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'status', 'unlocked_at']
    ordering = ['-created_at']
    
    tenant_scope = 'account'
    tenant_field_paths = {
        'account': 'account',
        'store': 'store'
    }
    tenant_create_fields = {'account': 'account', 'store': 'store'}
    tenant_object_paths = {
        'account': 'account_id',
        'store': 'store_id'
    }

    def get_serializer_class(self):
        """Use detailed serializer for retrieve actions"""
        if self.action == 'retrieve':
            return EmployeeVoicePulseDetailSerializer
        return EmployeeVoicePulseSerializer

    def get_queryset(self):
        """Filter pulses based on user role and access"""
        user = self.request.user

        # SUPER_ADMIN sees all pulses
        if user.role == User.Role.SUPER_ADMIN:
            return self.queryset.all()

        # OWNER sees pulses for their account
        if user.role == User.Role.OWNER:
            if user.account:
                return self.queryset.filter(account=user.account)

        # ADMIN, TRIAL_ADMIN, and GM see pulses for their store only
        if user.role in [User.Role.ADMIN, User.Role.TRIAL_ADMIN, User.Role.GM]:
            if user.store:
                return self.queryset.filter(store=user.store)

        # Other roles have no access
        return self.queryset.none()

    def perform_create(self, serializer):
        """Set created_by on pulse creation"""
        serializer.save(created_by=self.request.user)

    @extend_schema(
        summary="Get aggregated insights for a pulse",
        description="Returns aggregated metrics with n ≥ 5 privacy protection. "
                    "Only OWNER/SUPER_ADMIN can view insights when threshold is met.",
        responses={
            200: EmployeeVoiceInsightsSerializer,
            403: OpenApiResponse(description="Forbidden - insufficient permissions or n < 5"),
        }
    )
    @action(detail=True, methods=['get'])
    def insights(self, request, pk=None):
        """
        Get aggregated insights for this pulse.
        Enforces n ≥ 5 privacy protection and role-based access.
        """
        pulse = self.get_object()
        user = request.user

        # Check role: OWNER, SUPER_ADMIN, ADMIN, TRIAL_ADMIN, and GM can view insights
        if user.role not in [User.Role.OWNER, User.Role.SUPER_ADMIN, User.Role.ADMIN, User.Role.TRIAL_ADMIN, User.Role.GM]:
            return Response(
                {'error': 'Insufficient permissions.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Calculate metrics for last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        responses = EmployeeVoiceResponse.objects.filter(
            pulse=pulse,
            completed_at__gte=thirty_days_ago
        )

        total_responses = responses.count()
        unique_respondents = responses.values('anonymous_hash').distinct().count()

        # Check n ≥ 5 requirement
        if unique_respondents < pulse.min_respondents_for_display:
            return Response({
                'pulse_id': pulse.id,
                'pulse_title': pulse.title,
                'can_display': False,
                'unique_respondents': unique_respondents,
                'required_respondents': pulse.min_respondents_for_display,
                'message': f"Insights will unlock after {pulse.min_respondents_for_display - unique_respondents} more unique team members participate."
            }, status=status.HTTP_200_OK)

        # Calculate mood metrics
        mood_stats = responses.aggregate(avg_mood=Avg('mood'))
        mood_distribution = {
            'very_bad': responses.filter(mood=1).count(),
            'bad': responses.filter(mood=2).count(),
            'neutral': responses.filter(mood=3).count(),
            'good': responses.filter(mood=4).count(),
            'very_good': responses.filter(mood=5).count(),
        }

        # Calculate confidence metrics (now using integer values: 3=Yes, 2=Mostly, 1=No)
        total = responses.count()
        confidence_stats = {
            'high': responses.filter(confidence=3).count(),  # "Yes, I'm all set"
            'medium': responses.filter(confidence=2).count(),  # "Mostly, a few things missing"
            'low': responses.filter(confidence=1).count(),  # "No, we're short or disorganized"
        }
        confidence_high_pct = (confidence_stats['high'] / total * 100) if total > 0 else 0
        confidence_medium_pct = (confidence_stats['medium'] / total * 100) if total > 0 else 0
        confidence_low_pct = (confidence_stats['low'] / total * 100) if total > 0 else 0

        # Calculate top bottlenecks (bottlenecks is now a JSONField array)
        from collections import Counter
        all_bottlenecks = []
        for response in responses:
            if response.bottlenecks and isinstance(response.bottlenecks, list):
                all_bottlenecks.extend(response.bottlenecks)

        bottleneck_counter = Counter(all_bottlenecks)
        top_bottlenecks = [
            {
                'type': bottleneck_type,
                'count': count,
                'percentage': round((count / len(responses) * 100), 1) if len(responses) > 0 else 0
            }
            for bottleneck_type, count in bottleneck_counter.most_common(5)
        ]

        # Get recent comments (role-gated, already filtered by serializer)
        recent_comments = responses.exclude(comment='').order_by('-completed_at')[:10]
        comments = [r.comment for r in recent_comments if r.comment]

        # Get active correlations
        correlations = CrossVoiceCorrelation.objects.filter(
            pulse=pulse,
            is_resolved=False
        ).order_by('-created_at')[:5]

        correlation_data = CrossVoiceCorrelationSerializer(correlations, many=True).data

        # Calculate engagement score (would need team size from store)
        # For now, use unique respondents as a proxy
        engagement_score = (unique_respondents / max(unique_respondents, 5) * 100)

        insights_data = {
            'pulse_id': pulse.id,
            'pulse_title': pulse.title,
            'time_window': 'Last 30 days',
            'total_responses': total_responses,
            'unique_respondents': unique_respondents,
            'can_display': True,
            'engagement_score': round(engagement_score, 1),
            'avg_mood': round(mood_stats['avg_mood'], 2) if mood_stats['avg_mood'] else 0,
            'mood_distribution': mood_distribution,
            'confidence_high_pct': round(confidence_high_pct, 1),
            'confidence_medium_pct': round(confidence_medium_pct, 1),
            'confidence_low_pct': round(confidence_low_pct, 1),
            'top_bottlenecks': top_bottlenecks,
            'comments': comments if comments else None,
            'correlations': correlation_data
        }

        serializer = EmployeeVoiceInsightsSerializer(insights_data)
        return Response(serializer.data)

    @extend_schema(
        summary="Manually check and update unlock status",
        description="Checks if pulse should be unlocked based on unique respondents.",
        responses={200: EmployeeVoicePulseSerializer}
    )
    @action(detail=True, methods=['post'])
    def check_unlock(self, request, pk=None):
        """
        Manually trigger unlock status check.
        Useful for testing or admin actions.
        """
        pulse = self.get_object()
        pulse.check_unlock_status()
        serializer = self.get_serializer(pulse)
        return Response(serializer.data)


@extend_schema(
    summary="Validate magic link token",
    description="Validates a magic link token and returns pulse information if valid. No authentication required.",
    request=None,
    responses={
        200: EmployeeVoicePulseSerializer,
        400: OpenApiResponse(description="Invalid or expired token"),
    }
)
@api_view(['GET'])
@permission_classes([AllowAny])
def validate_magic_link(request, token):
    """
    Validate magic link token and return pulse information.
    This endpoint is used when user clicks the magic link.
    """
    try:
        invitation = EmployeeVoiceInvitation.objects.select_related('pulse').get(token=token)

        if not invitation.is_valid():
            return Response(
                {'error': 'This link has expired or is no longer valid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark invitation as opened
        invitation.mark_opened()

        # Return pulse information
        pulse_serializer = EmployeeVoicePulseSerializer(invitation.pulse, context={'request': request})

        return Response({
            'pulse': pulse_serializer.data,
            'invitation_id': invitation.id,
            'expires_at': invitation.expires_at
        })

    except EmployeeVoiceInvitation.DoesNotExist:
        return Response(
            {'error': 'Invalid magic link token.'},
            status=status.HTTP_400_BAD_REQUEST
        )


@extend_schema(
    summary="Submit survey response via magic link",
    description="Submit an anonymous survey response using a magic link token. "
                "Handles deduplication via anonymous hash (device + IP + date). "
                "No authentication required.",
    request=EmployeeVoiceResponseSubmitSerializer,
    responses={
        201: EmployeeVoiceResponseSerializer,
        400: OpenApiResponse(description="Invalid data or duplicate submission"),
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def submit_survey_response(request):
    """
    Submit survey response via magic link.
    Generates anonymous hash for deduplication and privacy.
    """
    serializer = EmployeeVoiceResponseSubmitSerializer(data=request.data, context={'request': request})

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Get invitation and pulse
    token = serializer.validated_data['token']
    invitation = get_object_or_404(EmployeeVoiceInvitation, token=token)
    pulse = invitation.pulse

    # Generate anonymous hash
    device_fingerprint = serializer.validated_data['device_fingerprint']
    anonymous_hash = generate_anonymous_hash_from_request(request, device_fingerprint)

    # Create response
    response = EmployeeVoiceResponse.objects.create(
        pulse=pulse,
        invitation=invitation,
        anonymous_hash=anonymous_hash,
        mood=serializer.validated_data['mood'],
        confidence=serializer.validated_data['confidence'],
        bottlenecks=serializer.validated_data.get('bottlenecks', []),
        comment=serializer.validated_data.get('comment', ''),
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )

    # Mark invitation as completed
    invitation.mark_completed()

    # Check if pulse should be unlocked
    pulse.check_unlock_status()

    # Check auto-fix flow (if enabled)
    if pulse.auto_fix_flow_enabled:
        try:
            auto_fix_config = pulse.auto_fix_config
            auto_fix_config.check_and_create_action_items()
        except AutoFixFlowConfig.DoesNotExist:
            pass

    # Return created response
    response_serializer = EmployeeVoiceResponseSerializer(response, context={'request': request})
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class EmployeeVoiceInvitationViewSet(ScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for viewing invitation history.

    Access Control:
    - OWNER/SUPER_ADMIN: Can view all invitations for their account
    - ADMIN: Can view invitations for their store
    - Others: No access
    """
    queryset = EmployeeVoiceInvitation.objects.all()
    serializer_class = EmployeeVoiceInvitationSerializer
    permission_classes = [IsAuthenticated, TenantObjectPermission]
    filterset_fields = ['pulse', 'status']
    ordering_fields = ['sent_at', 'completed_at']
    ordering = ['-sent_at']
    
    tenant_scope = 'account'
    tenant_field_paths = {
        'account': 'pulse__account',
        'store': 'pulse__store'
    }
    tenant_object_paths = {
        'account': 'pulse.account_id',
        'store': 'pulse.store_id'
    }

    def get_queryset(self):
        """Filter invitations based on user role"""
        user = self.request.user

        # SUPER_ADMIN sees all invitations
        if user.role == User.Role.SUPER_ADMIN:
            return self.queryset.all()

        # OWNER sees invitations for their account
        if user.role == User.Role.OWNER:
            if user.account:
                return self.queryset.filter(pulse__account=user.account)

        # ADMIN sees invitations for their store
        if user.role in [User.Role.ADMIN, User.Role.TRIAL_ADMIN]:
            if user.store:
                return self.queryset.filter(pulse__store=user.store)

        # Other roles have no access
        return self.queryset.none()


class EmployeeVoiceResponseViewSet(ScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for employee voice responses.
    Comments are role-gated via serializer.

    Access Control:
    - OWNER/SUPER_ADMIN: Can view responses (comments filtered by n ≥ 5)
    - ADMIN: Cannot view individual responses
    - GM/TRIAL_ADMIN: No access
    """
    queryset = EmployeeVoiceResponse.objects.all()
    serializer_class = EmployeeVoiceResponseSerializer
    permission_classes = [IsAuthenticated, TenantObjectPermission]
    filterset_fields = ['pulse', 'mood', 'confidence']
    ordering_fields = ['completed_at', 'mood']
    ordering = ['-completed_at']
    
    tenant_scope = 'account'
    tenant_field_paths = {
        'account': 'pulse__account',
        'store': 'pulse__store'
    }
    tenant_object_paths = {
        'account': 'pulse.account_id',
        'store': 'pulse.store_id'
    }

    def get_queryset(self):
        """Filter responses based on user role"""
        user = self.request.user

        # Only OWNER and SUPER_ADMIN can view responses
        if user.role not in [User.Role.OWNER, User.Role.SUPER_ADMIN]:
            return self.queryset.none()

        # SUPER_ADMIN sees all
        if user.role == User.Role.SUPER_ADMIN:
            return self.queryset.all()

        # OWNER sees responses for their account
        if user.role == User.Role.OWNER and user.account:
            return self.queryset.filter(pulse__account=user.account)

        return self.queryset.none()


class AutoFixFlowConfigViewSet(ScopedQuerysetMixin, ScopedCreateMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing auto-fix flow configurations.

    Access Control:
    - OWNER/SUPER_ADMIN: Full access
    - Others: No access
    """
    queryset = AutoFixFlowConfig.objects.all()
    serializer_class = AutoFixFlowConfigSerializer
    permission_classes = [IsAuthenticated, TenantObjectPermission]
    filterset_fields = ['pulse', 'is_enabled']
    
    tenant_scope = 'account'
    tenant_field_paths = {
        'account': 'pulse__account',
        'store': 'pulse__store'
    }
    tenant_object_paths = {
        'account': 'pulse.account_id',
        'store': 'pulse.store_id'
    }

    def get_queryset(self):
        """Filter configs based on user role"""
        user = self.request.user

        if user.role == User.Role.SUPER_ADMIN:
            return self.queryset.all()

        if user.role == User.Role.OWNER and user.account:
            return self.queryset.filter(pulse__account=user.account)

        return self.queryset.none()


class CrossVoiceCorrelationViewSet(ScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for cross-voice correlations.
    Shows correlations between pulse trends and micro-check failures.

    Access Control:
    - OWNER/SUPER_ADMIN: Can view correlations
    - Others: No access
    """
    queryset = CrossVoiceCorrelation.objects.all()
    serializer_class = CrossVoiceCorrelationSerializer
    permission_classes = [IsAuthenticated, TenantObjectPermission]
    filterset_fields = ['pulse', 'correlation_type', 'strength', 'is_resolved', 'is_actionable']
    ordering_fields = ['created_at', 'strength']
    ordering = ['-created_at']
    
    tenant_scope = 'account'
    tenant_field_paths = {
        'account': 'pulse__account',
        'store': 'pulse__store'
    }
    tenant_object_paths = {
        'account': 'pulse.account_id',
        'store': 'pulse.store_id'
    }

    def get_queryset(self):
        """Filter correlations based on user role"""
        user = self.request.user

        if user.role == User.Role.SUPER_ADMIN:
            return self.queryset.all()

        if user.role == User.Role.OWNER and user.account:
            return self.queryset.filter(pulse__account=user.account)

        return self.queryset.none()

    @extend_schema(
        summary="Mark correlation as resolved",
        description="Mark a correlation as resolved when the issue has been addressed.",
        request=None,
        responses={200: CrossVoiceCorrelationSerializer}
    )
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark correlation as resolved"""
        correlation = self.get_object()
        correlation.is_resolved = True
        correlation.resolved_at = timezone.now()
        correlation.save(update_fields=['is_resolved', 'resolved_at', 'updated_at'])

        serializer = self.get_serializer(correlation)
        return Response(serializer.data)
