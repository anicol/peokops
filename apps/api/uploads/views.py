import boto3
import uuid
from datetime import datetime, timedelta
from django.conf import settings
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.tenancy.mixins import ScopedQuerysetMixin
from core.tenancy.permissions import TenantObjectPermission

from .models import Upload
from .serializers import UploadSerializer


@api_view(['GET'])
def health_check(request):
    """Basic health check for uploads app"""
    return JsonResponse({'status': 'healthy', 'app': 'uploads'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_presigned_url(request):
    """
    Generate a presigned URL for direct S3 upload
    """
    try:
        # Extract file information from request
        filename = request.data.get('filename')
        file_type = request.data.get('file_type', 'video/mp4')
        store_id = request.data.get('store_id')
        mode = request.data.get('mode', 'inspection')
        
        if not filename or not store_id:
            return Response(
                {'error': 'filename and store_id are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate unique S3 key
        file_extension = filename.split('.')[-1] if '.' in filename else 'mp4'
        unique_id = str(uuid.uuid4())
        s3_key = f"uploads/{mode}/{datetime.now().strftime('%Y/%m/%d')}/{unique_id}.{file_extension}"
        
        # Create S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # Generate presigned URL for PUT operation
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': s3_key,
                'ContentType': file_type,
            },
            ExpiresIn=3600  # URL expires in 1 hour
        )
        
        # Create Upload record in pending state
        upload = Upload.objects.create(
            store_id=store_id,
            mode=mode,
            s3_key=s3_key,
            status=Upload.Status.UPLOADED,
            original_filename=filename,
            file_type=file_type,
            upload_url=presigned_url,
            created_by=request.user
        )
        
        return Response({
            'upload_id': upload.id,
            'presigned_url': presigned_url,
            's3_key': s3_key,
            'expires_at': (datetime.now() + timedelta(hours=1)).isoformat(),
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_upload(request, upload_id):
    """
    Confirm that upload to S3 was successful and trigger processing
    """
    try:
        upload = Upload.objects.get(id=upload_id, created_by=request.user)

        # Update upload status
        upload.status = Upload.Status.PROCESSING
        upload.save()

        # Trigger Celery task for processing
        from videos.tasks import process_video_upload
        process_video_upload.delay(upload.id)

        # Return the full serialized upload object
        serializer = UploadSerializer(upload)
        return Response(serializer.data)

    except Upload.DoesNotExist:
        return Response(
            {'error': 'Upload not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reprocess_upload(request, upload_id):
    """
    Reprocess an upload by re-running AI analysis on existing frames.
    This deletes old inspection results and re-runs Rekognition analysis.
    """
    try:
        from videos.models import Video
        from inspections.models import Inspection
        from videos.tasks import apply_inspection_rules, apply_coaching_rules

        upload = Upload.objects.get(id=upload_id, created_by=request.user)

        if upload.status == Upload.Status.PROCESSING:
            return Response(
                {'error': 'Upload is already being processed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find the associated Video
        video = Video.objects.filter(
            store=upload.store,
            title=upload.original_filename
        ).order_by('-created_at').first()

        if not video:
            return Response(
                {'error': 'No video found for this upload. Upload may not have been processed yet.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get existing frames
        frames = list(video.frames.all())

        if not frames:
            return Response(
                {'error': 'No frames found for this video. Video may not have been fully processed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete existing inspections for this video
        Inspection.objects.filter(video=video).delete()

        # Re-run analysis based on upload mode
        if upload.mode == Upload.Mode.ENTERPRISE:
            inspection = apply_inspection_rules(video, frames)
        else:
            inspection = apply_coaching_rules(video, frames)

        return Response({
            'message': 'Video analysis restarted',
            'upload_id': upload.id,
            'video_id': video.id,
            'inspection_id': inspection.id if inspection else None,
            'mode': upload.mode
        })

    except Upload.DoesNotExist:
        return Response(
            {'error': 'Upload not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def retention_status(request):
    """
    Get retention policy status and upcoming expirations
    """
    try:
        from django.conf import settings
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        # Get retention settings
        inspection_retention_days = int(settings.INSPECTION_MODE_RETENTION_DAYS)
        coaching_retention_days = int(settings.COACHING_MODE_RETENTION_DAYS)
        
        now = timezone.now()
        
        # Calculate expiration dates for different modes
        inspection_cutoff = now - timedelta(days=inspection_retention_days)
        coaching_cutoff = now - timedelta(days=coaching_retention_days)
        
        # Get uploads expiring soon (within 7 days)
        warning_cutoff = now - timedelta(days=max(inspection_retention_days - 7, coaching_retention_days - 1))
        
        expired_uploads = {
            'inspection': Upload.objects.filter(
                mode=Upload.Mode.ENTERPRISE,
                created_at__lt=inspection_cutoff
            ).count(),
            'coaching': Upload.objects.filter(
                mode=Upload.Mode.COACHING,
                created_at__lt=coaching_cutoff
            ).count()
        }
        
        expiring_soon = Upload.objects.filter(
            created_at__lt=warning_cutoff,
            created_at__gte=min(inspection_cutoff, coaching_cutoff)
        ).count()
        
        return Response({
            'retention_policies': {
                'inspection_days': inspection_retention_days,
                'coaching_days': coaching_retention_days
            },
            'expired_uploads': expired_uploads,
            'expiring_soon': expiring_soon,
            'last_cleanup': None,  # Could track this in future
            'next_cleanup': 'Daily at 2:00 AM UTC'
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_manual_cleanup(request):
    """
    Manually trigger retention cleanup (admin only)
    """
    if not request.user.is_staff:
        return Response(
            {'error': 'Admin privileges required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from .tasks import cleanup_expired_uploads_task
        
        # Trigger cleanup task
        task = cleanup_expired_uploads_task.delay()
        
        return Response({
            'message': 'Cleanup task started',
            'task_id': task.id
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class UploadViewSet(ScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing upload status and history with tenant isolation.

    Uploads are scoped to stores. Access control:
    - SUPER_ADMIN: Full access to all uploads (unrestricted)
    - ADMIN: Access to all uploads in their brand
    - OWNER, GM: Access to uploads in their store
    """
    queryset = Upload.objects.all()
    serializer_class = UploadSerializer
    permission_classes = [IsAuthenticated, TenantObjectPermission]

    tenant_scope = 'store'
    tenant_field_paths = {'store': 'store'}
    tenant_object_paths = {'store': 'store_id'}
    tenant_unrestricted_roles = ['SUPER_ADMIN', 'ADMIN']

    def get_queryset(self):
        """Apply tenant filtering and optional mode filter"""
        queryset = super().get_queryset()

        # Filter by mode if specified
        mode = self.request.query_params.get('mode')
        if mode:
            queryset = queryset.filter(mode=mode)

        return queryset.order_by('-created_at')