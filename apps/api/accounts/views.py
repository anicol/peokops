from rest_framework import generics, status, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login
from django.utils import timezone
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from .models import User, SmartNudge, UserBehaviorEvent, MicroCheckDeliveryConfig, ImpersonationSession
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer, TrialSignupSerializer,
    SmartNudgeSerializer, BehaviorEventCreateSerializer, ProfileUpdateSerializer,
    PasswordChangeSerializer, QuickSignupSerializer, MicroCheckDeliveryConfigSerializer
)
from .nudge_engine import BehaviorTracker, NudgeEngine
from .jwt_utils import get_tokens_for_impersonation, get_impersonation_context_from_request
from .permissions import IsSuperAdmin, CanImpersonate


class UserListCreateView(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active', 'store']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter users based on role - SUPER_ADMIN/ADMIN sees all, OWNER/GM/TRIAL_ADMIN see only their account"""
        user = self.request.user

        # SUPER_ADMIN and ADMIN see all users across all tenants
        if user.role in [User.Role.SUPER_ADMIN, User.Role.ADMIN]:
            return User.objects.all()

        # OWNER, GM, and TRIAL_ADMIN see users in their account
        if user.role in [User.Role.OWNER, User.Role.GM, User.Role.TRIAL_ADMIN]:
            if user.account:
                # Get all users in the same account (tenant)
                return User.objects.filter(account=user.account)
            return User.objects.none()

        # Other roles cannot list users
        return User.objects.none()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        return Response({
            'access': str(access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=ProfileUpdateSerializer,
    responses={200: UserSerializer},
    description="Get or update current user's profile"
)
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    if request.method == 'GET':
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=TrialSignupSerializer,
    responses={201: UserSerializer, 400: None},
    description="Create a new trial user with auto-generated brand and demo store"
)
@api_view(['POST'])
@permission_classes([AllowAny])
def trial_signup_view(request):
    serializer = TrialSignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Generate JWT tokens for immediate login
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=PasswordChangeSerializer,
    responses={200: {"type": "object", "properties": {"message": {"type": "string"}}}},
    description="Change current user's password"
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response({'message': 'Password changed successfully'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: {"type": "object", "properties": {"detail": {"type": "string"}}}},
    description="Resend invitation email to a user"
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reinvite_user_view(request, pk):
    """Resend invitation email to a user"""
    from django.core.mail import send_mail
    from django.conf import settings

    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    invited_by = request.user

    # Generate a magic link token for the user
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    # Build the login link
    app_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000'
    login_link = f"{app_url}/login?token={access_token}"

    # Send invitation email
    if user.email:
        inviter_name = invited_by.get_full_name() or invited_by.email
        store_name = user.store.name if user.store else 'your store'

        subject = f"{inviter_name} invited you to PeakOps"
        message = f"""
Hi {user.first_name or user.email},

{inviter_name} has invited you to join {store_name} on PeakOps!

What is PeakOps?
PeakOps helps your team maintain operational excellence through quick daily checks. Instead of lengthy inspections, you'll complete 3 micro-checks each day (takes just 2 minutes) to keep your store running smoothly.

Your Role: {user.get_role_display()}
You'll receive daily check reminders via email and can complete them right from your phone or computer.

Click here to get started:
{login_link}

This link will log you in automatically. Once you're in, you can run your first micro-check from the dashboard.

Welcome to the team,
PeakOps
        """

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            return Response({'detail': 'Invitation email sent successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': f'Failed to send email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'detail': 'User has no email address'}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=QuickSignupSerializer,
    responses={201: UserSerializer, 400: None},
    description="Streamlined passwordless trial signup - creates account with phone + magic link"
)
@api_view(['POST'])
@permission_classes([AllowAny])
def quick_signup_view(request):
    """
    Streamlined trial signup flow:
    1. Collect phone, email (optional), store name, industry
    2. Create user with TRIAL_ADMIN role OR update existing user
    3. Create brand + store
    4. Seed 15 micro-check templates
    5. Create first MicroCheckRun with 3 items
    6. Generate magic link token
    7. Send SMS/email with magic link
    8. Return user info + tokens + magic link
    """
    from micro_checks.utils import send_magic_link_email

    # Try normal signup flow - serializer will handle existing users
    serializer = QuickSignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        # Generate JWT tokens for immediate login
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        # Get quick signup data stored by serializer
        quick_signup_data = getattr(user, '_quick_signup_data', {})
        store_name = user.store.name if user.store else "Your Store"
        magic_token = quick_signup_data.get('magic_token')

        # Determine recipient name - use first name if available, otherwise just friendly greeting
        recipient_name = user.first_name if user.first_name else None

        # Send magic link via email (primary method during Twilio verification)
        email_sent = send_magic_link_email(
            email=user.email,
            token=magic_token,
            store_name=store_name,
            recipient_name=recipient_name
        )

        # Set delivery method
        delivery_method = 'email' if email_sent else None

        # SMS will be enabled after Twilio verification
        sms_sent = False

        return Response({
            'user_id': user.id,
            'access': str(access_token),
            'refresh': str(refresh),
            'magic_token': magic_token,
            'run_id': quick_signup_data.get('run_id'),
            'sms_sent': sms_sent,
            'email_sent': email_sent,
            'delivery_method': delivery_method
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NudgeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing smart nudges"""
    serializer_class = SmartNudgeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return pending nudges for current user"""
        return SmartNudge.objects.filter(
            user=self.request.user,
            status__in=[SmartNudge.Status.PENDING, SmartNudge.Status.SHOWN],
            show_after__lte=timezone.now()
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )
    
    @action(detail=True, methods=['post'])
    def mark_shown(self, request, pk=None):
        """Mark nudge as shown to user"""
        nudge = self.get_object()
        nudge.mark_shown()
        return Response({'status': 'marked_shown'})
    
    @action(detail=True, methods=['post'])
    def mark_clicked(self, request, pk=None):
        """Mark nudge as clicked by user"""
        nudge = self.get_object()
        nudge.mark_clicked()
        return Response({'status': 'marked_clicked'})
    
    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Dismiss nudge"""
        nudge = self.get_object()
        nudge.mark_dismissed()
        return Response({'status': 'dismissed'})


class BehaviorTrackingViewSet(viewsets.GenericViewSet):
    """ViewSet for tracking user behavioral events"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def track_event(self, request):
        """Track a behavioral event"""
        serializer = BehaviorEventCreateSerializer(data=request.data)
        if serializer.is_valid():
            event = BehaviorTracker.track(
                user=request.user,
                event_type=serializer.validated_data['event_type'],
                metadata=serializer.validated_data.get('metadata', {}),
                session_id=serializer.validated_data.get('session_id')
            )
            return Response({
                'id': event.id,
                'event_type': event.event_type,
                'timestamp': event.timestamp,
                'status': 'tracked'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def demo_started(self, request):
        """Track demo started event"""
        event = BehaviorTracker.track_demo_started(
            user=request.user,
            session_id=request.data.get('session_id')
        )
        return Response({'id': event.id, 'status': 'tracked'})
    
    @action(detail=False, methods=['post'])
    def demo_completed(self, request):
        """Track demo completed event"""
        event = BehaviorTracker.track_demo_completed(
            user=request.user,
            session_id=request.data.get('session_id')
        )
        return Response({'id': event.id, 'status': 'tracked'})
    
    @action(detail=False, methods=['post'])
    def demo_skipped(self, request):
        """Track demo skipped event"""
        event = BehaviorTracker.track_demo_skipped(
            user=request.user,
            session_id=request.data.get('session_id')
        )
        return Response({'id': event.id, 'status': 'tracked'})
    
    @action(detail=False, methods=['post'])
    def dashboard_view(self, request):
        """Track dashboard view event"""
        event = BehaviorTracker.track_dashboard_view(
            user=request.user,
            session_id=request.data.get('session_id')
        )
        return Response({'id': event.id, 'status': 'tracked'})
    
    @action(detail=False, methods=['post'])
    def validate_clicks(self, request):
        """Validate user clicks against demo video violations"""
        from videos.models import Video
        
        data = request.data
        video_id = data.get('video_id')
        clicks = data.get('clicks', [])
        
        if not video_id or not clicks:
            return Response(
                {'error': 'video_id and clicks are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            video = Video.objects.get(id=video_id, is_demo=True, demo_type='TRY')
        except Video.DoesNotExist:
            return Response(
                {'error': 'Demo video not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        violations = video.demo_violations or []
        found_violations = []
        missed_violations = []
        
        # Validate each click against violations
        for violation in violations:
            violation_found = False
            
            for click in clicks:
                if self._is_click_valid(click, violation):
                    found_violations.append({
                        'id': violation['id'],
                        'title': violation['title'],
                        'category': violation['category'],
                        'severity': violation['severity']
                    })
                    violation_found = True
                    break
            
            if not violation_found:
                missed_violations.append({
                    'id': violation['id'],
                    'title': violation['title'],
                    'category': violation['category'],
                    'severity': violation['severity'],
                    'bbox': violation['bbox'],
                    'timestamp': violation['timestamp'],
                    'why_missed': self._get_miss_reason(violation)
                })
        
        # Calculate performance score
        total_violations = len(violations)
        found_count = len(found_violations)
        score_percentage = (found_count / total_violations * 100) if total_violations > 0 else 0
        
        # Generate feedback message
        feedback = self._generate_feedback(found_count, total_violations)
        
        # Track the attempt
        BehaviorTracker.track(
            user=request.user,
            event_type='DEMO_TRY_COMPLETED',
            metadata={
                'video_id': video_id,
                'clicks_count': len(clicks),
                'violations_found': found_count,
                'total_violations': total_violations,
                'score': score_percentage,
                'performance': 'good' if score_percentage >= 50 else 'needs_improvement'
            },
            session_id=data.get('session_id')
        )
        
        return Response({
            'found_violations': found_violations,
            'missed_violations': missed_violations,
            'score': found_count,
            'total': total_violations,
            'score_percentage': round(score_percentage, 1),
            'feedback': feedback
        })
    
    def _is_click_valid(self, click, violation):
        """Check if a click is valid for a violation"""
        # Time tolerance: ±2 seconds
        time_diff = abs(click.get('timestamp', 0) - violation.get('timestamp', 0))
        if time_diff > 2.0:
            return False
        
        # Spatial tolerance: 5% of video dimensions
        tolerance = 0.05
        click_x = click.get('x', 0)  # Normalized coordinates (0-1)
        click_y = click.get('y', 0)
        
        bbox = violation.get('bbox', {})
        bbox_x = bbox.get('x', 0) / 100  # Convert percentage to normalized
        bbox_y = bbox.get('y', 0) / 100
        bbox_w = bbox.get('width', 0) / 100
        bbox_h = bbox.get('height', 0) / 100
        
        # Check if click is within bounding box + tolerance
        return (
            bbox_x - tolerance <= click_x <= bbox_x + bbox_w + tolerance and
            bbox_y - tolerance <= click_y <= bbox_y + bbox_h + tolerance
        )
    
    def _get_miss_reason(self, violation):
        """Generate reason why violation was missed"""
        severity = violation.get('severity', 'LOW')
        category = violation.get('category', 'OTHER')
        
        reasons = {
            'PPE': "PPE violations can be subtle - look for missing gloves, hair nets, or protective equipment",
            'SAFETY': "Safety hazards often blend into the background - check for wet floors, blocked exits, or improper storage",
            'CLEANLINESS': "Cleanliness issues may be small details - look for spills, dirty surfaces, or improper sanitization",
            'UNIFORM': "Uniform violations might seem minor but are important for compliance"
        }
        
        if severity in ['CRITICAL', 'HIGH']:
            return f"This {severity.lower()} {category.lower()} issue requires immediate attention. " + reasons.get(category, "Look more carefully in this area.")
        
        return reasons.get(category, "Small details matter in food safety compliance.")
    
    def _generate_feedback(self, found, total):
        """Generate encouraging feedback based on performance"""
        percentage = (found / total * 100) if total > 0 else 0
        
        if percentage >= 80:
            return f"Excellent eye! You found {found} of {total} violations. You'd make a great inspector!"
        elif percentage >= 60:
            return f"Good job! You spotted {found} of {total} violations. The AI found {total - found} additional subtle issues."
        elif percentage >= 40:
            return f"Nice work! You caught {found} of {total} violations. The AI's trained eye spotted {total - found} more that are easy to miss."
        else:
            return f"You found {found} of {total} violations - a good start! The AI caught {total - found} additional issues that even experienced inspectors might miss."


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_active_nudges(request):
    """Get active nudges for current user"""
    nudges = SmartNudge.objects.filter(
        user=request.user,
        status__in=[SmartNudge.Status.PENDING, SmartNudge.Status.SHOWN],
        show_after__lte=timezone.now()
    ).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    )[:3]  # Limit to 3 nudges

    # Mark as shown if they were pending
    for nudge in nudges:
        if nudge.status == SmartNudge.Status.PENDING:
            nudge.mark_shown()

    serializer = SmartNudgeSerializer(nudges, many=True)
    return Response(serializer.data)


class AdminUserViewSet(viewsets.ModelViewSet):
    """Admin-only viewset for managing all users across tenants"""
    queryset = User.objects.all().select_related('store', 'store__brand')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active', 'is_trial_user', 'store__brand']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'created_at', 'last_active_at']
    ordering = ['-created_at']

    @action(detail=False, methods=['post'])
    def bulk_activate(self, request):
        """Bulk activate users"""
        user_ids = request.data.get('user_ids', [])
        User.objects.filter(id__in=user_ids).update(is_active=True)
        return Response({'status': 'activated', 'count': len(user_ids)})

    @action(detail=False, methods=['post'])
    def bulk_deactivate(self, request):
        """Bulk deactivate users"""
        user_ids = request.data.get('user_ids', [])
        User.objects.filter(id__in=user_ids).update(is_active=False)
        return Response({'status': 'deactivated', 'count': len(user_ids)})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Admin action to reset a user's password"""
        user = self.get_object()
        new_password = request.data.get('new_password')

        if not new_password:
            return Response(
                {'error': 'new_password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters long'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set the new password
        user.set_password(new_password)
        user.save()

        return Response({
            'status': 'success',
            'message': f'Password reset successfully for {user.email}'
        })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def micro_check_delivery_config_view(request):
    """
    GET /api/accounts/micro-check-config/
    Get or update micro-check delivery configuration for the user's account.

    PUT /api/accounts/micro-check-config/
    Update the configuration.
    """
    # Get user's account
    if not request.user.account:
        return Response(
            {'error': 'User not associated with an account'},
            status=status.HTTP_400_BAD_REQUEST
        )

    account = request.user.account

    if request.method == 'GET':
        # Get or create config for this account
        config, created = MicroCheckDeliveryConfig.objects.get_or_create(
            account=account
        )
        serializer = MicroCheckDeliveryConfigSerializer(config)
        return Response(serializer.data)

    elif request.method == 'PUT':
        # Update config
        config, created = MicroCheckDeliveryConfig.objects.get_or_create(
            account=account
        )
        serializer = MicroCheckDeliveryConfigSerializer(
            config,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def micro_check_schedule_preview_view(request):
    """
    GET /api/accounts/micro-check-schedule/
    Get per-employee schedule preview showing who gets checks when.

    Returns list of employees with their next scheduled check date.
    """
    if not request.user.account:
        return Response(
            {'error': 'User not associated with an account'},
            status=status.HTTP_400_BAD_REQUEST
        )

    account = request.user.account

    # Get delivery config
    try:
        config = MicroCheckDeliveryConfig.objects.get(account=account)
    except MicroCheckDeliveryConfig.DoesNotExist:
        config = None

    # Get all potential employees (frontend will filter based on current selection)
    # Return both managers and employees so frontend can preview either mode
    employees = User.objects.filter(
        account=account,
        is_active=True,
        role__in=['GM', 'EMPLOYEE']
    ).select_related('store', 'seven_shifts_employee').order_by('micro_check_next_send_date', 'last_name', 'first_name')

    # Build schedule data
    schedule_data = []
    for employee in employees:
        # Get the 7shifts employee ID if linked
        seven_shifts_employee_id = None
        if hasattr(employee, 'seven_shifts_employee') and employee.seven_shifts_employee:
            seven_shifts_employee_id = str(employee.seven_shifts_employee.id)

        schedule_data.append({
            'id': employee.id,
            'name': employee.full_name,
            'email': employee.email,
            'role': employee.role,
            'store_name': employee.store.name if employee.store else None,
            'last_sent_date': employee.micro_check_last_sent_date.isoformat() if employee.micro_check_last_sent_date else None,
            'next_send_date': employee.micro_check_next_send_date.isoformat() if employee.micro_check_next_send_date else None,
            'seven_shifts_employee_id': seven_shifts_employee_id,
        })

    return Response({
        'cadence_mode': config.cadence_mode if config else 'DAILY',
        'employees': schedule_data
    })


@extend_schema(
    responses={200: UserSerializer},
    description="Start impersonating a user (super admin only)"
)
@api_view(['POST'])
@permission_classes([CanImpersonate])
def start_impersonation_view(request, user_id):
    """
    POST /api/accounts/impersonate/<user_id>/
    Start impersonating a user as a super admin.

    Only super admins can impersonate users, and they cannot impersonate other super admins.
    Returns new JWT tokens with impersonation claims.
    """
    # Verify request user is super admin
    if request.user.role != User.Role.SUPER_ADMIN:
        return Response(
            {'error': 'Only super admins can impersonate users'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get the target user
    try:
        target_user = User.objects.select_related('account', 'store').get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Cannot impersonate other super admins
    if target_user.role == User.Role.SUPER_ADMIN:
        return Response(
            {'error': 'Cannot impersonate other super admins'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Cannot impersonate yourself
    if target_user.id == request.user.id:
        return Response(
            {'error': 'Cannot impersonate yourself'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get client IP and user agent for audit trail
    ip_address = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', '')

    # Create impersonation session
    impersonation_session = ImpersonationSession.objects.create(
        super_admin=request.user,
        impersonated_user=target_user,
        impersonated_account=target_user.account,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # Generate tokens with impersonation claims
    tokens = get_tokens_for_impersonation(
        super_admin=request.user,
        target_user=target_user,
        impersonation_session=impersonation_session
    )

    # Return tokens and user info
    return Response({
        'access': tokens['access'],
        'refresh': tokens['refresh'],
        'user': UserSerializer(target_user).data,
        'impersonation_context': {
            'is_impersonating': True,
            'original_user': {
                'id': request.user.id,
                'email': request.user.email,
                'full_name': request.user.full_name,
            },
            'impersonated_user': {
                'id': target_user.id,
                'email': target_user.email,
                'full_name': target_user.full_name,
                'account_name': target_user.account.name if target_user.account else None,
            },
            'session_id': impersonation_session.id,
        }
    })


@extend_schema(
    responses={200: UserSerializer},
    description="Stop impersonating and return to super admin account"
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def stop_impersonation_view(request):
    """
    POST /api/accounts/stop-impersonation/
    Stop impersonating and return to the original super admin account.

    Requires an active impersonation session in the JWT token.
    """
    # Check if currently impersonating
    impersonation_context = get_impersonation_context_from_request(request)

    if not impersonation_context or not impersonation_context.get('is_impersonating'):
        return Response(
            {'error': 'Not currently impersonating anyone'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the original super admin user
    try:
        super_admin = User.objects.get(id=impersonation_context['original_user_id'])
    except User.DoesNotExist:
        return Response(
            {'error': 'Original user not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # End the impersonation session
    try:
        impersonation_session = ImpersonationSession.objects.get(
            id=impersonation_context['impersonation_session_id']
        )
        impersonation_session.end_session()
    except ImpersonationSession.DoesNotExist:
        pass  # Session might have already been ended

    # Generate normal tokens for the super admin
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(super_admin)
    access_token = refresh.access_token

    # Return tokens and user info
    return Response({
        'access': str(access_token),
        'refresh': str(refresh),
        'user': UserSerializer(super_admin).data,
        'impersonation_context': {
            'is_impersonating': False,
            'original_user': None,
            'impersonated_user': None,
        }
    })


@extend_schema(
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'email': {
                    'type': 'string',
                    'format': 'email',
                    'description': 'User email address'
                }
            },
            'required': ['email']
        }
    },
    responses={
        200: {
            'type': 'object',
            'properties': {
                'message': {'type': 'string'},
                'email': {'type': 'string'}
            }
        },
        400: {'description': 'Invalid email or user not found'}
    },
    description="Request a passwordless magic link login email"
)
@api_view(['POST'])
@permission_classes([AllowAny])
def request_magic_link_view(request):
    """Request a magic link for passwordless login"""
    from .models import PasswordlessLoginToken
    from django.core.mail import EmailMultiAlternatives
    from django.conf import settings

    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response(
            {'error': 'Email is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user exists
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        # Return success even if user doesn't exist (security: don't leak user existence)
        return Response({
            'message': 'If an account exists with that email, we sent you a login link.',
            'email': email
        })

    # Generate login token (15 minutes expiry)
    login_token = PasswordlessLoginToken.generate_token(user, expires_in_minutes=15)

    # Build magic link URL
    web_url = getattr(settings, 'WEB_APP_URL', 'http://localhost:5173')
    magic_link = f"{web_url}/login?token={login_token.token}"

    # Send email
    subject = "Sign in to PeakOps"

    text_content = f"""Hi {user.first_name or 'there'},

Click the link below to sign in to your PeakOps account:

{magic_link}

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.

Thanks,
The PeakOps Team
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {user.first_name or 'there'},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">Click the button below to sign in to your PeakOps account:</p>

    <div style="text-align: center; margin: 32px 0;">
        <a href="{magic_link}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Sign In to PeakOps</a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Or copy and paste this link into your browser:</p>
    <p style="font-size: 14px; color: #0d9488; word-break: break-all; margin-bottom: 20px;">{magic_link}</p>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">This link will expire in <strong>15 minutes</strong>.</p>

    <p style="font-size: 14px; color: #6b7280;">If you didn't request this email, you can safely ignore it.</p>

    <p style="font-size: 16px; margin-top: 32px;">Thanks,<br>The PeakOps Team</p>
</body>
</html>
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
    except Exception as e:
        # Log error but don't expose it to user
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send magic link email to {email}: {str(e)}")

    return Response({
        'message': 'If an account exists with that email, we sent you a login link.',
        'email': email
    })


@extend_schema(
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'token': {
                    'type': 'string',
                    'description': 'Magic link login token'
                }
            },
            'required': ['token']
        }
    },
    responses={
        200: {
            'type': 'object',
            'properties': {
                'access': {'type': 'string'},
                'refresh': {'type': 'string'},
                'user': {'type': 'object'}
            }
        },
        400: {'description': 'Invalid or expired token'},
        404: {'description': 'Token not found'}
    },
    description="Verify magic link token and log in"
)
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_magic_link_view(request):
    """Verify magic link token and log user in"""
    from .models import PasswordlessLoginToken

    token = request.data.get('token', '').strip()

    if not token:
        return Response(
            {'error': 'Token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find token
    try:
        login_token = PasswordlessLoginToken.objects.select_related('user').get(token=token)
    except PasswordlessLoginToken.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired login link'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if token is valid
    if not login_token.is_valid:
        if login_token.used_at:
            return Response(
                {'error': 'This login link has already been used'},
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            return Response(
                {'error': 'This login link has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Mark token as used
    login_token.mark_as_used()

    # Log the user in
    user = login_token.user
    refresh = RefreshToken.for_user(user)
    access_token = refresh.access_token

    # Update last login
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])

    return Response({
        'access': str(access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    })