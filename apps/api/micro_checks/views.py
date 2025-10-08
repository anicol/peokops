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

    Access Control:
    - ADMIN: Full access (create, edit, delete, publish, archive)
    - OWNER: View all for their brand, can clone templates
    - GM: View-only access to assigned templates
    - INSPECTOR: No access
    """
    queryset = MicroCheckTemplate.objects.all()
    serializer_class = MicroCheckTemplateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['category', 'severity', 'is_active', 'brand', 'is_local']
    search_fields = ['title', 'description', 'success_criteria']
    ordering_fields = ['created_at', 'category', 'severity', 'rotation_priority']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter templates based on user role and brand access"""
        user = self.request.user

        # ADMIN sees all templates
        if user.role == 'ADMIN':
            return self.queryset

        # OWNER sees templates for their brand + global templates
        if user.role == 'OWNER':
            if user.store and user.store.brand:
                return self.queryset.filter(
                    Q(brand=user.store.brand) | Q(brand__isnull=True)
                )
            return self.queryset.filter(brand__isnull=True)

        # GM sees templates for their brand (read-only)
        if user.role == 'GM':
            if user.store and user.store.brand:
                return self.queryset.filter(
                    Q(brand=user.store.brand) | Q(brand__isnull=True)
                )
            return self.queryset.filter(brand__isnull=True)

        # INSPECTOR has no access to templates
        return self.queryset.none()

    def perform_create(self, serializer):
        """Only ADMIN can create templates"""
        if self.request.user.role != 'ADMIN':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only administrators can create templates.")

        # Set brand and creator
        brand = self.request.data.get('brand')
        serializer.save(
            created_by=self.request.user,
            brand_id=brand if brand else None
        )

    def perform_update(self, serializer):
        """Only ADMIN can update templates"""
        if self.request.user.role != 'ADMIN':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only administrators can edit templates.")

        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        """Only ADMIN can delete templates"""
        if self.request.user.role != 'ADMIN':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only administrators can delete templates.")

        instance.delete()

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

        templates = self.get_queryset().filter(category=category, is_active=True)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Clone a template",
        request={'application/json': {'type': 'object', 'properties': {'title': {'type': 'string'}}}},
        responses={201: MicroCheckTemplateSerializer}
    )
    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        """
        Clone a template to create a new variant.

        ADMIN can clone any template.
        OWNER can clone to create local (franchise-specific) templates.
        """
        user = request.user

        # Only ADMIN and OWNER can clone
        if user.role not in ['ADMIN', 'OWNER']:
            return Response(
                {'error': 'Only administrators and franchise owners can clone templates.'},
                status=status.HTTP_403_FORBIDDEN
            )

        template = self.get_object()
        new_title = request.data.get('title', f"{template.title} (Copy)")

        # Determine brand for cloned template
        if user.role == 'OWNER':
            # Owner creates local template for their brand
            cloned_brand = user.store.brand if user.store else None
            is_local = True
        else:
            # Admin can clone to any brand or global
            cloned_brand = None if not request.data.get('brand') else request.data.get('brand')
            is_local = request.data.get('is_local', False)

        # Create clone
        cloned = MicroCheckTemplate.objects.create(
            brand=cloned_brand,
            category=template.category,
            severity=template.severity,
            title=new_title,
            description=template.description,
            success_criteria=template.success_criteria,
            parent_template=template,
            version=1,
            default_photo_required=template.default_photo_required,
            default_video_required=template.default_video_required,
            expected_completion_seconds=template.expected_completion_seconds,
            ai_validation_enabled=template.ai_validation_enabled,
            ai_validation_prompt=template.ai_validation_prompt,
            is_local=is_local,
            include_in_rotation=True,
            rotation_priority=template.rotation_priority,
            is_active=True,
            created_by=user
        )

        serializer = self.get_serializer(cloned)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Archive a template (soft delete)",
        responses={200: MicroCheckTemplateSerializer}
    )
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """
        Archive a template (soft delete).

        Only ADMIN can archive templates.
        Archived templates are excluded from rotation but preserved for history.
        """
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can archive templates.'},
                status=status.HTTP_403_FORBIDDEN
            )

        template = self.get_object()
        template.is_active = False
        template.include_in_rotation = False
        template.updated_by = request.user
        template.save()

        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @extend_schema(
        summary="Publish new version of template",
        request={'application/json': {
            'type': 'object',
            'properties': {
                'description': {'type': 'string'},
                'success_criteria': {'type': 'string'},
                'default_photo_required': {'type': 'boolean'},
                'default_video_required': {'type': 'boolean'},
                'expected_completion_seconds': {'type': 'integer'},
                'rotation_priority': {'type': 'integer'},
            }
        }},
        responses={201: MicroCheckTemplateSerializer}
    )
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """
        Publish a new version of a template.

        Only ADMIN can publish new versions.
        This creates v2, v3, etc. and deactivates the old version.
        Old versions are preserved for historical accuracy.
        """
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can publish new template versions.'},
                status=status.HTTP_403_FORBIDDEN
            )

        old_template = self.get_object()

        # Create new version with updated fields
        new_version = MicroCheckTemplate.objects.create(
            brand=old_template.brand,
            category=request.data.get('category', old_template.category),
            severity=request.data.get('severity', old_template.severity),
            title=request.data.get('title', old_template.title),
            description=request.data.get('description', old_template.description),
            success_criteria=request.data.get('success_criteria', old_template.success_criteria),
            parent_template=old_template,
            version=old_template.version + 1,
            default_photo_required=request.data.get('default_photo_required', old_template.default_photo_required),
            default_video_required=request.data.get('default_video_required', old_template.default_video_required),
            expected_completion_seconds=request.data.get('expected_completion_seconds', old_template.expected_completion_seconds),
            ai_validation_enabled=request.data.get('ai_validation_enabled', old_template.ai_validation_enabled),
            ai_validation_prompt=request.data.get('ai_validation_prompt', old_template.ai_validation_prompt),
            is_local=old_template.is_local,
            include_in_rotation=True,
            rotation_priority=request.data.get('rotation_priority', old_template.rotation_priority),
            is_active=True,
            created_by=request.user
        )

        # Deactivate old version
        old_template.is_active = False
        old_template.include_in_rotation = False
        old_template.updated_by = request.user
        old_template.save()

        serializer = self.get_serializer(new_version)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Get version history for a template",
        responses={200: MicroCheckTemplateSerializer(many=True)}
    )
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Get complete version history for a template.

        Returns all versions (ancestors and descendants) sorted by version number.
        ADMIN and OWNER can view history.
        """
        user = request.user
        if user.role not in ['ADMIN', 'OWNER']:
            return Response(
                {'error': 'Permission denied.'},
                status=status.HTTP_403_FORBIDDEN
            )

        template = self.get_object()

        # Get all versions in this template's lineage
        versions = [template]

        # Walk backwards to find all ancestors
        current = template.parent_template
        while current:
            versions.append(current)
            current = current.parent_template

        # Walk forwards to find all descendants
        descendants = MicroCheckTemplate.objects.filter(parent_template=template)
        versions.extend(list(descendants))

        # Remove duplicates and sort by version number (descending)
        versions = sorted(set(versions), key=lambda t: t.version, reverse=True)

        serializer = self.get_serializer(versions, many=True)
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
        store_id = request.data.get('store_id')
        if not store_id:
            if hasattr(user, 'store') and user.store:
                store_id = user.store.id
            else:
                return Response({'error': 'No store associated with user'}, status=400)

        try:
            store = Store.objects.get(id=store_id)
        except Store.DoesNotExist:
            return Response({'error': 'Store not found'}, status=404)

        # Check permissions - user must have access to this store
        user_store_id = user.store.id if hasattr(user, 'store') and user.store else None
        if user.role != 'ADMIN' and store_id != user_store_id:
            if user.role == 'GM' and store not in user.managed_stores.all():
                return Response({'error': 'No access to this store'}, status=403)

        # Get today's local date for the store
        local_date = get_store_local_date(store)

        # Check if any active templates exist before creating run
        from .utils import select_templates_for_run
        selected_templates = select_templates_for_run(store, num_items=3)

        if not selected_templates:
            return Response({
                'error': 'NO_TEMPLATES',
                'message': 'No active templates available for Quick Checks. Please configure templates first.',
                'user_role': user.role,
                'can_configure': user.role in ['ADMIN', 'OWNER']
            }, status=status.HTTP_400_BAD_REQUEST)

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
                'sent_to'
            ).get(access_token_hash=token_hash)
        except MicroCheckAssignment.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=404)

        # Validate token not expired
        if assignment.token_expires_at < timezone.now():
            return Response({'error': 'Token expired'}, status=403)

        # Update access tracking
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

        # Track user agent
        assignment.user_agent_last_used = request.META.get('HTTP_USER_AGENT', '')

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
            completed_by=assignment.sent_to,
            store=store,
            category=run_item.category_snapshot,
            severity=run_item.severity_snapshot,
            completed_at=timezone.now(),
            local_completed_date=local_date,
            ip_address=ip_address,
            user_agent=user_agent,
            created_by=assignment.sent_to
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
