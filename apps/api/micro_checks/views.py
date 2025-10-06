from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg
from drf_spectacular.utils import extend_schema, OpenApiParameter

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
from .serializers import (
    MicroCheckTemplateSerializer,
    MicroCheckRunSerializer,
    MicroCheckRunItemSerializer,
    MicroCheckAssignmentSerializer,
    MediaAssetSerializer,
    MicroCheckResponseSerializer,
    CheckCoverageSerializer,
    MicroCheckStreakSerializer,
    CorrectiveActionSerializer
)
from .utils import (
    hash_token,
    get_store_local_date,
    create_corrective_action_for_failure
)
from .tasks import process_micro_check_response


class MicroCheckTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing micro-check templates.

    Templates define the checks that can be assigned to managers.
    """
    queryset = MicroCheckTemplate.objects.all()
    serializer_class = MicroCheckTemplateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['category', 'severity', 'is_active']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'category', 'severity']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @extend_schema(
        summary="Get active templates by category",
        parameters=[
            OpenApiParameter(name='category', description='Category to filter by', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get all active templates for a specific category"""
        category = request.query_params.get('category')
        if not category:
            return Response({'error': 'category parameter required'}, status=400)

        templates = self.queryset.filter(category=category, is_active=True)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)


class MicroCheckRunViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing micro-check runs.

    A run represents a set of 3 checks scheduled for a specific date.
    """
    queryset = MicroCheckRun.objects.select_related('store', 'created_by').prefetch_related('items')
    serializer_class = MicroCheckRunSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['store', 'status', 'scheduled_for']
    ordering_fields = ['scheduled_for', 'created_at']
    ordering = ['-scheduled_for']

    def get_queryset(self):
        """Filter runs based on user's accessible stores"""
        user = self.request.user

        # Admins see all
        if user.role == 'ADMIN':
            return self.queryset

        # GMs see their stores
        if user.role == 'GM':
            return self.queryset.filter(store__in=user.managed_stores.all())

        # Inspectors see nothing (micro-checks are for managers only)
        return self.queryset.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @extend_schema(
        summary="Get pending runs for a store",
        parameters=[
            OpenApiParameter(name='store_id', description='Store ID', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending runs for a store"""
        store_id = request.query_params.get('store_id')
        if not store_id:
            return Response({'error': 'store_id parameter required'}, status=400)

        runs = self.get_queryset().filter(store_id=store_id, status='PENDING')
        serializer = self.get_serializer(runs, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Get run statistics for a store",
        parameters=[
            OpenApiParameter(name='store_id', description='Store ID', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get completion statistics for a store"""
        store_id = request.query_params.get('store_id')
        if not store_id:
            return Response({'error': 'store_id parameter required'}, status=400)

        runs = self.get_queryset().filter(store_id=store_id)

        total = runs.count()
        completed = runs.filter(status='COMPLETED').count()
        pending = runs.filter(status='PENDING').count()
        expired = runs.filter(status='EXPIRED').count()

        return Response({
            'total': total,
            'completed': completed,
            'pending': pending,
            'expired': expired,
            'completion_rate': (completed / total * 100) if total > 0 else 0
        })

    @extend_schema(
        summary="Get run by magic link token",
        parameters=[
            OpenApiParameter(name='token', description='Magic link token', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def by_token(self, request):
        """Get run details using a magic link token (no authentication required)."""
        from .utils import hash_token

        token = request.query_params.get('token')
        if not token:
            return Response({'error': 'token required'}, status=400)

        # Hash the token to look up assignment
        token_hash = hash_token(token)

        try:
            assignment = MicroCheckAssignment.objects.select_related('run__store').get(
                access_token_hash=token_hash
            )
        except MicroCheckAssignment.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=404)

        # Check if token is expired
        if assignment.token_expires_at < timezone.now():
            return Response({'error': 'Token expired'}, status=403)

        # Update usage tracking
        if assignment.first_used_at is None:
            assignment.first_used_at = timezone.now()

        assignment.use_count += 1
        assignment.last_used_at = timezone.now()

        # Track IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            assignment.ip_last_used = x_forwarded_for.split(',')[0]
        else:
            assignment.ip_last_used = request.META.get('REMOTE_ADDR')

        assignment.save()

        serializer = self.get_serializer(assignment.run)
        return Response(serializer.data)

    @extend_schema(
        summary="Create an instant check run for current user",
        parameters=[
            OpenApiParameter(name='store_id', description='Store ID (optional, uses user store if not provided)', required=False, type=int)
        ]
    )
    @action(detail=False, methods=['post'])
    def create_instant_run(self, request):
        """
        Create an instant micro-check run for the authenticated user.

        This allows managers to start a check on-demand without waiting for scheduled SMS.
        Returns the run details and a magic link token to start the checks immediately.
        """
        from brands.models import Store
        from .tasks import _create_run_for_store
        from .utils import generate_magic_link_token, hash_token, get_store_local_date

        user = request.user

        # Get store from request or user's store
        store_id = request.data.get('store_id') or user.store
        if not store_id:
            return Response({'error': 'No store associated with user'}, status=400)

        try:
            store = Store.objects.get(id=store_id)
        except Store.DoesNotExist:
            return Response({'error': 'Store not found'}, status=404)

        # Check permissions - user must have access to this store
        if user.role != 'ADMIN' and store_id != user.store:
            if user.role == 'GM' and store not in user.managed_stores.all():
                return Response({'error': 'No access to this store'}, status=403)

        # Get today's local date for the store
        local_date = get_store_local_date(store)

        # Check if a run already exists for today
        existing_run = MicroCheckRun.objects.filter(
            store=store,
            scheduled_for=local_date
        ).first()

        if existing_run:
            # Create new assignment for existing run
            raw_token = generate_magic_link_token()
            token_hash = hash_token(raw_token)
            token_expires_at = timezone.now() + timezone.timedelta(hours=24)

            assignment = MicroCheckAssignment.objects.create(
                run=existing_run,
                store=store,
                sent_to=user,
                access_token_hash=token_hash,
                token_expires_at=token_expires_at,
                purpose='RUN_ACCESS',
                scope={'run_id': str(existing_run.id), 'store_id': store.id},
                sent_via='WEB',
                first_used_at=timezone.now()
            )

            serializer = self.get_serializer(existing_run)
            return Response({
                'run': serializer.data,
                'token': raw_token,
                'message': 'Using existing run for today'
            })

        # Create new run
        run = _create_run_for_store(store, local_date)

        if not run:
            return Response({'error': 'Failed to create run'}, status=500)

        # Generate magic link token
        raw_token = generate_magic_link_token()
        token_hash = hash_token(raw_token)

        # Create assignment for the current user
        token_expires_at = timezone.now() + timezone.timedelta(hours=24)
        assignment = MicroCheckAssignment.objects.create(
            run=run,
            store=store,
            sent_to=user,
            access_token_hash=token_hash,
            token_expires_at=token_expires_at,
            purpose='RUN_ACCESS',
            scope={'run_id': str(run.id), 'store_id': store.id},
            sent_via='WEB',
            first_used_at=timezone.now()
        )

        serializer = self.get_serializer(run)
        return Response({
            'run': serializer.data,
            'token': raw_token,
            'message': 'Created new run for today'
        }, status=status.HTTP_201_CREATED)


class MicroCheckResponseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for submitting and viewing micro-check responses.

    This is the core endpoint where managers submit their check results.
    """
    queryset = MicroCheckResponse.objects.select_related(
        'run_item__run',
        'store',
        'completed_by'
    )
    serializer_class = MicroCheckResponseSerializer
    filterset_fields = ['store', 'category', 'status', 'severity']
    ordering_fields = ['completed_at', 'created_at']
    ordering = ['-completed_at']

    def get_permissions(self):
        """Allow unauthenticated access for magic link submissions"""
        if self.action == 'submit_via_magic_link':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Filter responses based on user's accessible stores"""
        user = self.request.user

        if not user.is_authenticated:
            return self.queryset.none()

        # Admins see all
        if user.role == 'ADMIN':
            return self.queryset

        # GMs see their stores
        if user.role == 'GM':
            return self.queryset.filter(store__in=user.managed_stores.all())

        return self.queryset.none()

    def perform_create(self, serializer):
        """Auto-populate metadata when creating response"""
        # Get IP address
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = self.request.META.get('REMOTE_ADDR')

        # Get user agent
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')

        # Calculate local completed date
        run_item = serializer.validated_data['run_item']
        store = run_item.run.store
        local_date = get_store_local_date(store)

        response = serializer.save(
            completed_by=self.request.user,
            store=store,
            category=run_item.category_snapshot,
            severity=run_item.severity_snapshot,
            completed_at=timezone.now(),
            local_completed_date=local_date,
            ip_address=ip_address,
            user_agent=user_agent,
            created_by=self.request.user
        )

        # Trigger async processing
        process_micro_check_response.delay(str(response.id))

    @extend_schema(
        summary="Submit response via magic link",
        request=MicroCheckResponseSerializer,
        parameters=[
            OpenApiParameter(name='token', description='Magic link token', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def submit_via_magic_link(self, request):
        """
        Submit a response using a magic link token (no authentication required).

        This is the primary entry point for managers clicking magic links.
        """
        token = request.data.get('token') or request.query_params.get('token')
        if not token:
            return Response({'error': 'token required'}, status=400)

        # Hash the token to look up assignment
        token_hash = hash_token(token)

        try:
            assignment = MicroCheckAssignment.objects.select_related(
                'run__store',
                'manager'
            ).get(token_hash=token_hash)
        except MicroCheckAssignment.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=404)

        # Validate token not expired
        if assignment.expires_at < timezone.now():
            return Response({'error': 'Token expired'}, status=403)

        # Update access tracking
        if assignment.first_accessed_at is None:
            assignment.first_accessed_at = timezone.now()
            assignment.status = 'ACCESSED'

        assignment.access_count += 1

        # Track IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            assignment.last_access_ip = x_forwarded_for.split(',')[0]
        else:
            assignment.last_access_ip = request.META.get('REMOTE_ADDR')

        assignment.save()

        # Get run details
        run = assignment.run
        store = run.store
        local_date = get_store_local_date(store)

        # Process the response data
        run_item_id = request.data.get('run_item')
        if not run_item_id:
            return Response({'error': 'run_item required'}, status=400)

        try:
            run_item = MicroCheckRunItem.objects.get(id=run_item_id, run=run)
        except MicroCheckRunItem.DoesNotExist:
            return Response({'error': 'Invalid run_item for this run'}, status=400)

        # Create response
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get IP and user agent
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')

        user_agent = request.META.get('HTTP_USER_AGENT', '')

        response = serializer.save(
            completed_by=assignment.manager,
            store=store,
            category=run_item.category_snapshot,
            severity=run_item.severity_snapshot,
            completed_at=timezone.now(),
            local_completed_date=local_date,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Trigger async processing
        process_micro_check_response.delay(str(response.id))

        return Response(
            MicroCheckResponseSerializer(response).data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        summary="Get responses by category",
        parameters=[
            OpenApiParameter(name='store_id', description='Store ID', required=True, type=str),
            OpenApiParameter(name='category', description='Category', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get responses filtered by store and category"""
        store_id = request.query_params.get('store_id')
        category = request.query_params.get('category')

        if not store_id or not category:
            return Response({'error': 'store_id and category required'}, status=400)

        responses = self.get_queryset().filter(store_id=store_id, category=category)
        serializer = self.get_serializer(responses, many=True)
        return Response(serializer.data)


class MicroCheckStreakViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing streak information.

    Read-only - streaks are calculated automatically by tasks.
    """
    queryset = MicroCheckStreak.objects.select_related('store', 'user')
    serializer_class = MicroCheckStreakSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['store', 'user']
    ordering_fields = ['current_streak', 'longest_streak', 'last_completed_date']
    ordering = ['-current_streak']

    def get_queryset(self):
        """Filter streaks based on user's accessible stores"""
        user = self.request.user

        # Admins see all
        if user.role == 'ADMIN':
            return self.queryset

        # GMs see their stores
        if user.role == 'GM':
            return self.queryset.filter(store__in=user.managed_stores.all())

        return self.queryset.none()

    @extend_schema(
        summary="Get leaderboard for a store",
        parameters=[
            OpenApiParameter(name='store_id', description='Store ID', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """Get streak leaderboard for a store"""
        store_id = request.query_params.get('store_id')
        if not store_id:
            return Response({'error': 'store_id parameter required'}, status=400)

        streaks = self.get_queryset().filter(
            store_id=store_id
        ).order_by('-current_streak', '-longest_streak')[:10]

        serializer = self.get_serializer(streaks, many=True)
        return Response(serializer.data)


class CorrectiveActionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing corrective actions.

    Auto-created from failures, but can be manually managed.
    """
    queryset = CorrectiveAction.objects.select_related(
        'response',
        'store',
        'assigned_to',
        'resolved_by'
    )
    serializer_class = CorrectiveActionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['store', 'category', 'severity', 'assigned_to']
    ordering_fields = ['due_date', 'created_at', 'resolved_at']
    ordering = ['due_date']

    def get_queryset(self):
        """Filter actions based on user's accessible stores"""
        user = self.request.user

        # Admins see all
        if user.role == 'ADMIN':
            return self.queryset

        # GMs see their stores or actions assigned to them
        if user.role == 'GM':
            return self.queryset.filter(
                Q(store__in=user.managed_stores.all()) | Q(assigned_to=user)
            )

        return self.queryset.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @extend_schema(
        summary="Mark action as resolved",
        request=CorrectiveActionSerializer
    )
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark a corrective action as resolved"""
        action = self.get_object()

        if action.resolved_at:
            return Response({'error': 'Already resolved'}, status=400)

        action.resolved_at = timezone.now()
        action.resolved_by = request.user
        action.resolution_notes = request.data.get('resolution_notes', '')
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)

    @extend_schema(
        summary="Get overdue actions",
        parameters=[
            OpenApiParameter(name='store_id', description='Store ID (optional)', required=False, type=str)
        ]
    )
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue corrective actions"""
        today = timezone.now().date()
        actions = self.get_queryset().filter(
            due_date__lt=today,
            resolved_at__isnull=True
        )

        store_id = request.query_params.get('store_id')
        if store_id:
            actions = actions.filter(store_id=store_id)

        serializer = self.get_serializer(actions, many=True)
        return Response(serializer.data)


class CheckCoverageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing check coverage statistics.

    Read-only - coverage is tracked automatically.
    """
    queryset = CheckCoverage.objects.select_related('store', 'template')
    serializer_class = CheckCoverageSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['store', 'category', 'template']
    ordering_fields = ['last_used_date', 'times_used', 'consecutive_passes', 'consecutive_fails']
    ordering = ['-last_used_date']

    def get_queryset(self):
        """Filter coverage based on user's accessible stores"""
        user = self.request.user

        # Admins see all
        if user.role == 'ADMIN':
            return self.queryset

        # GMs see their stores
        if user.role == 'GM':
            return self.queryset.filter(store__in=user.managed_stores.all())

        return self.queryset.none()

    @extend_schema(
        summary="Get coverage summary by category",
        parameters=[
            OpenApiParameter(name='store_id', description='Store ID', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get coverage summary grouped by category"""
        store_id = request.query_params.get('store_id')
        if not store_id:
            return Response({'error': 'store_id parameter required'}, status=400)

        coverage = self.get_queryset().filter(
            store_id=store_id
        ).values('category').annotate(
            total_checks=Count('id'),
            avg_consecutive_passes=Avg('consecutive_passes'),
            avg_consecutive_fails=Avg('consecutive_fails')
        )

        return Response(coverage)
