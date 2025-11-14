from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncHour, TruncDate
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import UserBehaviorEvent, User
from .permissions import IsSuperAdmin
from django.core.cache import cache


class UserActivityAnalyticsViewSet(viewsets.ViewSet):
    """
    Analytics endpoints for tracking customer (OWNER/TRIAL_ADMIN) user activity.
    Super admin only access for engagement monitoring.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def _get_customer_users(self):
        """Get all OWNER and TRIAL_ADMIN users"""
        return User.objects.filter(
            role__in=[User.Role.OWNER, User.Role.TRIAL_ADMIN]
        )

    def _get_date_range(self, request):
        """Parse date range from request params, default to last 30 days"""
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        return start_date, end_date

    @extend_schema(
        summary="Get user activity overview metrics",
        description="Returns high-level KPIs for customer user engagement",
        parameters=[
            OpenApiParameter(name='days', description='Number of days to analyze (default: 30)', type=int),
        ],
        responses={200: dict}
    )
    @action(detail=False, methods=['get'], url_path='overview')
    def overview(self, request):
        """
        Get aggregated user activity metrics:
        - DAU, WAU, MAU
        - Feature adoption rates
        - Average session duration
        - Most active features
        """
        cache_key = f'user_activity_overview_{request.query_params.get("days", 30)}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        start_date, end_date = self._get_date_range(request)
        customer_users = self._get_customer_users()

        # Daily Active Users (last 24 hours)
        dau_start = timezone.now() - timedelta(days=1)
        dau = UserBehaviorEvent.objects.filter(
            user__in=customer_users,
            timestamp__gte=dau_start
        ).values('user').distinct().count()

        # Weekly Active Users (last 7 days)
        wau_start = timezone.now() - timedelta(days=7)
        wau = UserBehaviorEvent.objects.filter(
            user__in=customer_users,
            timestamp__gte=wau_start
        ).values('user').distinct().count()

        # Monthly Active Users (last 30 days)
        mau = UserBehaviorEvent.objects.filter(
            user__in=customer_users,
            timestamp__gte=start_date
        ).values('user').distinct().count()

        # Total events in period
        total_events = UserBehaviorEvent.objects.filter(
            user__in=customer_users,
            timestamp__gte=start_date,
            timestamp__lte=end_date
        ).count()

        # Feature adoption (% of users who used each feature category)
        total_users = customer_users.count()

        feature_adoption = {
            'micro_checks': UserBehaviorEvent.objects.filter(
                user__in=customer_users,
                event_type__in=['CHECK_CREATED', 'CHECK_STARTED', 'CHECK_COMPLETED'],
                timestamp__gte=start_date
            ).values('user').distinct().count() / max(total_users, 1) * 100,

            'employee_voice': UserBehaviorEvent.objects.filter(
                user__in=customer_users,
                event_type__in=['PULSE_CREATED', 'PULSE_CONFIGURED', 'PULSE_ANALYTICS_VIEWED'],
                timestamp__gte=start_date
            ).values('user').distinct().count() / max(total_users, 1) * 100,

            'templates': UserBehaviorEvent.objects.filter(
                user__in=customer_users,
                event_type__in=['TEMPLATE_VIEWED', 'TEMPLATE_SELECTED', 'AI_GENERATION_USED'],
                timestamp__gte=start_date
            ).values('user').distinct().count() / max(total_users, 1) * 100,

            'analytics': UserBehaviorEvent.objects.filter(
                user__in=customer_users,
                event_type__in=['INSIGHTS_VIEWED', 'DASHBOARD_ACCESSED', 'REPORT_FILTERED'],
                timestamp__gte=start_date
            ).values('user').distinct().count() / max(total_users, 1) * 100,
        }

        # Most active event types
        top_events = UserBehaviorEvent.objects.filter(
            user__in=customer_users,
            timestamp__gte=start_date,
            timestamp__lte=end_date
        ).values('event_type').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        # Average events per active user
        avg_events_per_user = total_events / max(mau, 1)

        data = {
            'dau': dau,
            'wau': wau,
            'mau': mau,
            'total_events': total_events,
            'avg_events_per_user': round(avg_events_per_user, 1),
            'feature_adoption': {k: round(v, 1) for k, v in feature_adoption.items()},
            'top_events': list(top_events),
            'time_window': f'Last {(end_date - start_date).days} days'
        }

        # Cache for 30 seconds
        cache.set(cache_key, data, 30)
        return Response(data)

    @extend_schema(
        summary="Get user activity timeline",
        description="Returns time-series data of user activity (hourly or daily aggregation)",
        parameters=[
            OpenApiParameter(name='days', description='Number of days to analyze (default: 7)', type=int),
            OpenApiParameter(name='granularity', description='hour or day (default: hour)', type=str),
        ],
        responses={200: dict}
    )
    @action(detail=False, methods=['get'], url_path='timeline')
    def timeline(self, request):
        """Get time-series activity data for charting"""
        cache_key = f'user_activity_timeline_{request.query_params.get("days", 7)}_{request.query_params.get("granularity", "hour")}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        days = int(request.query_params.get('days', 7))
        granularity = request.query_params.get('granularity', 'hour')

        start_date = timezone.now() - timedelta(days=days)
        customer_users = self._get_customer_users()

        # Choose aggregation function
        trunc_function = TruncHour if granularity == 'hour' else TruncDate

        timeline_data = UserBehaviorEvent.objects.filter(
            user__in=customer_users,
            timestamp__gte=start_date
        ).annotate(
            period=trunc_function('timestamp')
        ).values('period').annotate(
            event_count=Count('id'),
            unique_users=Count('user', distinct=True)
        ).order_by('period')

        data = {
            'granularity': granularity,
            'start_date': start_date.isoformat(),
            'end_date': timezone.now().isoformat(),
            'timeline': [
                {
                    'timestamp': item['period'].isoformat(),
                    'event_count': item['event_count'],
                    'unique_users': item['unique_users']
                }
                for item in timeline_data
            ]
        }

        # Cache for 30 seconds
        cache.set(cache_key, data, 30)
        return Response(data)

    @extend_schema(
        summary="Get feature usage breakdown",
        description="Returns detailed breakdown of feature usage by event type",
        parameters=[
            OpenApiParameter(name='days', description='Number of days to analyze (default: 30)', type=int),
        ],
        responses={200: dict}
    )
    @action(detail=False, methods=['get'], url_path='by-feature')
    def by_feature(self, request):
        """Get feature usage statistics grouped by feature category"""
        cache_key = f'user_activity_by_feature_{request.query_params.get("days", 30)}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        start_date, end_date = self._get_date_range(request)
        customer_users = self._get_customer_users()

        # Group events by feature category
        feature_categories = {
            'Navigation': ['PAGE_VIEW', 'FEATURE_ACCESSED', 'TAB_SWITCHED', 'STORE_SWITCHED'],
            'Micro-Checks': ['CHECK_CREATED', 'CHECK_STARTED', 'CHECK_COMPLETED', 'CHECK_SKIPPED',
                            'CORRECTIVE_ACTION_CREATED', 'CORRECTIVE_ACTION_RESOLVED'],
            'Employee Voice': ['PULSE_CREATED', 'PULSE_CONFIGURED', 'PULSE_PAUSED', 'PULSE_RESUMED',
                             'INVITATION_SENT', 'RESPONSE_VIEWED', 'PULSE_ANALYTICS_VIEWED'],
            'Templates': ['TEMPLATE_VIEWED', 'TEMPLATE_SELECTED', 'TEMPLATE_CUSTOMIZED',
                         'AI_GENERATION_USED', 'TEMPLATE_CREATED'],
            'Analytics': ['INSIGHTS_VIEWED', 'REPORT_FILTERED', 'DASHBOARD_ACCESSED',
                         'EXPORT_CLICKED', 'SEARCH_PERFORMED'],
            'Media': ['PHOTO_UPLOADED', 'VIDEO_UPLOADED', 'MEDIA_VIEWED'],
            'Settings': ['SETTINGS_VIEWED', 'SETTINGS_UPDATED', 'USER_INVITED', 'INTEGRATION_CONFIGURED'],
        }

        feature_stats = {}
        for category, event_types in feature_categories.items():
            events = UserBehaviorEvent.objects.filter(
                user__in=customer_users,
                event_type__in=event_types,
                timestamp__gte=start_date,
                timestamp__lte=end_date
            )

            feature_stats[category] = {
                'total_events': events.count(),
                'unique_users': events.values('user').distinct().count(),
                'event_breakdown': list(events.values('event_type').annotate(
                    count=Count('id')
                ).order_by('-count'))
            }

        data = {
            'time_window': f'Last {(end_date - start_date).days} days',
            'features': feature_stats
        }

        # Cache for 30 seconds
        cache.set(cache_key, data, 30)
        return Response(data)

    @extend_schema(
        summary="Get recent user activity feed",
        description="Returns paginated list of recent user actions",
        parameters=[
            OpenApiParameter(name='limit', description='Number of events to return (default: 100)', type=int),
            OpenApiParameter(name='event_type', description='Filter by event type', type=str),
        ],
        responses={200: dict}
    )
    @action(detail=False, methods=['get'], url_path='recent')
    def recent(self, request):
        """Get recent activity feed with optional filtering"""
        limit = int(request.query_params.get('limit', 100))
        event_type = request.query_params.get('event_type')

        customer_users = self._get_customer_users()

        events = UserBehaviorEvent.objects.filter(
            user__in=customer_users
        ).select_related('user', 'user__account', 'user__store')

        if event_type:
            events = events.filter(event_type=event_type)

        events = events.order_by('-timestamp')[:limit]

        data = {
            'count': events.count(),
            'events': [
                {
                    'id': str(event.id),
                    'user': {
                        'id': event.user.id,
                        'username': event.user.username,
                        'email': event.user.email,
                        'role': event.user.role,
                        'account': event.user.account.name if event.user.account else None,
                        'store': event.user.store.name if event.user.store else None,
                    },
                    'event_type': event.event_type,
                    'event_label': event.get_event_type_display(),
                    'metadata': event.metadata,
                    'timestamp': event.timestamp.isoformat(),
                    'session_id': event.session_id,
                }
                for event in events
            ]
        }

        return Response(data)

    @extend_schema(
        summary="Get user activity for specific account",
        description="Returns activity analytics for a single account",
        parameters=[
            OpenApiParameter(name='account_id', description='Account ID', type=int, required=True),
            OpenApiParameter(name='days', description='Number of days to analyze (default: 30)', type=int),
        ],
        responses={200: dict}
    )
    @action(detail=False, methods=['get'], url_path='account-activity')
    def account_activity(self, request):
        """Get activity for a specific account"""
        account_id = request.query_params.get('account_id')
        if not account_id:
            return Response(
                {'error': 'account_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        start_date, end_date = self._get_date_range(request)

        account_users = User.objects.filter(
            account_id=account_id,
            role__in=[User.Role.OWNER, User.Role.TRIAL_ADMIN]
        )

        total_events = UserBehaviorEvent.objects.filter(
            user__in=account_users,
            timestamp__gte=start_date,
            timestamp__lte=end_date
        ).count()

        active_users = UserBehaviorEvent.objects.filter(
            user__in=account_users,
            timestamp__gte=start_date
        ).values('user').distinct().count()

        top_events = UserBehaviorEvent.objects.filter(
            user__in=account_users,
            timestamp__gte=start_date,
            timestamp__lte=end_date
        ).values('event_type').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        # Last activity timestamp
        last_activity = UserBehaviorEvent.objects.filter(
            user__in=account_users
        ).order_by('-timestamp').first()

        data = {
            'account_id': account_id,
            'total_users': account_users.count(),
            'active_users': active_users,
            'total_events': total_events,
            'top_events': list(top_events),
            'last_activity': last_activity.timestamp.isoformat() if last_activity else None,
            'time_window': f'Last {(end_date - start_date).days} days'
        }

        return Response(data)
