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


@api_view(['GET'])
def analysis_by_place_id(request, place_id):
    """
    Get most recent completed review analysis for a Google place_id
    GET /api/insights/by-place/{place_id}/
    """
    from rest_framework.permissions import IsAuthenticated

    # Require authentication
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    # Get the most recent completed analysis for this place_id
    analysis = ReviewAnalysis.objects.filter(
        place_id=place_id,
        status=ReviewAnalysis.Status.COMPLETED
    ).order_by('-completed_at').first()

    if not analysis:
        return Response(
            {'error': 'No completed analysis found for this location'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = ReviewAnalysisDetailSerializer(analysis)
    return Response(serializer.data)


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


# ========================================
# 360° Insights Aggregate Endpoint
# ========================================

@api_view(['GET'])
def insights_summary(request, store_id):
    """
    Get aggregate insights for a store (360° operational intelligence).
    Composes Customer, Employee, and Operational voices in one response.

    GET /api/insights/store/{store_id}/summary/
    """
    from rest_framework.permissions import IsAuthenticated
    from brands.models import Store
    from .models import StoreInsightsState

    # Check permissions
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    # Get store and verify access
    store = get_object_or_404(Store, id=store_id)

    # Verify user has access to this store
    if not _user_can_access_store(request.user, store):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    # Get or create insights state
    insights_state, created = StoreInsightsState.objects.get_or_create(store=store)

    # Update voices active status
    insights_state.update_voices_active()

    # Track analytics
    _track_event('insights_viewed', request.user, store)

    # Compose response
    response_data = {
        "store_health": insights_state.store_health_score,
        "voices": {
            "customer": _get_customer_voice(store),
            "employee": _get_employee_voice(store, insights_state),
            "operational": _get_operational_voice(store)
        },
        "unlock": {
            "employee_voice_unlocked": insights_state.employee_voice_unlocked,
            "cross_voice_unlocked": insights_state.cross_voice_unlocked
        },
        "last_updated": insights_state.last_updated.isoformat()
    }

    # Add correlations if cross-voice is unlocked
    if insights_state.cross_voice_unlocked:
        response_data["correlations"] = _compute_correlations(store)

    return Response(response_data)


def _user_can_access_store(user, store):
    """Check if user has access to this store"""
    from accounts.models import User

    # SUPER_ADMIN and ADMIN see all stores
    if user.role in [User.Role.SUPER_ADMIN, User.Role.ADMIN]:
        return True

    # Other roles see stores in their brand/account
    if user.store and user.store.brand:
        return store.brand == user.store.brand

    return False


def _get_customer_voice(store):
    """
    Get customer voice data (Google reviews sentiment).
    Returns: {rating, delta, themes[], ai_summary}
    """
    from integrations.models import GoogleLocation

    # Check if store has Google location linked
    if not hasattr(store, 'google_location') or not store.google_location:
        return {
            "locked": False,
            "available": False,
            "message": "No Google location linked yet",
            "cta": "Link Google Business Profile"
        }

    google_location = store.google_location

    # Get review data
    rating = float(google_location.average_rating) if google_location.average_rating else 0
    total_reviews = google_location.total_review_count or 0

    # Calculate delta (simplified - compare to last sync)
    # TODO: Store historical ratings for real delta calculation
    delta = 0  # Placeholder

    # Get themes from recent review analysis
    # TODO: Implement theme extraction from reviews
    themes = [
        {"name": "Cleanliness", "mentions": 12, "sentiment": "positive", "trend": "up"},
        {"name": "Wait Time", "mentions": 7, "sentiment": "negative", "trend": "down"},
        {"name": "Staff Attitude", "mentions": 5, "sentiment": "mixed", "trend": "stable"}
    ]

    # AI summary
    ai_summary = f"Guests appreciate the clean environment but mention occasional wait times. Consider adding a 'Speed of Service' check."

    return {
        "locked": False,
        "available": True,
        "rating": rating,
        "delta": delta,
        "total_reviews": total_reviews,
        "themes": themes,
        "ai_summary": ai_summary
    }


def _get_employee_voice(store, insights_state):
    """
    Get employee voice data (pulse surveys).
    Returns: engagement score, key questions, obstacles
    """
    if not insights_state.employee_voice_unlocked:
        return {
            "locked": True,
            "progress": {
                "completed": insights_state.pulse_surveys_completed,
                "required": 5
            },
            "message": "Complete 5 one-minute pulses to unlock Employee Voice"
        }

    # TODO: Implement real pulse survey data aggregation
    # For now, return mock data
    return {
        "locked": False,
        "available": True,
        "engagement_score": 7.8,
        "engagement_delta": 0.5,
        "key_questions": [
            {
                "question": "Do you have what you need to run your shift?",
                "yes_percentage": 82
            },
            {
                "question": "What's slowing you down today?",
                "top_obstacles": ["Equipment", "Staffing", "Clarity"]
            }
        ],
        "ai_insight": "When employee confidence rises above 80%, guest sentiment improves within 2 weeks. Focus on maintaining team clarity this cycle."
    }


def _get_operational_voice(store):
    """
    Get operational voice data (micro-checks).
    Returns: completion rate, avg score, streak, top categories
    """
    from micro_checks.models import MicroCheckRun, MicroCheckResponse
    from django.db.models import Avg, Count, Case, When, IntegerField, Q
    from datetime import timedelta
    from django.utils import timezone

    # Get runs in last 30 days
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_runs = MicroCheckRun.objects.filter(
        store=store,
        created_at__gte=thirty_days_ago
    )

    total_runs = recent_runs.count()
    completed_runs = recent_runs.filter(completed_at__isnull=False).count()

    completion_rate = round((completed_runs / total_runs * 100)) if total_runs > 0 else 0

    # Calculate average score from responses
    # Score = (PASS responses / Total non-skipped responses) * 100
    completed_run_ids = recent_runs.filter(completed_at__isnull=False).values_list('id', flat=True)

    if completed_run_ids:
        response_stats = MicroCheckResponse.objects.filter(
            run_id__in=completed_run_ids
        ).exclude(
            status='SKIPPED'
        ).aggregate(
            total=Count('id'),
            passed=Count(Case(When(status='PASS', then=1), output_field=IntegerField()))
        )

        total_responses = response_stats['total'] or 0
        passed_responses = response_stats['passed'] or 0
        avg_score = round((passed_responses / total_responses * 100)) if total_responses > 0 else 0
    else:
        avg_score = 0

    # Calculate streak
    streak = _calculate_streak(store)

    # Top improving categories
    # TODO: Implement category trend analysis
    top_categories = [
        {"name": "Cleanliness", "improvement": 12},
        {"name": "Signage", "improvement": 8},
        {"name": "PPE Compliance", "improvement": 6}
    ]

    # AI summary
    ai_summary = "Sanitation checks are improving fastest; signage consistency is your next opportunity."

    return {
        "locked": False,
        "available": True,
        "completion_rate": completion_rate,
        "avg_score": round(avg_score),
        "streak": streak,
        "top_categories": top_categories,
        "ai_summary": ai_summary
    }


def _calculate_streak(store):
    """Calculate current micro-check streak for store"""
    from micro_checks.models import MicroCheckRun
    from django.utils import timezone
    from datetime import timedelta

    today = timezone.now().date()
    streak = 0
    check_date = today

    # Count consecutive days with completed checks
    while True:
        has_check = MicroCheckRun.objects.filter(
            store=store,
            created_at__date=check_date,
            completed_at__isnull=False
        ).exists()

        if not has_check:
            break

        streak += 1
        check_date -= timedelta(days=1)

        # Cap at 365 days for performance
        if streak >= 365:
            break

    return streak


def _compute_correlations(store):
    """
    Compute cross-voice correlations (v1 rules engine).
    Returns: [{metric, correlated_with, insight, evidence}]
    """
    correlations = []

    # TODO: Implement real correlation logic
    # For now, return mock correlations based on simple rules

    # Rule 1: Employee confidence → Reviews
    correlations.append({
        "metric": "High employee confidence",
        "correlated_with": "Improved review scores",
        "insight": "When staff report clarity above 80%, guest sentiment improves within 2 weeks",
        "evidence": "+0.3 stars, 82% confidence"
    })

    # Rule 2: Streak → Cleanliness mentions
    correlations.append({
        "metric": "5+ day check streak",
        "correlated_with": "Positive cleanliness mentions",
        "insight": "Daily habits show up in guest feedback",
        "evidence": "12 positive mentions"
    })

    return correlations


def _track_event(event_name, user, store, **kwargs):
    """Track analytics event (placeholder)"""
    # TODO: Implement real analytics tracking
    # For now, just log
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Analytics: {event_name} by {user.email} for store {store.id}")
    pass
