from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg
from django.core.files.storage import default_storage
from drf_spectacular.utils import extend_schema, OpenApiParameter
import hashlib
import uuid

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
from .serializers import (
    MicroCheckTemplateSerializer,
    MicroCheckRunSerializer,
    MicroCheckRunItemSerializer,
    MicroCheckAssignmentSerializer,
    MediaAssetSerializer,
    MicroCheckResponseSerializer,
    CheckCoverageSerializer,
    MicroCheckStreakSerializer,
    StoreStreakSerializer,
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
    ordering_fields = ['created_at', 'category', 'severity', 'rotation_priority', 'title']
    ordering = ['-created_at']  # Show newest templates first

    def get_queryset(self):
        """Filter templates based on user role and brand access"""
        user = self.request.user
        queryset = self.queryset

        # ADMIN sees all templates
        if user.role == 'ADMIN':
            return queryset

        # For non-admin users, apply brand filtering
        # If a specific brand is requested in query params, show only that brand's templates
        brand_param = self.request.query_params.get('brand')
        if brand_param:
            # Show only templates for the specified brand (excludes global templates)
            if user.role in ['OWNER', 'TRIAL_ADMIN', 'GM']:
                if user.store and user.store.brand and str(user.store.brand.id) == brand_param:
                    return queryset.filter(brand=user.store.brand)
            return queryset.none()

        # If is_local=false is requested, show global templates
        is_local_param = self.request.query_params.get('is_local')
        if is_local_param == 'false':
            return queryset.filter(brand__isnull=True)

        # Default: OWNER and TRIAL_ADMIN see templates for their brand + global templates
        if user.role in ['OWNER', 'TRIAL_ADMIN']:
            if user.store and user.store.brand:
                return queryset.filter(
                    Q(brand=user.store.brand) | Q(brand__isnull=True)
                )
            return queryset.filter(brand__isnull=True)

        # GM sees templates for their brand + global templates (read-only)
        if user.role == 'GM':
            if user.store and user.store.brand:
                return queryset.filter(
                    Q(brand=user.store.brand) | Q(brand__isnull=True)
                )
            return queryset.filter(brand__isnull=True)

        # INSPECTOR has no access to templates
        return queryset.none()

    def perform_create(self, serializer):
        """ADMIN, OWNER, and TRIAL_ADMIN can create templates"""
        from rest_framework.exceptions import PermissionDenied

        user = self.request.user
        if user.role not in ['ADMIN', 'OWNER', 'TRIAL_ADMIN']:
            raise PermissionDenied("Only administrators and managers can create templates.")

        # Set brand and creator
        brand = self.request.data.get('brand')

        # OWNER and TRIAL_ADMIN can only create templates for their own brand
        if user.role in ['OWNER', 'TRIAL_ADMIN']:
            if user.store and user.store.brand:
                # If they try to create for a different brand, reject it
                if brand and int(brand) != user.store.brand.id:
                    raise PermissionDenied("You can only create templates for your own brand.")
                brand = user.store.brand.id
            else:
                raise PermissionDenied("You must be associated with a brand to create templates.")

        serializer.save(
            created_by=self.request.user,
            brand_id=brand if brand else None
        )

    def perform_update(self, serializer):
        """ADMIN, OWNER, and TRIAL_ADMIN can update templates"""
        from rest_framework.exceptions import PermissionDenied

        user = self.request.user
        instance = self.get_object()

        if user.role not in ['ADMIN', 'OWNER', 'TRIAL_ADMIN']:
            raise PermissionDenied("Only administrators and managers can edit templates.")

        # OWNER and TRIAL_ADMIN can only edit templates for their own brand
        if user.role in ['OWNER', 'TRIAL_ADMIN']:
            if user.store and user.store.brand:
                if instance.brand != user.store.brand:
                    raise PermissionDenied("You can only edit templates for your own brand.")
            else:
                raise PermissionDenied("You must be associated with a brand to edit templates.")

        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        """ADMIN, OWNER, and TRIAL_ADMIN can delete templates"""
        from rest_framework.exceptions import PermissionDenied

        user = self.request.user

        if user.role not in ['ADMIN', 'OWNER', 'TRIAL_ADMIN']:
            raise PermissionDenied("Only administrators and managers can delete templates.")

        # OWNER and TRIAL_ADMIN can only delete templates for their own brand
        if user.role in ['OWNER', 'TRIAL_ADMIN']:
            if user.store and user.store.brand:
                if instance.brand != user.store.brand:
                    raise PermissionDenied("You can only delete templates for your own brand.")
            else:
                raise PermissionDenied("You must be associated with a brand to delete templates.")

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

    @extend_schema(
        summary="Generate templates using AI",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'category': {'type': 'string', 'description': 'Template category (PPE, SAFETY, etc.)'},
                    'count': {'type': 'integer', 'description': 'Number of templates to generate (default 5)'},
                },
                'required': ['category']
            }
        }
    )
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get list of unique categories for templates available to this user"""
        queryset = self.get_queryset()
        categories = queryset.values_list('category', flat=True).distinct().order_by('category')
        return Response({'categories': list(categories)})

    @action(detail=False, methods=['post'])
    def generate_with_ai(self, request):
        """Generate micro-check templates using AI based on brand context"""
        from rest_framework.exceptions import PermissionDenied, ValidationError
        from ai_services.template_generator import AITemplateGenerator
        import logging

        logger = logging.getLogger(__name__)
        user = request.user

        logger.info(f"[AI TEMPLATE GEN] Request received from user {user.email} with data: {request.data}")

        # Check permissions - only OWNER, TRIAL_ADMIN, and ADMIN can generate
        if user.role not in ['ADMIN', 'OWNER', 'TRIAL_ADMIN']:
            raise PermissionDenied("Only administrators and managers can generate templates with AI.")

        # Get user's brand
        if user.role in ['OWNER', 'TRIAL_ADMIN']:
            if not user.store or not user.store.brand:
                raise ValidationError("You must be associated with a brand to generate templates.")
            brand = user.store.brand
        else:
            # ADMIN must specify brand_id in request
            brand_id = request.data.get('brand_id')
            if not brand_id:
                raise ValidationError("Admin users must specify brand_id.")
            from brands.models import Brand
            brand = get_object_or_404(Brand, id=brand_id)

        # Get parameters
        category = request.data.get('category')
        if not category:
            raise ValidationError("Category is required.")

        count = int(request.data.get('count', 5))
        count = max(1, min(10, count))  # Clamp between 1-10

        # Allow override of brand name and industry from request
        brand_name_override = request.data.get('brand_name')
        industry_override = request.data.get('industry')

        # Update brand with provided information if it's different
        updated_brand = False
        if brand_name_override and brand_name_override != brand.name:
            brand.name = brand_name_override
            updated_brand = True
            logger.info(f"Updated brand name to: {brand_name_override}")

        if industry_override and industry_override != brand.industry:
            brand.industry = industry_override
            updated_brand = True
            logger.info(f"Updated brand industry to: {industry_override}")

        if updated_brand:
            brand.save()

        # Use the brand's current values (which may have just been updated)
        brand_name = brand.name
        industry = brand.industry or None

        try:
            # Initialize AI service
            ai_generator = AITemplateGenerator()

            # Step 1: Analyze brand
            brand_analysis = ai_generator.analyze_brand(
                brand_name=brand_name,
                industry=industry
            )

            # Step 2: Generate templates
            generated_templates = ai_generator.generate_templates(
                brand_info=brand_analysis,
                category=category,
                count=count
            )

            # Step 3: Create template objects and save to database
            created_templates = []
            for template_data in generated_templates:
                template = MicroCheckTemplate.objects.create(
                    brand=brand,
                    category=category,
                    severity=template_data['severity'],
                    title=template_data['title'],
                    description=template_data['description'],
                    success_criteria=template_data['success_criteria'],
                    expected_completion_seconds=template_data['expected_completion_seconds'],
                    default_photo_required=False,
                    default_video_required=False,
                    is_active=True,
                    include_in_rotation=True,
                    rotation_priority=50,
                    is_local=True,  # AI-generated templates are local to the brand
                    created_by=user,
                    updated_by=user
                )
                created_templates.append(template)

            logger.info(f"Generated {len(created_templates)} AI templates for brand {brand.id}, category {category}")

            # Return created templates with brand analysis context
            serializer = self.get_serializer(created_templates, many=True)
            return Response({
                'brand_analysis': brand_analysis,
                'templates': serializer.data,
                'count': len(created_templates)
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"AI template generation failed: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to generate templates. Please try again or create templates manually.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MicroCheckRunViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing micro-check runs.

    A run represents a set of 3 checks scheduled for a specific date.
    """
    queryset = MicroCheckRun.objects.select_related('store', 'created_by').prefetch_related('items')
    serializer_class = MicroCheckRunSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['store', 'status', 'scheduled_for']
    ordering_fields = ['scheduled_for', 'created_at']
    ordering = ['-scheduled_for']

    def get_queryset(self):
        """Filter runs based on user's accessible stores"""
        user = self.request.user

        # Super admins see all
        if user.role == 'SUPER_ADMIN':
            return self.queryset

        # Admins see all runs for their brand
        if user.role == 'ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # Owners see all runs for their brand
        if user.role == 'OWNER':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # GMs see only their store's runs
        if user.role == 'GM':
            if user.store:
                return self.queryset.filter(store=user.store)
            return self.queryset.none()

        # Trial admins see all runs for their brand
        if user.role == 'TRIAL_ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

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
        summary="Get dashboard statistics for a store",
        parameters=[
            OpenApiParameter(name='store_id', description='Store ID', required=True, type=str)
        ]
    )
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get comprehensive dashboard statistics for a store including user and store metrics"""
        from datetime import datetime, timedelta
        from django.db.models import Count, Q, Avg
        from django.utils import timezone as tz

        store_id = request.query_params.get('store_id')
        if not store_id:
            return Response({'error': 'store_id parameter required'}, status=400)

        user = request.user
        now = tz.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        week_start = today_start - timedelta(days=7)
        last_week_start = week_start - timedelta(days=7)

        # Get runs for this store
        runs = self.get_queryset().filter(store_id=store_id)

        # User-specific streak (using serializer for real-time calculation)
        user_streak = None
        try:
            user_streak_obj = MicroCheckStreak.objects.get(user=user, store_id=store_id)
            from .serializers import MicroCheckStreakSerializer
            serializer = MicroCheckStreakSerializer(user_streak_obj)
            user_streak = serializer.data
        except MicroCheckStreak.DoesNotExist:
            user_streak = {
                'current_streak': 0,
                'longest_streak': 0,
                'total_completions': 0,
                'last_completion_date': None,
            }

        # Store-level streak (using serializer for real-time calculation)
        store_streak = None
        try:
            store_streak_obj = StoreStreak.objects.get(store_id=store_id)
            from .serializers import StoreStreakSerializer
            serializer = StoreStreakSerializer(store_streak_obj)
            store_streak = serializer.data
        except StoreStreak.DoesNotExist:
            store_streak = {
                'current_streak': 0,
                'longest_streak': 0,
                'total_completions': 0,
                'last_completion_date': None,
            }

        # Runs this week and last week
        runs_this_week = runs.filter(completed_at__gte=week_start, status='COMPLETED').count()
        runs_last_week = runs.filter(
            completed_at__gte=last_week_start,
            completed_at__lt=week_start,
            status='COMPLETED'
        ).count()

        # Get responses for score calculations
        responses_today = MicroCheckResponse.objects.filter(
            store_id=store_id,
            completed_at__gte=today_start
        )
        responses_yesterday = MicroCheckResponse.objects.filter(
            store_id=store_id,
            completed_at__gte=yesterday_start,
            completed_at__lt=today_start
        )

        # Calculate today's and yesterday's scores (pass rate)
        today_total = responses_today.count()
        today_passed = responses_today.filter(status='PASS').count()
        today_score = (today_passed / today_total * 100) if today_total > 0 else None

        yesterday_total = responses_yesterday.count()
        yesterday_passed = responses_yesterday.filter(status='PASS').count()
        yesterday_score = (yesterday_passed / yesterday_total * 100) if yesterday_total > 0 else None

        # Issues resolved this week (corrective actions marked as resolved)
        issues_resolved = CorrectiveAction.objects.filter(
            store_id=store_id,
            status='RESOLVED',
            resolved_at__gte=week_start
        ).count()

        # Average score (7 days)
        responses_week = MicroCheckResponse.objects.filter(
            store_id=store_id,
            completed_at__gte=week_start
        )
        week_total = responses_week.count()
        week_passed = responses_week.filter(status='PASS').count()
        avg_score = (week_passed / week_total * 100) if week_total > 0 else None

        return Response({
            'user_streak': user_streak,
            'store_streak': store_streak,
            'runs_this_week': runs_this_week,
            'runs_last_week': runs_last_week,
            'today_score': round(today_score, 1) if today_score else None,
            'yesterday_score': round(yesterday_score, 1) if yesterday_score else None,
            'average_score': round(avg_score, 1) if avg_score else None,
            'issues_resolved_this_week': issues_resolved,
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
        summary="Exchange magic link token for authentication tokens",
        request=None,
        responses={200: {'access': 'string', 'refresh': 'string'}},
    )
    @action(detail=False, methods=['post'], permission_classes=[])
    def token_login(self, request):
        """Exchange a valid magic link token for JWT authentication tokens."""
        from rest_framework_simplejwt.tokens import RefreshToken
        from .utils import hash_token

        token = request.data.get('token')
        if not token:
            return Response({'error': 'token required'}, status=400)

        # Hash the token to look up assignment
        token_hash = hash_token(token)

        try:
            assignment = MicroCheckAssignment.objects.select_related(
                'run__store__brand',
                'sent_to'
            ).get(access_token_hash=token_hash)
        except MicroCheckAssignment.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=404)

        # Check if token is expired
        if assignment.token_expires_at < timezone.now():
            return Response({'error': 'Token expired'}, status=403)

        # Get the user associated with this assignment
        user = assignment.sent_to
        if not user:
            return Response({'error': 'No user associated with this token'}, status=400)

        # Generate JWT tokens for this user
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

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
        if user.role == 'GM' and store_id != user_store_id:
            return Response({'error': 'No access to this store'}, status=403)
        if user.role == 'ADMIN' or user.role == 'OWNER' or user.role == 'TRIAL_ADMIN':
            # Check brand access
            if user.store and store.brand != user.store.brand:
                return Response({'error': 'No access to this store'}, status=403)

        # Get today's local date for the store
        local_date = get_store_local_date(store)

        # Check if any active templates exist before creating run
        from .utils import select_templates_for_run
        selected_templates = select_templates_for_run(store, num_items=3)

        if not selected_templates:
            return Response({
                'error': 'NO_TEMPLATES',
                'message': 'No active templates available for Micro-Checks. Please configure templates first.',
                'user_role': user.role,
                'can_configure': user.role in ['ADMIN', 'OWNER']
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if a PENDING run already exists for today
        # Allow users to create new runs even after completing previous ones
        existing_run = MicroCheckRun.objects.filter(
            store=store,
            scheduled_for=local_date,
            status='PENDING'  # Only reuse pending runs, not completed ones
        ).first()

        if existing_run:
            # Create new assignment for existing pending run
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

    @extend_schema(
        summary="Create first trial run for onboarding",
        description="Creates a micro-check run specifically for trial user onboarding. Uses personalized templates based on user's focus areas."
    )
    @action(detail=False, methods=['post'])
    def create_first_trial_run(self, request):
        """
        Create the first trial run for a new trial user during onboarding.

        This endpoint:
        - Uses the user's personalized focus areas to select checks
        - Creates a run scheduled for today
        - Returns a magic link token for immediate access
        - Stores focus areas in run metadata for later reference
        """
        from brands.models import Store
        from .utils import generate_magic_link_token, hash_token, get_store_local_date
        from .generator import generator

        user = request.user

        # Get user's store
        if not hasattr(user, 'store') or not user.store:
            return Response({'error': 'No store associated with user'}, status=400)

        store = user.store
        brand = store.brand

        # Update store name if provided
        store_name = request.data.get('store_name')
        if store_name:
            store.name = store_name
            store.save()

        # Get today's local date for the store
        local_date = get_store_local_date(store)

        # Check if a PENDING run already exists for today
        # Allow users to create new runs even after completing previous ones
        existing_run = MicroCheckRun.objects.filter(
            store=store,
            scheduled_for=local_date,
            status='PENDING'  # Only reuse pending runs, not completed ones
        ).first()

        if existing_run:
            # Create new assignment for existing pending run
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
                scope={'run_id': str(existing_run.id), 'store_id': store.id, 'is_trial_onboarding': True},
                sent_via='WEB',
                first_used_at=timezone.now()
            )

            serializer = self.get_serializer(existing_run)
            return Response({
                **serializer.data,
                'magic_link_token': raw_token,
                'message': 'Using existing run for today'
            })

        # Check if brand has onboarding data
        if not brand or not brand.industry or not brand.focus_areas:
            return Response({
                'error': 'Brand profile incomplete. Please complete brand onboarding.',
                'message': 'Unable to generate personalized checks. Please try again later.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get personalized checks based on user's brand profile
        checks = generator.get_today_checks(
            industry=brand.industry,
            focus_areas=brand.focus_areas,
            count=3
        )

        if not checks or len(checks) == 0:
            return Response({
                'error': 'NO_TEMPLATES',
                'message': 'Unable to generate personalized checks. Please try again later.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create a new run for today
        run = MicroCheckRun.objects.create(
            store=store,
            scheduled_for=local_date,
            store_timezone=store.timezone or 'UTC',
            created_via='MANUAL',
            created_by=user,
            status='PENDING'
        )

        # Create run items from check data (these are plain dicts from JSON templates)
        # We need to create or get MicroCheckTemplate objects for these checks
        for idx, check_data in enumerate(checks[:3], start=1):  # Ensure only 3 checks, order starts at 1
            # Try to find existing template with same title, or create a new one
            template, created = MicroCheckTemplate.objects.get_or_create(
                brand=brand,
                title=check_data.get('title', ''),
                defaults={
                    'category': check_data.get('category', 'CLEANLINESS'),
                    'severity': check_data.get('severity', 'MEDIUM'),
                    'description': check_data.get('description', ''),
                    'success_criteria': check_data.get('pass_criteria', check_data.get('success_criteria', '')),
                    'version': 1,
                    'default_photo_required': check_data.get('photo_required', False),
                    'default_video_required': False,
                    'expected_completion_seconds': 30,
                    'ai_validation_enabled': False,
                    'ai_validation_prompt': '',
                    'is_active': True,
                    'is_local': False,
                    'include_in_rotation': True,
                    'rotation_priority': 5,
                    'created_by': user
                }
            )

            MicroCheckRunItem.objects.create(
                run=run,
                template=template,
                order=idx,
                photo_required=check_data.get('photo_required', False),
                photo_required_reason='',
                template_version=template.version,
                title_snapshot=template.title,
                category_snapshot=template.category,
                severity_snapshot=template.severity,
                success_criteria_snapshot=template.success_criteria
            )

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
            scope={'run_id': str(run.id), 'store_id': store.id, 'is_trial_onboarding': True},
            sent_via='WEB',
            first_used_at=timezone.now()
        )

        serializer = self.get_serializer(run)
        return Response({
            **serializer.data,
            'magic_link_token': raw_token,
            'message': 'Created first trial run'
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
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['store', 'category', 'status', 'severity_snapshot', 'run']
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

        # Super admins see all
        if user.role == 'SUPER_ADMIN':
            return self.queryset

        # Admins see all for their brand
        if user.role == 'ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # Owners see all for their brand
        if user.role == 'OWNER':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # GMs see only their store's responses
        if user.role == 'GM':
            if user.store:
                return self.queryset.filter(store=user.store)
            return self.queryset.none()

        # Trial admins see all for their brand
        if user.role == 'TRIAL_ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

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

        # Create corrective action immediately if failed (for inline fix flow)
        if response.status == 'FAIL':
            create_corrective_action_for_failure(response)

        # Trigger async processing for other stats/streaks
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

        # Check if this run+template already has a response (matches unique_together constraint)
        existing_response = MicroCheckResponse.objects.filter(
            run=run,
            template=run_item.template
        ).first()

        if existing_response:
            # Ensure corrective action exists if response is FAIL (idempotent)
            if existing_response.status == 'FAIL':
                # Check if corrective action already exists
                from .models import CorrectiveAction
                existing_action = CorrectiveAction.objects.filter(response=existing_response).first()
                if not existing_action:
                    # Create it now if missing
                    create_corrective_action_for_failure(existing_response)

            # Return the existing response instead of error (idempotent)
            return Response(
                MicroCheckResponseSerializer(existing_response).data,
                status=200
            )

        # Create response
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Validation errors: {serializer.errors}")
            logger.error(f"Request data: {request.data}")
            return Response(serializer.errors, status=400)
        serializer.is_valid(raise_exception=True)

        # Get IP and user agent
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')

        user_agent = request.META.get('HTTP_USER_AGENT', '')

        response = serializer.save(
            run=run,
            assignment=assignment,
            template=run_item.template,
            completed_by=assignment.sent_to,
            store=store,
            category=run_item.category_snapshot,
            severity_snapshot=run_item.severity_snapshot,
            local_completed_date=local_date,
            created_by=assignment.sent_to
        )

        # Note: CorrectiveAction is auto-created by MicroCheckResponse.save() for FAIL status

        # Trigger async processing for other stats/streaks
        process_micro_check_response.delay(str(response.id))

        # Check if all run items have responses - if so, mark run as COMPLETED
        total_items = run.items.count()
        completed_items = MicroCheckResponse.objects.filter(run=run).count()

        if completed_items >= total_items:
            run.status = 'COMPLETED'
            run.completed_at = timezone.now()
            run.completed_by = assignment.sent_to
            run.save(update_fields=['status', 'completed_at', 'completed_by'])

            # Update streaks immediately (synchronous)
            if assignment.sent_to and run.store:
                from .utils import update_streak, update_store_streak, all_run_items_passed

                all_passed = all_run_items_passed(run)
                update_streak(
                    store=run.store,
                    manager=assignment.sent_to,
                    completed_date=local_date,
                    passed=all_passed
                )
                update_store_streak(
                    store=run.store,
                    completed_date=local_date
                )

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

        # Super admins see all
        if user.role == 'SUPER_ADMIN':
            return self.queryset

        # Admins see all for their brand
        if user.role == 'ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # Owners see all for their brand
        if user.role == 'OWNER':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # GMs see only their store's streaks
        if user.role == 'GM':
            if user.store:
                return self.queryset.filter(store=user.store)
            return self.queryset.none()

        # Trial admins see all for their brand
        if user.role == 'TRIAL_ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

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


class StoreStreakViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing store-level streak information.

    Read-only - streaks are calculated automatically by tasks.
    """
    queryset = StoreStreak.objects.select_related('store')
    serializer_class = StoreStreakSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['store']
    ordering_fields = ['current_streak', 'longest_streak', 'last_completion_date']
    ordering = ['-current_streak']

    def get_queryset(self):
        """Filter store streaks based on user's accessible stores"""
        user = self.request.user

        # Super admins see all
        if user.role == 'SUPER_ADMIN':
            return self.queryset

        # Admins see all for their brand
        if user.role == 'ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # Owners see all for their brand
        if user.role == 'OWNER':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # GMs see only their store
        if user.role == 'GM':
            if user.store:
                return self.queryset.filter(store=user.store)
            return self.queryset.none()

        # Trial admins see all for their brand
        if user.role == 'TRIAL_ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        return self.queryset.none()


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
    filterset_fields = ['store', 'category', 'status', 'assigned_to']
    ordering_fields = ['due_date', 'created_at', 'resolved_at']
    ordering = ['-created_at']  # Use created_at instead of due_date to avoid NULL issues

    def get_queryset(self):
        """Filter actions based on user's accessible stores"""
        user = self.request.user

        # Super admins see all
        if user.role == 'SUPER_ADMIN':
            return self.queryset

        # Admins see all for their brand or assigned to them
        if user.role == 'ADMIN':
            if user.store:
                return self.queryset.filter(
                    Q(store__brand=user.store.brand) | Q(assigned_to=user)
                )
            return self.queryset

        # Owners see all for their brand or assigned to them
        if user.role == 'OWNER':
            if user.store:
                return self.queryset.filter(
                    Q(store__brand=user.store.brand) | Q(assigned_to=user)
                )
            return self.queryset

        # GMs see their store's actions or actions assigned to them
        if user.role == 'GM':
            if user.store:
                return self.queryset.filter(
                    Q(store=user.store) | Q(assigned_to=user)
                )
            return self.queryset.none()

        # Trial admins see all for their brand or assigned to them
        if user.role == 'TRIAL_ADMIN':
            if user.store:
                return self.queryset.filter(
                    Q(store__brand=user.store.brand) | Q(assigned_to=user)
                )
            return self.queryset

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

    @extend_schema(
        summary="Resolve action inline during check session",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'after_media_id': {'type': 'string', 'format': 'uuid'},
                    'resolution_notes': {'type': 'string'}
                },
                'required': ['after_media_id']
            }
        }
    )
    @action(detail=True, methods=['post'])
    def resolve_inline(self, request, pk=None):
        """
        Resolve a corrective action inline during check session.

        This is called when a manager chooses "Fix Now" during a check session.
        - Validates before/after photos exist
        - Performs AI validation (placeholder for now)
        - Sets status to VERIFIED if confidence > 0.8, else RESOLVED
        - Marks as fixed_during_session=True
        """
        action = self.get_object()

        if action.status in ['RESOLVED', 'VERIFIED', 'DISMISSED']:
            return Response(
                {'error': 'Action already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get after media
        after_media_id = request.data.get('after_media_id')
        if not after_media_id:
            return Response(
                {'error': 'after_media_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            after_media = MediaAsset.objects.get(id=after_media_id)
        except MediaAsset.DoesNotExist:
            return Response(
                {'error': 'After media not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # AI validation only if we have both before and after photos
        if action.before_media:
            # TODO: Perform AI validation comparing before/after photos
            # For now, use a placeholder confidence score
            ai_confidence = 0.85  # Placeholder - would come from AI service

            # Set status based on AI confidence
            if ai_confidence >= 0.8:
                new_status = 'VERIFIED'
            else:
                new_status = 'RESOLVED'
        else:
            # No before photo - mark as resolved without AI verification
            ai_confidence = None
            new_status = 'RESOLVED'

        # Update action
        action.after_media = after_media
        action.status = new_status
        action.resolved_at = timezone.now()
        action.resolved_by = request.user
        action.resolution_notes = request.data.get('resolution_notes', '')
        action.fixed_during_session = True
        action.verified_at = timezone.now() if new_status == 'VERIFIED' else None
        action.verification_confidence = ai_confidence if new_status == 'VERIFIED' else None
        action.updated_by = request.user
        action.save()

        serializer = self.get_serializer(action)
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

        # Super admins see all
        if user.role == 'SUPER_ADMIN':
            return self.queryset

        # Admins see all for their brand
        if user.role == 'ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # Owners see all for their brand
        if user.role == 'OWNER':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

        # GMs see only their store's coverage
        if user.role == 'GM':
            if user.store:
                return self.queryset.filter(store=user.store)
            return self.queryset.none()

        # Trial admins see all for their brand
        if user.role == 'TRIAL_ADMIN':
            if user.store:
                return self.queryset.filter(store__brand=user.store.brand)
            return self.queryset

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


# Onboarding-specific endpoints

@extend_schema(
    responses={
        200: {
            'type': 'object',
            'properties': {
                'checks': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'string'},
                            'title': {'type': 'string'},
                            'description': {'type': 'string'},
                            'category': {'type': 'string'},
                            'pass_criteria': {'type': 'string'},
                            'fail_criteria': {'type': 'string'},
                            'image_prompt': {'type': 'string'}
                        }
                    }
                },
                'personalization': {
                    'type': 'object',
                    'properties': {
                        'industry': {'type': 'string'},
                        'focus_areas': {'type': 'array', 'items': {'type': 'string'}}
                    }
                }
            }
        },
        400: {'description': 'User has no completed onboarding or no associated brand'},
    },
    description="Get today's 3 personalized micro-checks based on user's brand profile"
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_today_checks(request):
    """
    Get today's personalized micro-checks based on user's brand profile.

    Returns 3 randomized checks filtered by:
    - Brand industry (from brand.industry)
    - Focus areas (from brand.focus_areas)
    """
    from .generator import generator

    user = request.user

    # Check if user has completed onboarding
    if not user.onboarding_completed_at:
        return Response({
            'error': 'Onboarding not completed. Please complete onboarding first.',
            'checks': [],
            'personalization': {}
        }, status=status.HTTP_400_BAD_REQUEST)

    # Get user's brand
    if not user.store or not user.store.brand:
        return Response({
            'error': 'User has no associated brand.',
            'checks': [],
            'personalization': {}
        }, status=status.HTTP_400_BAD_REQUEST)

    brand = user.store.brand

    # Check if brand has onboarding data
    if not brand.industry or not brand.focus_areas:
        return Response({
            'error': 'Brand profile incomplete. Please complete brand onboarding.',
            'checks': [],
            'personalization': {
                'industry': brand.industry,
                'focus_areas': brand.focus_areas or []
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    # Generate checks
    checks = generator.get_today_checks(
        industry=brand.industry,
        focus_areas=brand.focus_areas,
        count=3
    )

    return Response({
        'checks': checks,
        'personalization': {
            'industry': brand.industry,
            'focus_areas': brand.focus_areas
        }
    }, status=status.HTTP_200_OK)


@extend_schema(
    responses={
        200: {
            'type': 'object',
            'properties': {
                'templates': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'industry': {'type': 'string'},
                            'focus': {'type': 'string'},
                            'filename': {'type': 'string'}
                        }
                    }
                }
            }
        }
    },
    description="List all available micro-check templates (admin only)"
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_templates(request):
    """List all available micro-check templates."""
    from .generator import generator

    # Only allow super admins to see this
    if not request.user.is_super_admin:
        return Response(
            {'error': 'Permission denied. Admin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    templates = generator.get_available_templates()

    return Response({
        'templates': templates,
        'count': len(templates)
    }, status=status.HTTP_200_OK)


class MediaAssetViewSet(viewsets.ModelViewSet):
    """Upload and manage media assets"""
    queryset = MediaAsset.objects.all()
    serializer_class = MediaAssetSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated when auth is ready
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        """Upload a new media file"""
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate SHA256 hash
        file.seek(0)
        sha256 = hashlib.sha256(file.read()).hexdigest()
        file.seek(0)

        # Check for existing media with same hash (deduplication)
        existing = MediaAsset.objects.filter(sha256=sha256).first()
        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Generate S3 key
        file_ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
        s3_key = f"micro-checks/media/{uuid.uuid4()}.{file_ext}"

        # Upload to S3
        s3_path = default_storage.save(s3_key, file)

        # Get store from request (default to store ID 10 for now)
        store_id = request.data.get('store_id', 10)

        # Create MediaAsset
        media_asset = MediaAsset.objects.create(
            store_id=store_id,
            kind=MediaAsset.Kind.IMAGE,
            s3_key=s3_path,
            s3_bucket=default_storage.bucket_name if hasattr(default_storage, 'bucket_name') else 'default',
            sha256=sha256,
            bytes=file.size,
            retention_policy=MediaAsset.RetentionPolicy.COACHING_7D,
            created_by=request.user if request.user.is_authenticated else None
        )

        serializer = self.get_serializer(media_asset)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
