from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import models
from .models import Inspection, Finding, ActionItem
from .serializers import (
    InspectionSerializer, InspectionListSerializer, FindingSerializer,
    ActionItemSerializer, ActionItemUpdateSerializer
)


class InspectionListView(generics.ListAPIView):
    serializer_class = InspectionListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['mode', 'status', 'store']
    ordering_fields = ['created_at', 'overall_score']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Inspection.objects.all()
        else:
            return Inspection.objects.filter(store=user.store)


class InspectionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = InspectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Inspection.objects.all()
        else:
            return Inspection.objects.filter(store=user.store)


class FindingListView(generics.ListAPIView):
    serializer_class = FindingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['category', 'severity', 'is_resolved']
    ordering_fields = ['confidence', 'created_at', 'severity']
    ordering = ['-severity', '-confidence']

    def get_queryset(self):
        inspection_id = self.kwargs['inspection_id']
        user = self.request.user

        if user.role == 'ADMIN':
            inspection_filter = {'inspection_id': inspection_id}
        else:
            inspection_filter = {'inspection_id': inspection_id, 'inspection__store': user.store}

        return Finding.objects.filter(**inspection_filter)


class ActionItemListCreateView(generics.ListCreateAPIView):
    serializer_class = ActionItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['priority', 'status', 'assigned_to']
    ordering_fields = ['due_date', 'created_at', 'priority']
    ordering = ['-priority', 'due_date']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return ActionItem.objects.all()
        else:
            return ActionItem.objects.filter(inspection__store=user.store)

    def perform_create(self, serializer):
        # Auto-assign high priority items to GM if available
        if serializer.validated_data.get('priority') in ['HIGH', 'URGENT']:
            store = self.request.user.store
            gm = store.users.filter(role='GM').first() if store else None
            if gm:
                serializer.validated_data['assigned_to'] = gm
        
        serializer.save()


class ActionItemDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return ActionItem.objects.all()
        else:
            return ActionItem.objects.filter(inspection__store=user.store)

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return ActionItemUpdateSerializer
        return ActionItemSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_inspection(request, video_id):
    try:
        user = request.user
        mode = request.data.get('mode', 'INSPECTION')

        # Check if user has access to the video
        if user.role == 'ADMIN':
            from videos.models import Video
            video = Video.objects.get(pk=video_id)
        else:
            from videos.models import Video
            video = Video.objects.get(pk=video_id, store=user.store)

        # Check if inspection already exists
        if video.inspection:
            return Response(
                {'error': 'Inspection already exists for this video'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create inspection with metadata from video
        inspection = Inspection.objects.create(
            title=video.title,
            created_by=video.uploaded_by,
            store=video.store,
            mode=mode,
            status=Inspection.Status.PENDING
        )

        # Link video to inspection
        video.inspection = inspection
        video.save(update_fields=['inspection'])

        # Set expiration based on mode
        if mode == Inspection.Mode.COACHING:
            from datetime import timedelta
            from django.conf import settings
            retention_days = getattr(settings, 'COACHING_MODE_RETENTION_DAYS', 7)
            inspection.expires_at = timezone.now() + timedelta(days=retention_days)
            inspection.save()

        # Trigger AI analysis
        from .tasks import analyze_video
        analyze_video.delay(inspection.id)

        return Response(InspectionSerializer(inspection).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inspection_stats(request):
    from datetime import timedelta
    from django.utils import timezone as tz

    user = request.user
    now = tz.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_start = today_start - timedelta(days=7)

    if user.role == 'ADMIN':
        inspections = Inspection.objects.all()
    else:
        inspections = Inspection.objects.filter(store=user.store)

    total_inspections = inspections.count()
    completed_inspections = inspections.filter(status=Inspection.Status.COMPLETED).count()
    avg_score = inspections.filter(overall_score__isnull=False).aggregate(
        avg_score=models.Avg('overall_score')
    )['avg_score']

    # Today's and yesterday's average scores
    today_inspections = inspections.filter(created_at__gte=today_start, overall_score__isnull=False)
    yesterday_inspections = inspections.filter(
        created_at__gte=yesterday_start,
        created_at__lt=today_start,
        overall_score__isnull=False
    )

    today_score = today_inspections.aggregate(avg=models.Avg('overall_score'))['avg']
    yesterday_score = yesterday_inspections.aggregate(avg=models.Avg('overall_score'))['avg']

    critical_findings = Finding.objects.filter(
        inspection__in=inspections,
        severity=Finding.Severity.CRITICAL
    ).count()

    open_actions = ActionItem.objects.filter(
        inspection__in=inspections,
        status=ActionItem.Status.OPEN
    ).count()

    # Resolved actions this week
    resolved_this_week = ActionItem.objects.filter(
        inspection__in=inspections,
        status=ActionItem.Status.COMPLETED,
        updated_at__gte=week_start
    ).count()

    return Response({
        'total_inspections': total_inspections,
        'completed_inspections': completed_inspections,
        'average_score': round(avg_score, 1) if avg_score else None,
        'today_score': round(today_score, 1) if today_score else None,
        'yesterday_score': round(yesterday_score, 1) if yesterday_score else None,
        'critical_findings': critical_findings,
        'open_action_items': open_actions,
        'resolved_this_week': resolved_this_week,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_finding(request, finding_id):
    """Manager approves an AI-detected finding as correct"""
    try:
        finding = Finding.objects.get(id=finding_id)

        # Check permission - user must own the inspection or be admin
        if request.user.role != 'ADMIN' and finding.inspection.store != request.user.store:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Approve the finding
        finding.is_approved = True
        finding.is_rejected = False  # Clear rejection if previously rejected
        finding.approved_by = request.user
        finding.approved_at = timezone.now()
        finding.rejected_by = None
        finding.rejected_at = None
        finding.rejection_reason = ''
        finding.save()

        return Response(FindingSerializer(finding).data, status=status.HTTP_200_OK)

    except Finding.DoesNotExist:
        return Response(
            {'error': 'Finding not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_finding(request, finding_id):
    """Manager rejects an AI-detected finding as false positive"""
    try:
        finding = Finding.objects.get(id=finding_id)

        # Check permission
        if request.user.role != 'ADMIN' and finding.inspection.store != request.user.store:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Reject the finding
        finding.is_rejected = True
        finding.is_approved = False  # Clear approval if previously approved
        finding.rejection_reason = request.data.get('reason', '')
        finding.rejected_by = request.user
        finding.rejected_at = timezone.now()
        finding.approved_by = None
        finding.approved_at = None
        finding.save()

        return Response(FindingSerializer(finding).data, status=status.HTTP_200_OK)

    except Finding.DoesNotExist:
        return Response(
            {'error': 'Finding not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_manual_finding(request, inspection_id):
    """Manager manually adds a violation they noticed that AI missed"""
    try:
        inspection = Inspection.objects.get(id=inspection_id)

        # Check permission
        if request.user.role != 'ADMIN' and inspection.store != request.user.store:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Create manual finding
        finding = Finding.objects.create(
            inspection=inspection,
            frame_id=request.data.get('frame_id'),  # Optional
            category=request.data['category'],
            severity=request.data['severity'],
            title=request.data['title'],
            description=request.data['description'],
            confidence=1.0,  # Manual findings have 100% confidence
            is_manual=True,
            is_approved=True,  # Auto-approve manual findings
            created_by=request.user,
            approved_by=request.user,
            approved_at=timezone.now()
        )

        return Response(FindingSerializer(finding).data, status=status.HTTP_201_CREATED)

    except Inspection.DoesNotExist:
        return Response(
            {'error': 'Inspection not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except KeyError as e:
        return Response(
            {'error': f'Missing required field: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )