from rest_framework import generics, status, filters, serializers, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from django.shortcuts import get_object_or_404

from core.tenancy.mixins import ScopedQuerysetMixin, ScopedCreateMixin
from core.tenancy.permissions import TenantObjectPermission

from .models import Video, VideoFrame
from .serializers import VideoSerializer, VideoListSerializer, VideoFrameSerializer


class VideoListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['store', 'status', 'uploaded_by']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title', 'duration']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Video.objects.all()
        else:
            return Video.objects.filter(store=user.store)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return VideoListSerializer
        return VideoSerializer

    def perform_create(self, serializer):
        # Validate file size
        file = self.request.FILES.get('file')
        if file:
            max_size = settings.MAX_VIDEO_SIZE_MB * 1024 * 1024
            if file.size > max_size:
                raise serializers.ValidationError(
                    f'File size exceeds {settings.MAX_VIDEO_SIZE_MB}MB limit'
                )
            
            # Validate file format
            file_ext = file.name.lower().split('.')[-1]
            if file_ext not in settings.SUPPORTED_VIDEO_FORMATS:
                raise serializers.ValidationError(
                    f'Unsupported format. Supported: {", ".join(settings.SUPPORTED_VIDEO_FORMATS)}'
                )
        
        serializer.save()


class VideoDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Video.objects.all()
        else:
            return Video.objects.filter(store=user.store)


