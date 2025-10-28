from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import ReviewAnalysis
from .serializers import (
    ReviewAnalysisCreateSerializer,
    ReviewAnalysisStatusSerializer,
    ReviewAnalysisDetailSerializer,
    EmailCaptureSerializer,
)


@api_view(['POST'])
@permission_classes([AllowAny])  # Public endpoint
def start_analysis(request):
    """
    Start a new review analysis
    POST /api/insights/start/
    Body: { "business_name": "...", "location": "...", "source": "website" }
    """
    serializer = ReviewAnalysisCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        analysis = serializer.save()
        return Response({
            'id': str(analysis.id),
            'status': analysis.status,
            'message': 'Analysis started'
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])  # Public endpoint
def analysis_status(request, analysis_id):
    """
    Get current status of analysis (for polling)
    GET /api/insights/status/{uuid}/
    """
    analysis = get_object_or_404(ReviewAnalysis, id=analysis_id)
    serializer = ReviewAnalysisStatusSerializer(analysis)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])  # Public endpoint
def analysis_detail(request, analysis_id):
    """
    Get full analysis results
    GET /api/insights/results/{uuid}/
    """
    analysis = get_object_or_404(ReviewAnalysis, id=analysis_id)
    
    # Mark as viewed
    analysis.mark_viewed()
    
    serializer = ReviewAnalysisDetailSerializer(analysis)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])  # Public endpoint
def capture_email(request, analysis_id):
    """
    Capture email address during processing
    POST /api/insights/capture-email/{uuid}/
    Body: { "contact_email": "...", "contact_name": "..." }
    """
    analysis = get_object_or_404(ReviewAnalysis, id=analysis_id)
    
    serializer = EmailCaptureSerializer(data=request.data)
    
    if serializer.is_valid():
        # Update the analysis with email
        analysis.contact_email = serializer.validated_data['contact_email']
        analysis.contact_name = serializer.validated_data.get('contact_name', '')
        analysis.save(update_fields=['contact_email', 'contact_name'])
        
        # Send confirmation email if analysis is complete
        if analysis.status == ReviewAnalysis.Status.COMPLETED:
            from .tasks import send_analysis_email
            send_analysis_email.delay(str(analysis.id))
        
        return Response({'message': 'Email captured successfully'})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
