"""
Admin Analytics ViewSet for Sys Admin Dashboard
Provides engagement metrics and insights across all stores
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from django.db.models import Count, Q, Avg, F, Max, Min, Sum
from django.db.models.functions import TruncHour, TruncDate
from django.utils import timezone
from datetime import timedelta, datetime

from .models import (
    MicroCheckRun,
    MicroCheckResponse,
    MicroCheckTemplate,
    StoreStreak,
    MicroCheckStreak,
    CorrectiveAction,
    MicroCheckAssignment,
    MediaAsset
)
from brands.models import Store, Brand
from accounts.models import User


class IsSuperAdmin(BasePermission):
    """
    Permission class that only allows SUPER_ADMIN users.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.SUPER_ADMIN
        )


class AdminAnalyticsViewSet(viewsets.ViewSet):
    """
    Super Admin-only analytics endpoints for customer engagement tracking.

    Restricted to SUPER_ADMIN role only.

    Provides metrics for:
    - Overall engagement (active stores, DAU, completion rates)
    - Per-store performance and trends
    - Template usage and effectiveness
    - Engagement funnel analysis
    """
    permission_classes = [IsSuperAdmin]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Get high-level engagement metrics across all stores.

        Returns:
        - Active stores % (today and 7-day)
        - Daily Active Managers (DAU)
        - Average streak across all stores
        - Overall completion rate
        - Top failing categories
        - Photo/proof rate
        """
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)

        # Total stores count
        total_stores = Store.objects.filter(brand__is_active=True).count()

        # Active stores today (at least 1 completed run)
        stores_active_today = MicroCheckRun.objects.filter(
            completed_at__gte=today_start,
            status='COMPLETED'
        ).values('store').distinct().count()

        active_stores_pct_today = (stores_active_today / total_stores * 100) if total_stores > 0 else 0

        # Active stores this week
        stores_active_week = MicroCheckRun.objects.filter(
            completed_at__gte=week_start,
            status='COMPLETED'
        ).values('store').distinct().count()

        active_stores_pct_week = (stores_active_week / total_stores * 100) if total_stores > 0 else 0

        # Daily Active Managers (unique users completing checks today)
        dau = MicroCheckResponse.objects.filter(
            completed_at__gte=today_start
        ).values('completed_by').distinct().count()

        # DAU yesterday for comparison
        yesterday_start = today_start - timedelta(days=1)
        dau_yesterday = MicroCheckResponse.objects.filter(
            completed_at__gte=yesterday_start,
            completed_at__lt=today_start
        ).values('completed_by').distinct().count()

        dau_change = dau - dau_yesterday

        # Average streak across all stores
        avg_streak = StoreStreak.objects.aggregate(
            avg_current=Avg('current_streak'),
            avg_longest=Avg('longest_streak')
        )

        # Completion rate (completed runs / total runs in last 7 days)
        runs_week = MicroCheckRun.objects.filter(created_at__gte=week_start)
        total_runs = runs_week.count()
        completed_runs = runs_week.filter(status='COMPLETED').count()
        completion_rate = (completed_runs / total_runs * 100) if total_runs > 0 else 0

        # Top failing categories (last 7 days)
        category_stats = MicroCheckResponse.objects.filter(
            completed_at__gte=week_start
        ).values('category').annotate(
            total=Count('id'),
            failed=Count('id', filter=Q(status='FAIL'))
        ).annotate(
            fail_rate=F('failed') * 100.0 / F('total')
        ).order_by('-fail_rate')[:5]

        # Photo/proof rate (% of responses with media)
        responses_week = MicroCheckResponse.objects.filter(completed_at__gte=week_start)
        total_responses = responses_week.count()
        responses_with_media = responses_week.filter(media__isnull=False).count()
        photo_rate = (responses_with_media / total_responses * 100) if total_responses > 0 else 0

        # Engagement funnel
        # Stage 1: Invited (assignments sent in last 30 days)
        thirty_days_ago = now - timedelta(days=30)
        invited = MicroCheckAssignment.objects.filter(
            sent_at__gte=thirty_days_ago
        ).values('sent_to').distinct().count()

        # Stage 2: Started (users who opened at least one assignment)
        started = MicroCheckAssignment.objects.filter(
            sent_at__gte=thirty_days_ago,
            opened_at__isnull=False
        ).values('sent_to').distinct().count()

        # Stage 3: Completed 1st check
        completed_first = MicroCheckResponse.objects.filter(
            completed_at__gte=thirty_days_ago
        ).values('completed_by').distinct().count()

        # Stage 4: 3-day streak (users with streak >= 3)
        three_day_streak = MicroCheckStreak.objects.filter(
            current_streak__gte=3
        ).count()

        # Stage 5: 7-day habit (users with streak >= 7)
        seven_day_habit = MicroCheckStreak.objects.filter(
            current_streak__gte=7
        ).count()

        engagement_funnel = [
            {'stage': 'Invited', 'count': invited, 'percentage': 100},
            {'stage': 'Started', 'count': started, 'percentage': (started / invited * 100) if invited > 0 else 0},
            {'stage': '1st Check', 'count': completed_first, 'percentage': (completed_first / invited * 100) if invited > 0 else 0},
            {'stage': '3-Day Streak', 'count': three_day_streak, 'percentage': (three_day_streak / invited * 100) if invited > 0 else 0},
            {'stage': '7-Day Habit', 'count': seven_day_habit, 'percentage': (seven_day_habit / invited * 100) if invited > 0 else 0},
        ]

        return Response({
            'active_stores': {
                'today': {
                    'count': stores_active_today,
                    'percentage': round(active_stores_pct_today, 1),
                    'total': total_stores
                },
                'week': {
                    'count': stores_active_week,
                    'percentage': round(active_stores_pct_week, 1),
                    'total': total_stores
                }
            },
            'dau': {
                'today': dau,
                'yesterday': dau_yesterday,
                'change': dau_change
            },
            'average_streak': {
                'current': round(avg_streak['avg_current'] or 0, 1),
                'longest': round(avg_streak['avg_longest'] or 0, 1)
            },
            'completion_rate': round(completion_rate, 1),
            'top_failing_categories': [
                {
                    'category': item['category'],
                    'total': item['total'],
                    'failed': item['failed'],
                    'fail_rate': round(item['fail_rate'], 1)
                }
                for item in category_stats
            ],
            'photo_rate': round(photo_rate, 1),
            'engagement_funnel': engagement_funnel
        })

    @action(detail=False, methods=['get'])
    def stores(self, request):
        """
        Get per-store engagement data for store list/grid view.

        Returns array of stores with:
        - Store name, region
        - Current streak
        - Last activity date
        - Completion rate (7 days)
        - Status (active/sporadic/inactive)
        """
        week_start = timezone.now() - timedelta(days=7)

        stores = Store.objects.filter(brand__is_active=True).select_related('brand')

        store_data = []
        for store in stores:
            # Get store streak
            try:
                streak = StoreStreak.objects.get(store=store)
                current_streak = streak.current_streak
                last_completion = streak.last_completion_date
            except StoreStreak.DoesNotExist:
                current_streak = 0
                last_completion = None

            # Get 7-day completion stats
            runs_week = MicroCheckRun.objects.filter(
                store=store,
                created_at__gte=week_start
            )
            total_runs = runs_week.count()
            completed_runs = runs_week.filter(status='COMPLETED').count()
            completion_rate = (completed_runs / total_runs * 100) if total_runs > 0 else 0

            # Determine status
            if current_streak >= 7:
                engagement_status = 'active'  # 🟢
            elif current_streak >= 3 or completion_rate >= 50:
                engagement_status = 'sporadic'  # 🟡
            else:
                engagement_status = 'inactive'  # 🔴

            store_data.append({
                'id': store.id,
                'name': store.name,
                'region': store.region,
                'brand_name': store.brand.name,
                'current_streak': current_streak,
                'last_completion_date': last_completion,
                'completion_rate_7d': round(completion_rate, 1),
                'status': engagement_status,
                'total_runs_7d': total_runs,
                'completed_runs_7d': completed_runs
            })

        # Sort by streak descending
        store_data.sort(key=lambda x: x['current_streak'], reverse=True)

        return Response(store_data)

    @action(detail=False, methods=['get'])
    def store_detail(self, request):
        """
        Get detailed analytics for a specific store.

        Query params:
        - store_id: Store ID (required)

        Returns:
        - 7-day completion trend
        - 30-day streak calendar
        - Common "Needs Fix" templates
        - Store stats
        """
        store_id = request.query_params.get('store_id')
        if not store_id:
            return Response({'error': 'store_id parameter required'}, status=400)

        store = get_object_or_404(Store, id=store_id)
        now = timezone.now()
        week_start = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        # 7-day completion trend (daily completions + pass rate)
        daily_trend = []
        for i in range(7):
            day_start = (week_start + timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            runs_day = MicroCheckRun.objects.filter(
                store=store,
                completed_at__gte=day_start,
                completed_at__lt=day_end,
                status='COMPLETED'
            ).count()

            responses_day = MicroCheckResponse.objects.filter(
                store=store,
                completed_at__gte=day_start,
                completed_at__lt=day_end
            )
            total_checks = responses_day.count()
            passed_checks = responses_day.filter(status='PASS').count()
            pass_rate = (passed_checks / total_checks * 100) if total_checks > 0 else None

            daily_trend.append({
                'date': day_start.date().isoformat(),
                'completions': runs_day,
                'pass_rate': round(pass_rate, 1) if pass_rate is not None else None,
                'total_checks': total_checks
            })

        # 30-day streak calendar (daily completion count)
        streak_calendar = []
        for i in range(30):
            day_start = (thirty_days_ago + timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            completions = MicroCheckRun.objects.filter(
                store=store,
                completed_at__gte=day_start,
                completed_at__lt=day_end,
                status='COMPLETED'
            ).count()

            streak_calendar.append({
                'date': day_start.date().isoformat(),
                'completions': completions,
                'intensity': 'high' if completions >= 3 else ('medium' if completions >= 1 else 'none')
            })

        # Common "Needs Fix" templates (last 30 days)
        failed_templates = MicroCheckResponse.objects.filter(
            store=store,
            status='FAIL',
            completed_at__gte=thirty_days_ago
        ).values(
            'template__id',
            'template__title',
            'template__category'
        ).annotate(
            fail_count=Count('id'),
            last_failed=Max('completed_at')
        ).order_by('-fail_count')[:10]

        # Store stats
        try:
            streak = StoreStreak.objects.get(store=store)
            current_streak = streak.current_streak
            total_completions = streak.total_completions
        except StoreStreak.DoesNotExist:
            current_streak = 0
            total_completions = 0

        # Photo rate (all time)
        all_responses = MicroCheckResponse.objects.filter(store=store)
        total_all = all_responses.count()
        with_media = all_responses.filter(media__isnull=False).count()
        photo_rate = (with_media / total_all * 100) if total_all > 0 else 0

        # Average time to complete (last 30 days)
        avg_completion_time = MicroCheckResponse.objects.filter(
            store=store,
            completed_at__gte=thirty_days_ago,
            completion_seconds__isnull=False
        ).aggregate(avg=Avg('completion_seconds'))['avg']

        avg_time_minutes = (avg_completion_time / 60) if avg_completion_time else None

        return Response({
            'store': {
                'id': store.id,
                'name': store.name,
                'region': store.region,
                'brand_name': store.brand.name
            },
            'daily_trend': daily_trend,
            'streak_calendar': streak_calendar,
            'common_failures': [
                {
                    'template_id': item['template__id'],
                    'title': item['template__title'],
                    'category': item['template__category'],
                    'fail_count': item['fail_count'],
                    'last_failed': item['last_failed']
                }
                for item in failed_templates
            ],
            'stats': {
                'current_streak': current_streak,
                'total_completions': total_completions,
                'photo_rate': round(photo_rate, 1),
                'avg_completion_time_minutes': round(avg_time_minutes, 1) if avg_time_minutes else None
            }
        })

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """
        Get template usage and effectiveness insights.

        Returns:
        - Template usage ranking (usage count, fail rate, last used)
        - Template performance data for scatter plot
        - Category distribution
        """
        week_start = timezone.now() - timedelta(days=7)

        # Template usage stats (last 7 days)
        template_stats = MicroCheckResponse.objects.filter(
            completed_at__gte=week_start
        ).values(
            'template__id',
            'template__title',
            'template__category'
        ).annotate(
            usage_count=Count('id'),
            fail_count=Count('id', filter=Q(status='FAIL')),
            last_used=Max('completed_at')
        ).annotate(
            fail_rate=F('fail_count') * 100.0 / F('usage_count')
        ).order_by('-usage_count')

        # Category distribution
        category_distribution = MicroCheckResponse.objects.filter(
            completed_at__gte=week_start
        ).values('category').annotate(
            count=Count('id')
        ).order_by('-count')

        return Response({
            'template_ranking': [
                {
                    'template_id': item['template__id'],
                    'title': item['template__title'],
                    'category': item['template__category'],
                    'usage_count': item['usage_count'],
                    'fail_count': item['fail_count'],
                    'fail_rate': round(item['fail_rate'], 1),
                    'last_used': item['last_used']
                }
                for item in template_stats
            ],
            'category_distribution': [
                {
                    'category': item['category'],
                    'count': item['count'],
                    'percentage': round(item['count'] / sum(c['count'] for c in category_distribution) * 100, 1) if category_distribution else 0
                }
                for item in category_distribution
            ]
        })

    @action(detail=False, methods=['get'])
    def time_of_day(self, request):
        """
        Get time-of-day activity patterns.

        Returns hourly completion counts for the last 7 days.
        """
        week_start = timezone.now() - timedelta(days=7)

        # Group by hour of day
        hourly_data = MicroCheckResponse.objects.filter(
            completed_at__gte=week_start
        ).annotate(
            hour=TruncHour('completed_at')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('hour')

        # Aggregate by hour (0-23)
        hourly_counts = [0] * 24
        for item in hourly_data:
            hour = item['hour'].hour
            hourly_counts[hour] += item['count']

        # Format for chart
        hourly_chart_data = [
            {
                'hour': f"{h}:00",
                'hour_24': h,
                'completions': hourly_counts[h]
            }
            for h in range(24)
        ]

        # Find peak hour
        peak_hour = max(range(24), key=lambda h: hourly_counts[h])
        peak_count = hourly_counts[peak_hour]

        return Response({
            'hourly_data': hourly_chart_data,
            'peak_activity': {
                'hour': f"{peak_hour}:00",
                'count': peak_count
            }
        })


def get_object_or_404(model, **kwargs):
    """Helper to get object or return 404"""
    from django.shortcuts import get_object_or_404 as django_get_object_or_404
    return django_get_object_or_404(model, **kwargs)