class VideoFrameListView(generics.ListAPIView):
    serializer_class = VideoFrameSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        video_id = self.kwargs['video_id']
        user = self.request.user
        
        if user.role == 'ADMIN':
            video_filter = {'video_id': video_id}
        else:
            video_filter = {'video_id': video_id, 'video__store': user.store}
        
        return VideoFrame.objects.filter(**video_filter)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reprocess_video(request, pk):
    """
    Reprocess a video by re-running AI analysis on existing frames.
    This deletes old inspection results and re-runs Rekognition analysis.
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        from inspections.models import Inspection
        from uploads.models import Upload
        from videos.tasks import apply_inspection_rules, apply_coaching_rules

        user = request.user

        # Get the video
        if user.role == 'ADMIN':
            video = Video.objects.get(pk=pk)
        else:
            video = Video.objects.get(pk=pk, store=user.store)

        logger.info(f"Reprocessing video {pk}: {video.title}, status={video.status}")

        # Get existing frames
        frames = list(video.frames.all())
        logger.info(f"Found {len(frames)} frames for video {pk}")

        if not frames:
            # No frames - need full reprocessing (extract frames + analyze)
            from videos.tasks import reprocess_video_from_s3

            logger.info(f"No frames found for video {pk}, triggering full reprocess")

            # Find Upload record to verify video exists in S3
            upload = Upload.objects.filter(
                store=video.store,
                original_filename=video.title
            ).order_by('-created_at').first()

            if not upload:
                return Response(
                    {
                        'error': 'Cannot reprocess: No Upload record found for this video. '
                                 'This video may need to be re-uploaded.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Trigger full reprocessing
            reprocess_video_from_s3.delay(video.id)

            return Response({
                'message': 'Full video reprocessing started (extracting frames and analyzing)',
                'video_id': video.id,
                'processing_type': 'full'
            })

        # Has frames - just re-run analysis on existing frames
        logger.info(f"Reanalyzing {len(frames)} existing frames for video {pk}")

        # Find the Upload to determine mode (inspection vs coaching)
        upload = Upload.objects.filter(
            store=video.store,
            original_filename=video.title
        ).order_by('-created_at').first()

        # Determine mode
        if upload:
            mode = upload.mode
        else:
            # Default to inspection if no Upload found (legacy videos)
            mode = 'inspection'

        # Delete existing inspections for this video
        Inspection.objects.filter(video=video).delete()

        # Re-run analysis
        if mode == 'inspection':
            inspection = apply_inspection_rules(video, frames)
        else:
            inspection = apply_coaching_rules(video, frames)

        return Response({
            'message': 'Video analysis restarted (using existing frames)',
            'video_id': video.id,
            'inspection_id': inspection.id if inspection else None,
            'mode': mode,
            'processing_type': 'reanalysis'
        })

    except Video.DoesNotExist:
        return Response(
            {'error': 'Video not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Reprocessing failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_demo_video(request, demo_type):
    """
    Get demo video data for interactive experience.
    For WATCH stage: returns full violation data
    For TRY stage: returns metadata only (violations hidden for user to find)
    """
    try:
        video = Video.objects.get(is_demo=True, demo_type=demo_type.upper())
    except Video.DoesNotExist:
        return Response(
            {'error': f'Demo video for {demo_type} stage not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Base video data
    video_data = {
        'id': video.id,
        'title': video.title,
        'description': video.description,
        'duration': video.duration,
        'video_url': str(video.file) if video.file and video.is_demo else (video.file.url if video.file else None),
        'thumbnail_url': video.thumbnail.url if video.thumbnail else None,
        'demo_type': video.demo_type,
    }
    
    # For WATCH stage, include full violation data for display
    if demo_type.upper() == 'WATCH':
        video_data['violations'] = video.demo_violations
        
        # Calculate scores from violations if available
        if video.demo_violations:
            violations_by_category = {}
            for violation in video.demo_violations:
                category = violation.get('category', 'OTHER')
                if category not in violations_by_category:
                    violations_by_category[category] = []
                violations_by_category[category].append(violation)
            
            # Simple scoring based on violation count and severity
            total_violations = len(video.demo_violations)
            critical_violations = sum(1 for v in video.demo_violations if v.get('severity') == 'CRITICAL')
            high_violations = sum(1 for v in video.demo_violations if v.get('severity') == 'HIGH')
            
            # Base score calculation (simplified)
            base_score = max(0, 100 - (critical_violations * 20) - (high_violations * 10) - (total_violations * 5))
            
            video_data['overall_score'] = base_score
            video_data['category_scores'] = {
                'ppe': base_score + 5,  # Slight variations per category
                'safety': base_score - 5,
                'cleanliness': base_score + 2,
                'uniform': base_score - 2
            }
    
    # For TRY stage, only include violation count (not locations/details)
    elif demo_type.upper() == 'TRY':
        video_data['total_violations'] = len(video.demo_violations) if video.demo_violations else 0
    
    return Response(video_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_demo_videos(request):
    """List all available demo videos"""
    demo_videos = Video.objects.filter(is_demo=True).order_by('demo_type')

    videos_data = []
    for video in demo_videos:
        videos_data.append({
            'id': video.id,
            'title': video.title,
            'demo_type': video.demo_type,
            'duration': video.duration,
            'violation_count': len(video.demo_violations) if video.demo_violations else 0
        })

    return Response({'demo_videos': videos_data})


# ============================================================================
# Tenant-Isolated ViewSets (New API)
# ============================================================================

class VideoViewSet(ScopedQuerysetMixin, ScopedCreateMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing videos with tenant isolation.

    Videos are scoped to stores. Access control:
    - SUPER_ADMIN: Full access to all videos (unrestricted)
    - ADMIN: Access to all videos in their brand
    - OWNER, GM: Access to videos in their store
    """
    queryset = Video.objects.all()
    permission_classes = [IsAuthenticated, TenantObjectPermission]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['store', 'status', 'uploaded_by']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title', 'duration']
    ordering = ['-created_at']

    tenant_scope = 'store'
    tenant_field_paths = {'store': 'store'}
    tenant_object_paths = {'store': 'store_id'}
    tenant_unrestricted_roles = ['SUPER_ADMIN', 'ADMIN']

    def get_serializer_class(self):
        if self.action == 'list':
            return VideoListSerializer
        return VideoSerializer

    def perform_create(self, serializer):
        # Validate file size
        file = self.request.FILES.get('file')
        if file:
            max_size = settings.MAX_VIDEO_SIZE_MB * 1024 * 1024
            if file.size > max_size:
                raise serializers.ValidationError(
                    f'File size exceeds {settings.MAX_VIDEO_SIZE_MB}MB limit'
                )

            # Validate file format
            file_ext = file.name.lower().split('.')[-1]
            if file_ext not in settings.SUPPORTED_VIDEO_FORMATS:
                raise serializers.ValidationError(
                    f'Unsupported format. Supported: {", ".join(settings.SUPPORTED_VIDEO_FORMATS)}'
                )

        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """
        Reprocess a video by re-running AI analysis on existing frames.
        This deletes old inspection results and re-runs Rekognition analysis.
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            from inspections.models import Inspection
            from uploads.models import Upload
            from videos.tasks import apply_inspection_rules, apply_coaching_rules

            video = self.get_object()
            logger.info(f"Reprocessing video {pk}: {video.title}, status={video.status}")

            # Get existing frames
            frames = list(video.frames.all())
            logger.info(f"Found {len(frames)} frames for video {pk}")

            if not frames:
                # No frames - need full reprocessing (extract frames + analyze)
                from videos.tasks import reprocess_video_from_s3

                logger.info(f"No frames found for video {pk}, triggering full reprocess")

                # Find Upload record to verify video exists in S3
                upload = Upload.objects.filter(
                    store=video.store,
                    original_filename=video.title
                ).order_by('-created_at').first()

                if not upload:
                    return Response(
                        {
                            'error': 'Cannot reprocess: No Upload record found for this video. '
                                     'This video may need to be re-uploaded.'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Trigger full reprocessing
                reprocess_video_from_s3.delay(video.id)

                return Response({
                    'message': 'Full video reprocessing started (extracting frames and analyzing)',
                    'video_id': video.id,
                    'processing_type': 'full'
                })

            # Has frames - just re-run analysis on existing frames
            logger.info(f"Reanalyzing {len(frames)} existing frames for video {pk}")

            # Find the Upload to determine mode (inspection vs coaching)
            upload = Upload.objects.filter(
                store=video.store,
                original_filename=video.title
            ).order_by('-created_at').first()

            # Determine mode
            if upload:
                mode = upload.mode
            else:
                # Default to inspection if no Upload found (legacy videos)
                mode = 'inspection'

            # Delete existing inspections for this video
            Inspection.objects.filter(video=video).delete()

            # Re-run analysis
            if mode == 'inspection':
                inspection = apply_inspection_rules(video, frames)
            else:
                inspection = apply_coaching_rules(video, frames)

            return Response({
                'message': 'Video analysis restarted (using existing frames)',
                'video_id': video.id,
                'inspection_id': inspection.id if inspection else None,
                'mode': mode,
                'processing_type': 'reanalysis'
            })

        except Exception as e:
            return Response(
                {'error': f'Reprocessing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VideoFrameViewSet(ScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing video frames with tenant isolation.

    Frames are scoped through their parent video's store.
    """
    queryset = VideoFrame.objects.select_related('video', 'video__store')
    serializer_class = VideoFrameSerializer
    permission_classes = [IsAuthenticated, TenantObjectPermission]

    tenant_scope = 'store'
    tenant_field_paths = {'store': 'video__store'}
    tenant_object_paths = {'store': 'video__store_id'}
    tenant_unrestricted_roles = ['SUPER_ADMIN', 'ADMIN']

    def get_queryset(self):
        """Optionally filter by video_id"""
        queryset = super().get_queryset()

        video_id = self.request.query_params.get('video_id')
        if video_id:
            queryset = queryset.filter(video_id=video_id)

        return queryset