"""
API views for Feedback Dashboard
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from integrations.feedback_service import FeedbackService


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feedback_overview(request):
    """
    Get comprehensive feedback overview combining Google Reviews and Employee Pulse

    Query Parameters:
        - days: Number of days to analyze (default: 7)
        - store_id: Optional store ID filter
        - sources: Comma-separated list of sources (google,yelp,employee)

    Returns:
        {
            "guest_sentiment": {...},
            "employee_sentiment": {...},
            "themes": [...],
            "evidence": [...],
            "quiet_wins": [...],
            "metadata": {...}
        }
    """
    # Get query parameters
    days = int(request.query_params.get('days', 7))
    store_id = request.query_params.get('store_id')
    sources_param = request.query_params.get('sources', 'google,employee')

    # Parse sources
    sources = [s.strip() for s in sources_param.split(',') if s.strip()]

    # Get user's account
    account_id = request.user.account_id
    if not account_id:
        return Response(
            {'error': 'User must be associated with an account'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Convert store_id to int if provided
    if store_id:
        try:
            store_id = int(store_id)
        except ValueError:
            return Response(
                {'error': 'Invalid store_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Get feedback data
    service = FeedbackService()

    try:
        data = service.get_feedback_overview(
            account_id=account_id,
            store_id=store_id,
            days=days,
            sources=sources
        )

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to generate feedback overview: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_focus_period(request):
    """
    Create a focused period for a theme

    Request Body:
        {
            "theme_id": "cleanliness",
            "duration_weeks": 2,
            "frequency": "daily",
            "templates": ["Restroom check", "Dining floor clean/dry"]
        }

    Returns:
        {
            "id": 1,
            "theme": "Cleanliness",
            "start_date": "2025-11-06",
            "end_date": "2025-11-20",
            "frequency": "daily",
            "templates": [...]
        }
    """
    theme_id = request.data.get('theme_id')
    duration_weeks = request.data.get('duration_weeks', 2)
    frequency = request.data.get('frequency', 'daily')
    templates = request.data.get('templates', [])

    if not theme_id:
        return Response(
            {'error': 'theme_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # TODO: Implement FocusPeriod model and creation logic
    # For now, return a mock response

    from django.utils import timezone
    from datetime import timedelta

    start_date = timezone.now().date()
    end_date = start_date + timedelta(weeks=duration_weeks)

    return Response({
        'id': 1,
        'theme': theme_id.replace('_', ' ').title(),
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'frequency': frequency,
        'templates': templates,
        'status': 'active'
    }, status=status.HTTP_201_CREATED)
