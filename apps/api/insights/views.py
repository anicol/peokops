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


@api_view(['POST'])
@permission_classes([AllowAny])  # Public endpoint
def share_analysis(request, analysis_id):
    """
    Share analysis via email
    POST /api/insights/share/{uuid}/
    Body: {
        "recipient_email": "...",
        "recipient_name": "...",
        "sender_message": "..."
    }
    """
    from rest_framework import serializers as drf_serializers
    from django.core.mail import send_mail
    from django.conf import settings

    analysis = get_object_or_404(ReviewAnalysis, id=analysis_id)

    # Simple inline serializer for share request
    class ShareSerializer(drf_serializers.Serializer):
        recipient_email = drf_serializers.EmailField()
        recipient_name = drf_serializers.CharField(required=False, allow_blank=True)
        sender_message = drf_serializers.CharField(required=False, allow_blank=True)

    serializer = ShareSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    recipient_email = data['recipient_email']
    recipient_name = data.get('recipient_name', '')
    sender_message = data.get('sender_message', '')

    # Prepare email
    greeting = f"Hi {recipient_name}," if recipient_name else "Hi,"
    view_url = analysis.get_public_url()

    subject = f"Review Analysis for {analysis.business_name}"

    message_parts = [
        greeting,
        "",
        sender_message if sender_message else f"Check out this AI-powered review analysis for {analysis.business_name}.",
        "",
        f"📊 Analysis Summary:",
        f"   • Business: {analysis.business_name}",
        f"   • Google Rating: {analysis.google_rating or 'N/A'} ⭐",
        f"   • Reviews Analyzed: {analysis.reviews_analyzed}",
        f"   • Key Issues Found: {len(analysis.key_issues) if analysis.key_issues else 0}",
        "",
        f"View full analysis:",
        view_url,
        "",
        "---",
        "This analysis was generated by PeakOps",
        "AI-powered operations management for hospitality businesses",
        f"{settings.FRONTEND_URL}",
    ]

    message = "\n".join(message_parts)

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )

        return Response({'message': 'Analysis shared successfully'})

    except Exception as e:
        return Response(
            {'error': 'Failed to send email'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
