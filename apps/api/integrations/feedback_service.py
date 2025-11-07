"""
Feedback aggregation service for combining Google Reviews and Employee Pulse data
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from collections import defaultdict, Counter

from django.db.models import Count, Avg, Q, F
from django.utils import timezone

from integrations.models import GoogleReview, GoogleReviewAnalysis, TopicTrend
from employee_voice.models import EmployeeVoicePulse

logger = logging.getLogger(__name__)


class FeedbackService:
    """Service for aggregating feedback from multiple sources"""

    CATEGORIES = ['Food Quality', 'Service', 'Cleanliness', 'Atmosphere', 'Value', 'Other']

    def get_feedback_overview(
        self,
        account_id: int,
        store_id: Optional[int] = None,
        days: int = 7,
        sources: Optional[List[str]] = None
    ) -> Dict:
        """
        Get comprehensive feedback overview combining guest reviews and employee pulse

        Args:
            account_id: Account ID
            store_id: Optional store ID for filtering
            days: Number of days to analyze
            sources: Optional list of sources to include ['google', 'yelp', 'employee']

        Returns:
            Dict with sentiment data, themes, evidence, and quiet wins
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Default to all sources
        if sources is None:
            sources = ['google', 'employee']

        # Get sentiment data
        guest_sentiment = self._calculate_guest_sentiment(
            account_id, store_id, start_date, end_date, sources
        )

        employee_sentiment = self._calculate_employee_sentiment(
            account_id, store_id, start_date, end_date
        ) if 'employee' in sources else None

        # Get themes
        themes = self._extract_themes(
            account_id, store_id, start_date, end_date, sources
        )

        # Get evidence feed
        evidence = self._get_evidence_feed(
            account_id, store_id, start_date, end_date, sources
        )

        # Get quiet wins (positive patterns)
        quiet_wins = self._extract_quiet_wins(
            account_id, store_id, start_date, end_date, sources
        )

        return {
            'guest_sentiment': guest_sentiment,
            'employee_sentiment': employee_sentiment,
            'themes': themes,
            'evidence': evidence,
            'quiet_wins': quiet_wins,
            'metadata': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days,
                'sources': sources
            }
        }

    def _calculate_guest_sentiment(
        self,
        account_id: int,
        store_id: Optional[int],
        start_date: datetime,
        end_date: datetime,
        sources: List[str]
    ) -> Dict:
        """Calculate guest sentiment metrics from reviews"""
        from integrations.models import GoogleLocation

        # Build query for current period
        reviews_query = GoogleReview.objects.filter(
            location__account_id=account_id,
            review_created_at__gte=start_date,
            review_created_at__lte=end_date,
            analysis__isnull=False
        )

        if store_id:
            reviews_query = reviews_query.filter(location__store_id=store_id)

        # Get reviews
        reviews = reviews_query.select_related('analysis')
        total_count = reviews.count()

        if total_count == 0:
            return {
                'percent': 0,
                'delta': 0,
                'trend': 'stable',
                'count': 0,
                'weekly_data': [],
                'breakdown': {'positive': 0, 'neutral': 0, 'negative': 0}
            }

        # Calculate sentiment breakdown
        positive = reviews.filter(analysis__sentiment_score__gte=0.3).count()
        negative = reviews.filter(analysis__sentiment_score__lt=-0.3).count()
        neutral = total_count - positive - negative

        current_percent = round((positive / total_count) * 100) if total_count > 0 else 0

        # Calculate previous period for comparison
        prev_start = start_date - timedelta(days=(end_date - start_date).days)
        prev_reviews = GoogleReview.objects.filter(
            location__account_id=account_id,
            review_created_at__gte=prev_start,
            review_created_at__lt=start_date,
            analysis__isnull=False
        )

        if store_id:
            prev_reviews = prev_reviews.filter(location__store_id=store_id)

        prev_count = prev_reviews.count()
        prev_positive = prev_reviews.filter(analysis__sentiment_score__gte=0.3).count()
        prev_percent = round((prev_positive / prev_count) * 100) if prev_count > 0 else current_percent

        delta = current_percent - prev_percent
        trend = 'up' if delta > 2 else ('down' if delta < -2 else 'stable')

        # Generate daily breakdown for the week
        weekly_data = []
        current_date = start_date

        while current_date <= end_date:
            day_end = current_date + timedelta(days=1)
            day_reviews = reviews.filter(
                review_created_at__gte=current_date,
                review_created_at__lt=day_end
            )

            day_count = day_reviews.count()
            day_positive = day_reviews.filter(analysis__sentiment_score__gte=0.3).count()
            day_percent = round((day_positive / day_count) * 100) if day_count > 0 else 0

            weekly_data.append({
                'day': current_date.strftime('%a'),
                'percent': day_percent,
                'label': current_date.strftime('%a %m/%d')
            })

            current_date = day_end

        return {
            'percent': current_percent,
            'delta': abs(delta),
            'trend': trend,
            'count': total_count,
            'weekly_data': weekly_data,
            'breakdown': {
                'positive': positive,
                'neutral': neutral,
                'negative': negative
            }
        }

    def _calculate_employee_sentiment(
        self,
        account_id: int,
        store_id: Optional[int],
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Calculate employee sentiment from pulse surveys"""
        # TODO: Employee pulse integration pending - model structure doesn't match yet
        # The EmployeeVoicePulse model doesn't have 'mood' or 'feedback' fields
        # Return empty data for now
        return {
            'rating': 0,
            'delta': 0,
            'trend': 'stable',
            'count': 0,
            'weekly_data': [],
            'breakdown': {'very_happy': 0, 'happy': 0, 'neutral': 0, 'unhappy': 0}
        }

    def _extract_themes(
        self,
        account_id: int,
        store_id: Optional[int],
        start_date: datetime,
        end_date: datetime,
        sources: List[str]
    ) -> List[Dict]:
        """Extract trending themes from reviews and employee feedback"""
        themes_data = defaultdict(lambda: {
            'volume': 0,
            'positive': 0,
            'negative': 0,
            'neutral': 0,
            'topics': Counter(),
            'linked_templates': set(),
            'evidence': []
        })

        # Process Google Reviews
        if 'google' in sources:
            reviews = GoogleReview.objects.filter(
                location__account_id=account_id,
                review_created_at__gte=start_date,
                review_created_at__lte=end_date,
                analysis__isnull=False
            ).select_related('analysis')

            if store_id:
                reviews = reviews.filter(location__store_id=store_id)

            for review in reviews:
                for category in review.analysis.categories:
                    themes_data[category]['volume'] += 1

                    # Classify sentiment
                    if review.analysis.sentiment_score >= 0.3:
                        themes_data[category]['positive'] += 1
                    elif review.analysis.sentiment_score <= -0.3:
                        themes_data[category]['negative'] += 1
                    else:
                        themes_data[category]['neutral'] += 1

                    # Track topics
                    for topic in review.analysis.topics:
                        themes_data[category]['topics'][topic] += 1

        # Process Employee Pulse (map to themes based on feedback content)
        # TODO: Employee pulse integration pending - model structure doesn't match yet
        # The EmployeeVoicePulse model is survey configuration, not response data
        # if 'employee' in sources:
        #     pass

        # Calculate previous period for trends
        prev_start = start_date - timedelta(days=(end_date - start_date).days)
        prev_themes_volume = defaultdict(int)

        prev_reviews = GoogleReview.objects.filter(
            location__account_id=account_id,
            review_created_at__gte=prev_start,
            review_created_at__lt=start_date,
            analysis__isnull=False
        ).select_related('analysis')

        if store_id:
            prev_reviews = prev_reviews.filter(location__store_id=store_id)

        for review in prev_reviews:
            for category in review.analysis.categories:
                prev_themes_volume[category] += 1

        # Build themes list
        themes = []

        for category, data in themes_data.items():
            if data['volume'] == 0:
                continue

            total = data['positive'] + data['neutral'] + data['negative']
            sentiment_percent = round((data['positive'] / total) * 100) if total > 0 else 0

            prev_volume = prev_themes_volume.get(category, 0)
            delta_percent = round(((data['volume'] - prev_volume) / prev_volume) * 100) if prev_volume > 0 else 100

            trend = 'up' if delta_percent > 10 else ('down' if delta_percent < -10 else 'stable')

            # Determine severity based on negative volume and trend
            negative_ratio = data['negative'] / total if total > 0 else 0
            if negative_ratio > 0.5 and trend == 'up':
                severity = 'high'
            elif negative_ratio > 0.3 or (negative_ratio > 0.2 and trend == 'up'):
                severity = 'medium'
            else:
                severity = 'low'

            # Get top topics
            top_topics = [topic for topic, _ in data['topics'].most_common(3)]

            # Map to check templates (simplified mapping)
            template_mapping = {
                'Cleanliness': ['Restroom check', 'Dining floor clean/dry', 'Entryway clear'],
                'Service': ['Greeting standard at FOH', 'Manager touch table (daily)'],
                'Speed/Wait Time': ['Expo station set', 'Order queue visible & staffed', 'Hot holding ready'],
                'Food Quality': ['Hot holding temp check', 'Quality check at expo'],
                'Staff Attitude': ['Team huddle completed', 'Manager check-in with team'],
            }

            linked_templates = template_mapping.get(category, [])

            # Generate AI summary
            ai_summary = self._generate_theme_summary(
                category, data, trend, delta_percent, top_topics
            )

            themes.append({
                'id': category.lower().replace(' ', '_').replace('/', '_'),
                'name': category,
                'trend': trend,
                'severity': severity,
                'volume': data['volume'],
                'sentiment_percent': sentiment_percent,
                'delta_percent': delta_percent,
                'ai_summary': ai_summary,
                'linked_templates': linked_templates,
                'top_topics': top_topics
            })

        # Sort by volume (impact)
        themes.sort(key=lambda x: x['volume'], reverse=True)

        return themes

    def _generate_theme_summary(
        self,
        category: str,
        data: Dict,
        trend: str,
        delta_percent: float,
        top_topics: List[str]
    ) -> str:
        """Generate AI-style summary for a theme"""
        total = data['positive'] + data['neutral'] + data['negative']

        if trend == 'up' and data['negative'] / total > 0.5:
            trend_phrase = f"increased {abs(delta_percent):.0f}% week-over-week"
        elif trend == 'down':
            trend_phrase = f"improving! Mentions down {abs(delta_percent):.0f}%"
        else:
            trend_phrase = "stable performance"

        topic_phrase = f"Key issues: {', '.join(top_topics[:2])}" if top_topics else ""

        return f"{category} mentions {trend_phrase}. {topic_phrase}".strip()

    def _get_evidence_feed(
        self,
        account_id: int,
        store_id: Optional[int],
        start_date: datetime,
        end_date: datetime,
        sources: List[str],
        limit: int = 20
    ) -> List[Dict]:
        """Get evidence feed from reviews and employee pulse"""
        evidence = []

        # Get Google Reviews
        if 'google' in sources:
            reviews = GoogleReview.objects.filter(
                location__account_id=account_id,
                review_created_at__gte=start_date,
                review_created_at__lte=end_date,
                analysis__isnull=False
            ).select_related('analysis', 'location', 'location__store').order_by('-review_created_at')[:limit]

            if store_id:
                reviews = reviews.filter(location__store_id=store_id)

            for review in reviews:
                # Get primary category
                primary_category = review.analysis.categories[0] if review.analysis.categories else 'Other'

                # Determine sentiment
                if review.analysis.sentiment_score >= 0.3:
                    sentiment = 'positive'
                elif review.analysis.sentiment_score <= -0.3:
                    sentiment = 'negative'
                else:
                    sentiment = 'neutral'

                # Calculate time ago
                time_diff = timezone.now() - review.review_created_at
                if time_diff.days > 0:
                    time_ago = f"{time_diff.days} day{'s' if time_diff.days != 1 else ''} ago"
                elif time_diff.seconds >= 3600:
                    hours = time_diff.seconds // 3600
                    time_ago = f"{hours} hour{'s' if hours != 1 else ''} ago"
                else:
                    minutes = time_diff.seconds // 60
                    time_ago = f"{minutes} minute{'s' if minutes != 1 else ''} ago"

                evidence.append({
                    'id': str(review.id),
                    'source': 'google',
                    'timestamp': time_ago,
                    'store': review.location.store.name if review.location and review.location.store else None,
                    'quote': review.review_text[:200] + '...' if len(review.review_text) > 200 else review.review_text,
                    'full_text': review.review_text,
                    'theme': primary_category,
                    'sentiment': sentiment,
                    'author': review.reviewer_name,
                    'rating': review.rating
                })

        # Get Employee Pulse
        # TODO: Employee pulse integration pending - model structure doesn't match yet
        # if 'employee' in sources:
        #     pass

        # Sort by timestamp (most recent first)
        evidence.sort(key=lambda x: x['timestamp'])

        return evidence[:limit]

    def _extract_quiet_wins(
        self,
        account_id: int,
        store_id: Optional[int],
        start_date: datetime,
        end_date: datetime,
        sources: List[str]
    ) -> List[Dict]:
        """Extract positive patterns (quiet wins)"""
        wins = []

        # Analyze positive reviews
        if 'google' in sources:
            positive_reviews = GoogleReview.objects.filter(
                location__account_id=account_id,
                review_created_at__gte=start_date,
                review_created_at__lte=end_date,
                analysis__sentiment_score__gte=0.5
            ).select_related('analysis')

            if store_id:
                positive_reviews = positive_reviews.filter(location__store_id=store_id)

            # Count positive mentions by category
            positive_categories = defaultdict(int)
            category_keywords = defaultdict(list)

            for review in positive_reviews:
                for category in review.analysis.categories:
                    positive_categories[category] += 1

                    # Extract positive keywords
                    if category == 'Service' or category == 'Staff Attitude':
                        keywords = ['friendly', 'welcoming', 'helpful', 'kind', 'pleasant']
                        if any(kw in review.review_text.lower() for kw in keywords):
                            category_keywords[category].extend(keywords)
                    elif category == 'Food Quality':
                        keywords = ['fresh', 'hot', 'delicious', 'quality']
                        if any(kw in review.review_text.lower() for kw in keywords):
                            category_keywords[category].extend(keywords)

            # Create wins for categories with significant positive mentions
            for category, count in positive_categories.items():
                if count >= 5:  # Threshold for "quiet win"
                    common_keywords = Counter(category_keywords[category]).most_common(2)
                    keyword_phrase = ', '.join([kw for kw, _ in common_keywords]) if common_keywords else category.lower()

                    wins.append({
                        'theme': category,
                        'quote': f"Guests praised {keyword_phrase} {count} times this week—great work!",
                        'count': count
                    })

        # Sort by count
        wins.sort(key=lambda x: x['count'], reverse=True)

        return wins[:3]  # Return top 3 wins
