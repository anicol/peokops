"""
Service for generating review insights and trending topics analysis (Phase 3)
"""
import logging
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import Dict, List, Optional
from django.db.models import Count, Avg, Q
from django.utils import timezone

from .models import (
    GoogleReview, YelpReview, ReviewTopicSnapshot,
    TopicTrend, GoogleLocation
)

logger = logging.getLogger(__name__)


class ReviewInsightsService:
    """Service for generating insights and trends from review data"""
    
    def generate_topic_snapshots(
        self, 
        account_id: int,
        location_id: Optional[str] = None,
        window_type: str = 'weekly',
        snapshot_date: Optional[datetime] = None
    ) -> List[ReviewTopicSnapshot]:
        """
        Generate topic snapshots for a time window.
        
        Args:
            account_id: Account to generate snapshots for
            location_id: Optional specific location (None = all locations)
            window_type: 'daily', 'weekly', or 'monthly'
            snapshot_date: Date to generate snapshot for (defaults to today)
        
        Returns:
            List of created ReviewTopicSnapshot objects
        """
        if snapshot_date is None:
            snapshot_date = timezone.now().date()
        
        # Calculate date range based on window type
        if window_type == 'daily':
            start_date = snapshot_date
            end_date = snapshot_date + timedelta(days=1)
        elif window_type == 'weekly':
            start_date = snapshot_date - timedelta(days=snapshot_date.weekday())
            end_date = start_date + timedelta(days=7)
        else:  # monthly
            start_date = snapshot_date.replace(day=1)
            next_month = start_date + timedelta(days=32)
            end_date = next_month.replace(day=1)
        
        logger.info(f"Generating {window_type} snapshots for {account_id} from {start_date} to {end_date}")

        # Query Google Reviews in this time window
        google_reviews_query = GoogleReview.objects.filter(
            account_id=account_id,
            review_created_at__gte=start_date,
            review_created_at__lt=end_date
        )

        # Query Yelp Reviews in this time window
        yelp_reviews_query = YelpReview.objects.filter(
            account_id=account_id,
            review_created_at__gte=start_date,
            review_created_at__lt=end_date
        )

        if location_id:
            google_reviews_query = google_reviews_query.filter(location_id=location_id)
            yelp_reviews_query = yelp_reviews_query.filter(location_id=location_id)

        # Get reviews with analysis from both sources
        google_reviews_with_analysis = google_reviews_query.filter(
            analysis__isnull=False
        ).prefetch_related('analysis')

        yelp_reviews_with_analysis = yelp_reviews_query.filter(
            analysis__isnull=False
        ).prefetch_related('analysis')

        # Combine both review sources
        reviews_with_analysis = list(google_reviews_with_analysis) + list(yelp_reviews_with_analysis)
        
        # Aggregate topic data
        topic_data = defaultdict(lambda: {
            'total': 0,
            'positive': 0,
            'negative': 0,
            'sentiments': []
        })
        
        for review in reviews_with_analysis:
            try:
                analysis = review.analysis
                topics = analysis.topics or []
                sentiment = analysis.sentiment_score or 0
                is_positive = review.rating >= 4
                
                for topic in topics:
                    topic_data[topic]['total'] += 1
                    topic_data[topic]['sentiments'].append(sentiment)
                    
                    if is_positive:
                        topic_data[topic]['positive'] += 1
                    else:
                        topic_data[topic]['negative'] += 1
                        
            except Exception as e:
                logger.warning(f"Error processing review {review.id}: {e}")
                continue
        
        # Create snapshots
        snapshots = []
        location = GoogleLocation.objects.get(id=location_id) if location_id else None
        
        for topic, data in topic_data.items():
            avg_sentiment = sum(data['sentiments']) / len(data['sentiments']) if data['sentiments'] else None
            
            snapshot, created = ReviewTopicSnapshot.objects.update_or_create(
                account_id=account_id,
                location=location,
                topic=topic,
                snapshot_date=snapshot_date,
                window_type=window_type,
                defaults={
                    'mention_count': data['total'],
                    'positive_mentions': data['positive'],
                    'negative_mentions': data['negative'],
                    'avg_sentiment': avg_sentiment,
                }
            )
            snapshots.append(snapshot)
        
        logger.info(f"Created {len(snapshots)} topic snapshots")
        return snapshots
    
    def calculate_trends(
        self,
        account_id: int,
        location_id: Optional[str] = None,
        lookback_weeks: int = 4
    ) -> List[TopicTrend]:
        """
        Calculate trending topics based on historical snapshots.
        
        Args:
            account_id: Account to calculate trends for
            location_id: Optional specific location
            lookback_weeks: Number of weeks to look back for trend calculation
        
        Returns:
            List of updated TopicTrend objects
        """
        today = timezone.now().date()
        current_week_start = today - timedelta(days=today.weekday())
        previous_week_start = current_week_start - timedelta(days=7)
        
        logger.info(f"Calculating trends for account {account_id}")
        
        # Get current week snapshots
        current_snapshots_query = ReviewTopicSnapshot.objects.filter(
            account_id=account_id,
            snapshot_date=current_week_start,
            window_type='weekly'
        )
        
        # Get previous week snapshots  
        previous_snapshots_query = ReviewTopicSnapshot.objects.filter(
            account_id=account_id,
            snapshot_date=previous_week_start,
            window_type='weekly'
        )
        
        if location_id:
            current_snapshots_query = current_snapshots_query.filter(location_id=location_id)
            previous_snapshots_query = previous_snapshots_query.filter(location_id=location_id)
        
        # Build topic maps
        current_topics = {s.topic: s for s in current_snapshots_query}
        previous_topics = {s.topic: s for s in previous_snapshots_query}
        
        all_topics = set(current_topics.keys()) | set(previous_topics.keys())
        
        trends = []
        location = GoogleLocation.objects.get(id=location_id) if location_id else None
        
        for topic in all_topics:
            current = current_topics.get(topic)
            previous = previous_topics.get(topic)
            
            current_count = current.mention_count if current else 0
            previous_count = previous.mention_count if previous else 0
            
            # Determine trend direction
            if previous_count == 0:
                if current_count > 0:
                    direction = TopicTrend.TrendDirection.NEW
                    percent_change = None
                else:
                    continue  # Skip if no mentions in either period
            else:
                percent_change = ((current_count - previous_count) / previous_count) * 100
                
                if percent_change > 20:
                    direction = TopicTrend.TrendDirection.INCREASING
                elif percent_change < -20:
                    direction = TopicTrend.TrendDirection.DECREASING
                else:
                    direction = TopicTrend.TrendDirection.STABLE
            
            # Calculate velocity (mentions per week)
            velocity = current_count - previous_count
            
            # Determine overall sentiment
            if current:
                sentiment_score = current.avg_sentiment or 0
                if sentiment_score > 0.2:
                    sentiment = TopicTrend.Sentiment.POSITIVE
                elif sentiment_score < -0.2:
                    sentiment = TopicTrend.Sentiment.NEGATIVE
                else:
                    sentiment = TopicTrend.Sentiment.NEUTRAL
            else:
                sentiment = TopicTrend.Sentiment.NEUTRAL
            
            # Determine category (could be enhanced with ML)
            category = self._infer_category(topic)
            
            # Update or create trend
            trend, created = TopicTrend.objects.update_or_create(
                account_id=account_id,
                location=location,
                topic=topic,
                defaults={
                    'trend_direction': direction,
                    'trend_velocity': velocity,
                    'current_mentions': current_count,
                    'previous_mentions': previous_count,
                    'percent_change': percent_change,
                    'overall_sentiment': sentiment,
                    'category': category,
                    'is_active': current_count > 0,
                }
            )
            trends.append(trend)
        
        logger.info(f"Calculated {len(trends)} topic trends")
        return trends
    
    def _infer_category(self, topic: str) -> str:
        """Infer category from topic text using keyword matching"""
        topic_lower = topic.lower()
        
        # Food-related keywords
        food_keywords = ['food', 'meal', 'dish', 'menu', 'taste', 'flavor', 'quality', 
                        'fresh', 'cold', 'hot', 'cook', 'ingredient', 'sandwich', 
                        'pizza', 'salad', 'drink', 'beverage']
        
        # Service-related keywords
        service_keywords = ['service', 'staff', 'waiter', 'server', 'friendly', 
                           'rude', 'helpful', 'attentive', 'slow', 'fast', 'wait']
        
        # Cleanliness keywords
        clean_keywords = ['clean', 'dirty', 'sanitary', 'hygiene', 'bathroom', 
                         'table', 'floor', 'tidy', 'mess']
        
        # Atmosphere keywords
        atmosphere_keywords = ['atmosphere', 'ambiance', 'music', 'noise', 'loud', 
                              'quiet', 'decor', 'interior', 'seating']
        
        # Value keywords
        value_keywords = ['price', 'expensive', 'cheap', 'value', 'worth', 'cost', 
                         'affordable', 'overpriced']
        
        if any(kw in topic_lower for kw in food_keywords):
            return 'Food Quality'
        elif any(kw in topic_lower for kw in service_keywords):
            return 'Service'
        elif any(kw in topic_lower for kw in clean_keywords):
            return 'Cleanliness'
        elif any(kw in topic_lower for kw in atmosphere_keywords):
            return 'Atmosphere'
        elif any(kw in topic_lower for kw in value_keywords):
            return 'Value'
        else:
            return 'Other'
    
    def get_insights_summary(
        self,
        account_id: int,
        location_id: Optional[str] = None
    ) -> Dict:
        """
        Get comprehensive insights summary for account/location.
        
        Returns:
            Dictionary with trending topics, sentiment breakdown, and key insights
        """
        # Get active trends
        trends_query = TopicTrend.objects.filter(
            account_id=account_id,
            is_active=True
        )
        
        if location_id:
            trends_query = trends_query.filter(location_id=location_id)
        
        # Get top trending issues (negative sentiment, increasing)
        top_issues = trends_query.filter(
            overall_sentiment=TopicTrend.Sentiment.NEGATIVE,
            trend_direction=TopicTrend.TrendDirection.INCREASING
        ).order_by('-current_mentions')[:5]
        
        # Get improving areas (negative sentiment, decreasing)
        improving = trends_query.filter(
            overall_sentiment=TopicTrend.Sentiment.NEGATIVE,
            trend_direction=TopicTrend.TrendDirection.DECREASING
        ).order_by('-previous_mentions')[:5]
        
        # Get top praise themes (positive sentiment, high mentions)
        praise = trends_query.filter(
            overall_sentiment=TopicTrend.Sentiment.POSITIVE
        ).order_by('-current_mentions')[:5]
        
        # Get new topics
        new_topics = trends_query.filter(
            trend_direction=TopicTrend.TrendDirection.NEW
        ).order_by('-current_mentions')[:5]
        
        # Get sentiment breakdown from both Google and Yelp reviews
        google_reviews_query = GoogleReview.objects.filter(account_id=account_id)
        yelp_reviews_query = YelpReview.objects.filter(account_id=account_id)

        if location_id:
            google_reviews_query = google_reviews_query.filter(location_id=location_id)
            yelp_reviews_query = yelp_reviews_query.filter(location_id=location_id)

        # Count reviews from both sources
        google_total = google_reviews_query.count()
        google_positive = google_reviews_query.filter(rating__gte=4).count()
        google_neutral = google_reviews_query.filter(rating=3).count()
        google_negative = google_reviews_query.filter(rating__lte=2).count()

        yelp_total = yelp_reviews_query.count()
        yelp_positive = yelp_reviews_query.filter(rating__gte=4).count()
        yelp_neutral = yelp_reviews_query.filter(rating=3).count()
        yelp_negative = yelp_reviews_query.filter(rating__lte=2).count()

        # Aggregate totals
        total_reviews = google_total + yelp_total
        positive_reviews = google_positive + yelp_positive
        neutral_reviews = google_neutral + yelp_neutral
        negative_reviews = google_negative + yelp_negative
        
        return {
            'top_issues': [self._serialize_trend(t) for t in top_issues],
            'improving_areas': [self._serialize_trend(t) for t in improving],
            'top_praise': [self._serialize_trend(t) for t in praise],
            'new_topics': [self._serialize_trend(t) for t in new_topics],
            'sentiment_breakdown': {
                'total': total_reviews,
                'positive': positive_reviews,
                'neutral': neutral_reviews,
                'negative': negative_reviews,
                'positive_percent': (positive_reviews / total_reviews * 100) if total_reviews > 0 else 0,
                'neutral_percent': (neutral_reviews / total_reviews * 100) if total_reviews > 0 else 0,
                'negative_percent': (negative_reviews / total_reviews * 100) if total_reviews > 0 else 0,
            }
        }
    
    def _serialize_trend(self, trend: TopicTrend) -> Dict:
        """Serialize a TopicTrend object for API response"""
        return {
            'id': str(trend.id),
            'topic': trend.topic,
            'category': trend.category,
            'sentiment': trend.overall_sentiment,
            'direction': trend.trend_direction,
            'velocity': trend.trend_velocity,
            'current_mentions': trend.current_mentions,
            'previous_mentions': trend.previous_mentions,
            'percent_change': trend.percent_change,
            'last_updated': trend.last_updated.isoformat(),
        }
