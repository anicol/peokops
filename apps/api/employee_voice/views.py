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
    CrossVoiceCorrelation
)
from .serializers import (
    EmployeeVoicePulseSerializer,
    EmployeeVoicePulseDetailSerializer,
    EmployeeVoiceInvitationSerializer,
    EmployeeVoiceResponseSerializer,
    EmployeeVoiceResponseSubmitSerializer,
    EmployeeVoiceInsightsSerializer,
    CrossVoiceCorrelationSerializer
)
from .utils import generate_anonymous_hash_from_request
from accounts.models import User


class EmployeeVoicePulseViewSet(ScopedQuerysetMixin, ScopedCreateMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing employee voice pulse surveys.

    Access Control:
    - OWNER/TRIAL_ADMIN/SUPER_ADMIN: Full access (create, edit, delete, view insights)
    - ADMIN: View-only access
    - GM: No access
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

        # OWNER and TRIAL_ADMIN see pulses for their account (both store-specific and account-wide)
        if user.role in [User.Role.OWNER, User.Role.TRIAL_ADMIN]:
            if user.account:
                return self.queryset.filter(account=user.account)
            return self.queryset.none()

        # Other roles see:
        # 1. Pulses for their accessible stores
        # 2. Account-wide pulses (store=null) for their account
        accessible_stores = user.get_accessible_stores()
        if user.account:
            return self.queryset.filter(
                Q(store__in=accessible_stores) |
                Q(store__isnull=True, account=user.account)
            )
        return self.queryset.filter(store__in=accessible_stores)

    def perform_create(self, serializer):
        """Set created_by on pulse creation"""
        serializer.save(created_by=self.request.user)

    @extend_schema(
        summary="Get or create account pulse",
        description="Returns the single pulse for the user's account, creating one with defaults if it doesn't exist. "
                    "This endpoint supports the single-pulse interface design.",
        responses={
            200: EmployeeVoicePulseSerializer,
        }
    )
    @action(detail=False, methods=['get'], url_path='get-or-create')
    def get_or_create(self, request):
        """
        Get or create the single pulse for the user's account.
        Auto-creates with sensible defaults if none exists.
        """
        user = request.user

        # Get user's account
        if not user.account:
            return Response(
                {'error': 'User must be associated with an account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try to get existing pulse for account (account-wide, not store-specific)
        # Note: We get the pulse regardless of is_active status
        pulse = EmployeeVoicePulse.objects.filter(
            account=user.account,
            store__isnull=True,  # Account-wide pulse
        ).first()

        # Create if doesn't exist
        if not pulse:
            pulse = EmployeeVoicePulse.objects.create(
                account=user.account,
                store=None,  # Account-wide
                title="Team Pulse Survey",
                description="Quick anonymous survey to help improve daily operations.",
                shift_window=EmployeeVoicePulse.ShiftWindow.CLOSE,
                language=EmployeeVoicePulse.Language.EN,
                delivery_frequency=EmployeeVoicePulse.DeliveryFrequency.MEDIUM,
                randomization_window_minutes=60,
                min_respondents_for_display=5,
                consent_text="Anonymous, aggregated. Used to improve daily operations.",
                created_by=user,
                is_active=True
            )

        serializer = self.get_serializer(pulse)
        return Response(serializer.data)

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
        Supports optional store_id filter for multi-store accounts.
        Supports optional days parameter (7 or 30, defaults to 7).
        """
        pulse = self.get_object()
        user = request.user

        # Check role: OWNER, SUPER_ADMIN, ADMIN, TRIAL_ADMIN, and GM can view insights
        if user.role not in [User.Role.OWNER, User.Role.SUPER_ADMIN, User.Role.ADMIN, User.Role.TRIAL_ADMIN, User.Role.GM]:
            return Response(
                {'error': 'Insufficient permissions.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get optional store filter and days parameter
        store_id = request.query_params.get('store_id')
        days_param = request.query_params.get('days', '7')

        # Validate days parameter
        try:
            days = int(days_param)
            if days not in [7, 30]:
                days = 7
        except (ValueError, TypeError):
            days = 7

        # Calculate metrics for specified time period
        now = timezone.now()
        time_ago = now - timedelta(days=days)

        # Get current period responses
        responses = EmployeeVoiceResponse.objects.filter(
            pulse=pulse,
            completed_at__gte=time_ago
        )

        # Filter by store if specified
        if store_id and store_id != 'all':
            # Filter to responses from invitations sent to employees at this store
            from integrations.models import SevenShiftsEmployee

            # Get employee IDs at this store
            store_employee_ids = SevenShiftsEmployee.objects.filter(
                account=pulse.account,
                store_id=store_id
            ).values_list('id', flat=True)

            # Filter responses to those from invitations linked to these employees
            responses = responses.filter(
                invitation__recipient_phone__in=SevenShiftsEmployee.objects.filter(
                    id__in=store_employee_ids
                ).values_list('phone', flat=True)
            )

        total_responses = responses.count()
        unique_respondents = responses.values('anonymous_hash').distinct().count()

        # Check n ≥ 5 requirement (check last 30 days for unlock, but display current week)
        thirty_days_ago = now - timedelta(days=30)
        all_recent_responses = EmployeeVoiceResponse.objects.filter(
            pulse=pulse,
            completed_at__gte=thirty_days_ago
        )
        total_unique_respondents = all_recent_responses.values('anonymous_hash').distinct().count()

        if total_unique_respondents < pulse.min_respondents_for_display:
            return Response({
                'pulse_id': pulse.id,
                'pulse_title': pulse.title,
                'can_display': False,
                'unique_respondents': total_unique_respondents,
                'required_respondents': pulse.min_respondents_for_display,
                'message': f"Insights will unlock after {pulse.min_respondents_for_display - total_unique_respondents} more unique team members participate."
            }, status=status.HTTP_200_OK)

        # Calculate period-over-period trends
        previous_period_ago = now - timedelta(days=days * 2)

        # Current period responses (already filtered above)
        current_period_responses = responses
        # Previous period responses (previous N days)
        previous_period_responses = EmployeeVoiceResponse.objects.filter(
            pulse=pulse,
            completed_at__gte=previous_period_ago,
            completed_at__lt=time_ago
        )

        # Apply same store filter to previous period if specified
        if store_id and store_id != 'all':
            from integrations.models import SevenShiftsEmployee
            store_employee_ids = SevenShiftsEmployee.objects.filter(
                account=pulse.account,
                store_id=store_id
            ).values_list('id', flat=True)

            previous_period_responses = previous_period_responses.filter(
                invitation__recipient_phone__in=SevenShiftsEmployee.objects.filter(
                    id__in=store_employee_ids
                ).values_list('phone', flat=True)
            )

        # Current period metrics
        current_period_mood = current_period_responses.aggregate(avg_mood=Avg('mood'))['avg_mood'] or 0
        current_period_confidence_high = current_period_responses.filter(confidence=3).count()
        current_period_total = current_period_responses.count()
        current_period_confidence_pct = (current_period_confidence_high / current_period_total * 100) if current_period_total > 0 else 0

        # Previous period metrics
        previous_period_mood = previous_period_responses.aggregate(avg_mood=Avg('mood'))['avg_mood'] or 0
        previous_period_confidence_high = previous_period_responses.filter(confidence=3).count()
        previous_period_total = previous_period_responses.count()
        previous_period_confidence_pct = (previous_period_confidence_high / previous_period_total * 100) if previous_period_total > 0 else 0

        # Calculate trends (difference from previous period)
        mood_trend = round(current_period_mood - previous_period_mood, 2) if previous_period_mood > 0 else None
        confidence_trend = round(current_period_confidence_pct - previous_period_confidence_pct, 1) if previous_period_total > 0 else None

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

        # Get all comments for the week with timestamps (role-gated, already filtered by serializer)
        recent_comments = responses.exclude(comment='').order_by('-completed_at')
        comments = [
            {
                'text': r.comment,
                'completed_at': r.completed_at.isoformat() if r.completed_at else None
            }
            for r in recent_comments if r.comment
        ]

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
            'time_window': f'Last {days} days',
            'total_responses': total_responses,
            'unique_respondents': unique_respondents,
            'can_display': True,
            'engagement_score': round(engagement_score, 1),
            'avg_mood': round(mood_stats['avg_mood'], 2) if mood_stats['avg_mood'] else 0,
            'mood_distribution': mood_distribution,
            'mood_trend': mood_trend,
            'confidence_high_pct': round(confidence_high_pct, 1),
            'confidence_medium_pct': round(confidence_medium_pct, 1),
            'confidence_low_pct': round(confidence_low_pct, 1),
            'confidence_trend': confidence_trend,
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
        summary="Get eligible employees for this pulse",
        description="Returns list of eligible employees from 7shifts who can receive survey invitations",
        responses={200: dict}
    )
    @action(detail=True, methods=['get'], url_path='eligible-employees')
    def eligible_employees(self, request, pk=None):
        """
        Get eligible employees for this pulse from 7shifts integration.
        Returns total count and sample of employees.
        """
        pulse = self.get_object()

        from integrations.models import SevenShiftsEmployee

        # Get eligible employees (active with phone numbers)
        employees = SevenShiftsEmployee.objects.filter(
            account=pulse.account,
            is_active=True
        ).exclude(phone__isnull=True).exclude(phone='')

        # If pulse is store-specific, filter by store
        if pulse.store:
            employees = employees.filter(store=pulse.store)

        total_eligible = employees.count()

        # Get sample of employees (first 20) with masked phone numbers
        sample_employees = [
            {
                'id': str(emp.id),
                'first_name': emp.first_name,
                'last_name': emp.last_name,
                'phone': emp.phone[:7] + '***' if emp.phone and len(emp.phone) > 7 else emp.phone,
                'roles': emp.roles or [],
            }
            for emp in employees[:20]
        ]

        return Response({
            'total_eligible': total_eligible,
            'employees': sample_employees
        })

    @extend_schema(
        summary="Preview distribution settings",
        description="Shows expected distribution stats based on current pulse settings",
        responses={200: dict}
    )
    @action(detail=True, methods=['get'], url_path='distribution-preview')
    def distribution_preview(self, request, pk=None):
        """
        Preview how distribution will work based on current settings.
        Shows expected sends per day based on frequency, plus a 7-day simulation.
        """
        pulse = self.get_object()

        from integrations.models import SevenShiftsEmployee
        import random

        # Get eligible employees
        employees = SevenShiftsEmployee.objects.filter(
            account=pulse.account,
            is_active=True
        ).exclude(phone__isnull=True).exclude(phone='')

        if pulse.store:
            employees = employees.filter(store=pulse.store)

        total_employees = employees.count()
        employee_list = list(employees.values('id', 'first_name', 'last_name', 'phone', 'roles'))

        # Calculate expected sends based on frequency
        frequency_map = {
            'LOW': 0.25,
            'MEDIUM': 0.40,
            'HIGH': 0.55,
        }
        send_probability = frequency_map.get(pulse.delivery_frequency, 0.40)
        expected_sends = int(total_employees * send_probability)

        # Get today's scheduled count
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_scheduled = EmployeeVoiceInvitation.objects.filter(
            pulse=pulse,
            created_at__gte=today_start
        ).count()

        # Generate 7-day forward simulation
        # This shows users what the distribution pattern will look like
        simulation = []
        random.seed(42)  # Consistent seed for preview (not actual scheduling)
        for day_offset in range(7):
            day_date = timezone.now().date() + timedelta(days=day_offset)
            selected_employees = []

            # Simulate random selection
            for emp in employee_list:
                if random.random() < send_probability:
                    # Get first role or 'Team Member' as default
                    role = emp['roles'][0] if emp['roles'] and len(emp['roles']) > 0 else 'Team Member'
                    selected_employees.append({
                        'name': f"{emp['first_name']} {emp['last_name']}",
                        'phone': emp['phone'][-4:],  # Last 4 digits for privacy
                        'role': role
                    })

            simulation.append({
                'date': day_date.isoformat(),
                'day_name': day_date.strftime('%A'),
                'expected_sends': len(selected_employees),
                'sample_employees': selected_employees[:5]  # Show up to 5 as sample
            })

        return Response({
            'total_eligible_employees': total_employees,
            'delivery_frequency': pulse.delivery_frequency,
            'send_probability_pct': int(send_probability * 100),
            'expected_daily_sends': expected_sends,
            'today_scheduled_count': today_scheduled,
            'randomization_window_minutes': pulse.randomization_window_minutes,
            'shift_window': pulse.shift_window,
            'shift_window_display': pulse.get_shift_window_display(),
            'seven_day_simulation': simulation,
        })

    @extend_schema(
        summary="Get distribution statistics",
        description="Returns distribution stats for the last 7 days",
        responses={200: dict}
    )
    @action(detail=True, methods=['get'], url_path='distribution-stats')
    def distribution_stats(self, request, pk=None):
        """
        Get distribution statistics for specified time period (7 or 30 days).
        Shows daily breakdown of scheduled/sent/opened/completed.
        """
        pulse = self.get_object()

        # Get optional days parameter
        days_param = request.query_params.get('days', '7')

        # Validate days parameter
        try:
            days = int(days_param)
            if days not in [7, 30]:
                days = 7
        except (ValueError, TypeError):
            days = 7

        time_ago = timezone.now() - timedelta(days=days)

        invitations = EmployeeVoiceInvitation.objects.filter(
            pulse=pulse,
            created_at__gte=time_ago
        )

        # Group by date
        from django.db.models.functions import TruncDate
        daily_stats = invitations.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            scheduled=Count('id', filter=Q(status=EmployeeVoiceInvitation.Status.SCHEDULED)),
            sent=Count('id', filter=Q(status=EmployeeVoiceInvitation.Status.SENT)),
            opened=Count('id', filter=Q(status=EmployeeVoiceInvitation.Status.OPENED)),
            completed=Count('id', filter=Q(status=EmployeeVoiceInvitation.Status.COMPLETED))
        ).order_by('-date')

        # Calculate response rate
        total_sent = invitations.filter(status__in=[
            EmployeeVoiceInvitation.Status.SENT,
            EmployeeVoiceInvitation.Status.OPENED,
            EmployeeVoiceInvitation.Status.COMPLETED
        ]).count()
        total_completed = invitations.filter(status=EmployeeVoiceInvitation.Status.COMPLETED).count()
        avg_response_rate = round((total_completed / total_sent * 100) if total_sent > 0 else 0, 1)

        return Response({
            'daily_stats': list(daily_stats),
            'total_scheduled_7d': invitations.filter(status=EmployeeVoiceInvitation.Status.SCHEDULED).count(),
            'total_sent_7d': total_sent,
            'total_completed_7d': total_completed,
            'avg_response_rate_7d': avg_response_rate,
        })

    @extend_schema(
        summary="Trigger distribution scheduling",
        description="Manually triggers the distribution scheduling task for this pulse. "
                    "This will schedule invitations for eligible employees based on the pulse configuration.",
        request=None,
        responses={
            200: OpenApiResponse(description="Distribution scheduling triggered successfully"),
            403: OpenApiResponse(description="Forbidden - user must be owner or admin"),
        }
    )
    @action(detail=True, methods=['post'], url_path='trigger-distribution')
    def trigger_distribution(self, request, pk=None):
        """
        Manually trigger distribution scheduling for this pulse.
        Calls the schedule_pulse_invitations Celery task.
        """
        from .tasks import schedule_pulse_invitations

        pulse = self.get_object()

        # Trigger the scheduling task
        task = schedule_pulse_invitations.delay()

        return Response({
            'message': 'Distribution scheduling triggered successfully',
            'task_id': task.id,
            'pulse_id': str(pulse.id)
        }, status=status.HTTP_200_OK)


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
        """Filter invitations based on user role and accessible stores"""
        user = self.request.user

        # SUPER_ADMIN sees all invitations
        if user.role == User.Role.SUPER_ADMIN:
            return self.queryset.all()

        # OWNER sees invitations for their account
        if user.role == User.Role.OWNER:
            if user.account:
                return self.queryset.filter(pulse__account=user.account)
            return self.queryset.none()

        # Other roles see invitations for their accessible stores + account-wide pulses
        accessible_stores = user.get_accessible_stores()
        if user.account:
            return self.queryset.filter(
                Q(pulse__store__in=accessible_stores) |
                Q(pulse__store__isnull=True, pulse__account=user.account)
            )
        return self.queryset.filter(pulse__store__in=accessible_stores)

    @extend_schema(
        summary="Get upcoming scheduled invitations",
        description="Returns invitations that are scheduled but not yet sent",
        responses={200: EmployeeVoiceInvitationSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='scheduled')
    def scheduled(self, request):
        """
        Get upcoming scheduled invitations.
        Filters for SCHEDULED status and future send times.
        """
        pulse_id = request.query_params.get('pulse')

        # Get base queryset (already filtered by user permissions)
        queryset = self.get_queryset()

        # Filter for scheduled invitations with future send times
        queryset = queryset.filter(
            status=EmployeeVoiceInvitation.Status.SCHEDULED,
            scheduled_send_at__gte=timezone.now()
        )

        # Filter by pulse if specified
        if pulse_id:
            queryset = queryset.filter(pulse_id=pulse_id)

        # Order by scheduled send time
        queryset = queryset.order_by('scheduled_send_at')

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class EmployeeVoiceResponseViewSet(ScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for employee voice responses.
    Comments are role-gated via serializer.

    Access Control:
    - OWNER/TRIAL_ADMIN/SUPER_ADMIN: Can view responses (comments filtered by n ≥ 5)
    - ADMIN: Cannot view individual responses
    - GM: No access
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

        # Only OWNER, TRIAL_ADMIN, and SUPER_ADMIN can view responses
        if user.role not in [User.Role.OWNER, User.Role.TRIAL_ADMIN, User.Role.SUPER_ADMIN]:
            return self.queryset.none()

        # SUPER_ADMIN sees all
        if user.role == User.Role.SUPER_ADMIN:
            return self.queryset.all()

        # OWNER and TRIAL_ADMIN see responses for their account
        if user.role in [User.Role.OWNER, User.Role.TRIAL_ADMIN] and user.account:
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
