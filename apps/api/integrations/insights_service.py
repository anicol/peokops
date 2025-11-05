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

    def get_top_issues_by_category(
        self,
        account_id: str,
        location_id: Optional[str] = None,
        limit: int = 3,
        days: int = 30,
        categories: Optional[List[str]] = None
    ) -> Dict:
        """Get top N issues grouped by category with trend analysis

        Args:
            account_id: Account UUID
            location_id: Optional location UUID for store-level analysis
            limit: Number of top issues per category (default 3)
            days: Number of days to analyze (default 30)
            categories: Optional list of categories to filter (default: all)

        Returns:
            Dict with category-grouped issues and trends
        """
        from datetime import timedelta
        from django.utils import timezone
        from django.db.models import Count, Avg, Q

        # Define all possible categories if none specified
        all_categories = ['Food Quality', 'Service', 'Cleanliness', 'Atmosphere', 'Value', 'Other']
        target_categories = categories if categories else all_categories

        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Get trends for this account/location
        trends_query = TopicTrend.objects.filter(
            account_id=account_id,
            is_active=True
        )

        if location_id:
            trends_query = trends_query.filter(location_id=location_id)
        else:
            trends_query = trends_query.filter(location__isnull=True)

        # Group issues by category
        category_issues = {}

        for category in target_categories:
            # Get negative sentiment trends for this category
            category_trends = trends_query.filter(
                category=category,
                overall_sentiment='NEGATIVE'
            ).order_by('-current_mentions', '-trend_velocity')[:limit]

            # Get example reviews for each issue
            issues = []
            for trend in category_trends:
                # Find reviews mentioning this topic
                review_query = GoogleReview.objects.filter(
                    account_id=account_id,
                    review_created_at__gte=start_date,
                    review_created_at__lte=end_date,
                    analysis__topics__contains=[trend.topic]
                )

                if location_id:
                    review_query = review_query.filter(location_id=location_id)

                # Get example reviews (up to 3)
                examples = review_query.select_related('analysis').order_by('-rating')[:3]

                issues.append({
                    'topic': trend.topic,
                    'total_mentions': trend.current_mentions,
                    'affected_locations': 1,  # Store-level = always 1 location
                    'trend_direction': trend.trend_direction,
                    'trend_velocity': trend.trend_velocity,
                    'sentiment': trend.overall_sentiment,
                    'percent_change': trend.percent_change,
                    'examples': [
                        {
                            'reviewer': review.reviewer_name,
                            'rating': review.rating,
                            'review_text': review.review_text[:200] + '...' if len(review.review_text) > 200 else review.review_text,
                            'date': review.review_created_at.isoformat()
                        }
                        for review in examples
                    ]
                })

            # Only include categories that have issues
            if issues:
                category_issues[category] = {
                    'top_issues': issues,
                    'total_issues': len(issues),
                    'trend_summary': self._calculate_category_trend_summary(trends_query, category)
                }

        return {
            'categories': category_issues,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'scope': {
                'account_id': str(account_id),
                'location_id': str(location_id) if location_id else None,
                'level': 'store' if location_id else 'account'
            }
        }

    def _calculate_category_trend_summary(self, trends_query, category: str) -> Dict:
        """Calculate overall trend summary for a category"""
        category_trends = trends_query.filter(category=category)

        total_mentions = sum(t.current_mentions for t in category_trends)
        increasing_count = category_trends.filter(trend_direction='INCREASING').count()
        decreasing_count = category_trends.filter(trend_direction='DECREASING').count()

        # Determine overall category direction
        if increasing_count > decreasing_count:
            overall_direction = 'WORSENING'
        elif decreasing_count > increasing_count:
            overall_direction = 'IMPROVING'
        else:
            overall_direction = 'STABLE'

        return {
            'total_mentions': total_mentions,
            'trend_direction': overall_direction,
            'increasing_topics': increasing_count,
            'decreasing_topics': decreasing_count
        }

    def get_multi_store_issues_by_category(
        self,
        account_id: str,
        store_ids: Optional[List[str]] = None,
        limit: int = 3,
        days: int = 30,
        categories: Optional[List[str]] = None
    ) -> Dict:
        """Get top issues across multiple stores with store-level breakdown

        Args:
            account_id: Account UUID
            store_ids: Optional list of store UUIDs (if None, uses all stores in account)
            limit: Number of top issues per category
            days: Number of days to analyze
            categories: Optional list of categories to filter

        Returns:
            Dict with category-grouped issues aggregated across stores, plus per-store breakdown
        """
        from datetime import timedelta
        from django.utils import timezone
        from django.db.models import Count, Q
        from brands.models import Store

        # Get stores for this account
        stores_query = Store.objects.filter(account_id=account_id, is_active=True)
        if store_ids:
            stores_query = stores_query.filter(id__in=store_ids)

        stores = list(stores_query)
        if not stores:
            return {
                'categories': {},
                'stores': [],
                'error': 'No active stores found for this account'
            }

        # Get locations linked to these stores
        from .models import GoogleLocation
        location_ids = list(
            GoogleLocation.objects.filter(
                store__in=stores,
                account_id=account_id
            ).values_list('id', flat=True)
        )

        # Define categories
        all_categories = ['Food Quality', 'Service', 'Cleanliness', 'Atmosphere', 'Value', 'Other']
        target_categories = categories if categories else all_categories

        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Aggregate issues across all stores
        aggregated_issues = self._aggregate_issues_across_locations(
            account_id=account_id,
            location_ids=location_ids,
            target_categories=target_categories,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        # Get per-store breakdown
        store_breakdowns = []
        for store in stores:
            store_location = GoogleLocation.objects.filter(store=store, account_id=account_id).first()
            if store_location:
                store_data = self.get_top_issues_by_category(
                    account_id=account_id,
                    location_id=str(store_location.id),
                    limit=limit,
                    days=days,
                    categories=target_categories
                )
                store_breakdowns.append({
                    'store_id': str(store.id),
                    'store_name': store.name,
                    'store_code': store.code,
                    'region': store.region,
                    'issues': store_data
                })

        return {
            'categories': aggregated_issues,
            'stores': store_breakdowns,
            'store_count': len(stores),
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'scope': {
                'account_id': str(account_id),
                'level': 'multi_store'
            }
        }

    def get_brand_issues_by_category(
        self,
        brand_id: str,
        limit: int = 3,
        days: int = 30,
        categories: Optional[List[str]] = None,
        region: Optional[str] = None
    ) -> Dict:
        """Get top issues across entire brand (all accounts/stores) with regional breakdown

        Args:
            brand_id: Brand UUID
            limit: Number of top issues per category
            days: Number of days to analyze
            categories: Optional list of categories to filter
            region: Optional region filter

        Returns:
            Dict with brand-wide category issues, regional breakdown, and account comparisons
        """
        from datetime import timedelta
        from django.utils import timezone
        from brands.models import Store, Brand
        from accounts.models import Account

        # Verify brand exists
        try:
            brand = Brand.objects.get(id=brand_id)
        except Brand.DoesNotExist:
            return {'error': 'Brand not found'}

        # Get all stores for this brand
        stores_query = Store.objects.filter(brand_id=brand_id, is_active=True)
        if region:
            stores_query = stores_query.filter(region=region)

        stores = list(stores_query)
        if not stores:
            return {
                'categories': {},
                'regions': [],
                'accounts': [],
                'error': 'No active stores found for this brand'
            }

        # Get all accounts (franchisees) in this brand
        account_ids = stores_query.values_list('account_id', flat=True).distinct()
        accounts = Account.objects.filter(id__in=account_ids)

        # Get all locations for these stores
        from .models import GoogleLocation
        all_location_ids = list(
            GoogleLocation.objects.filter(
                store__in=stores
            ).values_list('id', flat=True)
        )

        # Define categories
        all_categories = ['Food Quality', 'Service', 'Cleanliness', 'Atmosphere', 'Value', 'Other']
        target_categories = categories if categories else all_categories

        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Get brand-wide aggregated issues (need to aggregate across multiple accounts)
        brand_wide_issues = self._aggregate_brand_wide_issues(
            stores=stores,
            target_categories=target_categories,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        # Get regional breakdown
        regions = stores_query.values_list('region', flat=True).distinct()
        regional_breakdowns = []
        for region_name in regions:
            if region_name:  # Skip empty regions
                region_stores = stores_query.filter(region=region_name)
                region_location_ids = list(
                    GoogleLocation.objects.filter(
                        store__in=region_stores
                    ).values_list('id', flat=True)
                )
                region_issues = self._aggregate_issues_across_locations(
                    account_id=None,  # Brand level - cross-account
                    location_ids=region_location_ids,
                    target_categories=target_categories,
                    start_date=start_date,
                    end_date=end_date,
                    limit=limit
                )
                regional_breakdowns.append({
                    'region': region_name,
                    'store_count': region_stores.count(),
                    'issues': region_issues
                })

        # Get account (franchisee) comparison
        account_comparisons = []
        for account in accounts:
            account_stores = [s for s in stores if s.account_id == account.id]
            account_location_ids = list(
                GoogleLocation.objects.filter(
                    store__in=account_stores,
                    account=account
                ).values_list('id', flat=True)
            )
            if account_location_ids:
                account_issues = self._aggregate_issues_across_locations(
                    account_id=str(account.id),
                    location_ids=account_location_ids,
                    target_categories=target_categories,
                    start_date=start_date,
                    end_date=end_date,
                    limit=limit
                )
                account_comparisons.append({
                    'account_id': str(account.id),
                    'account_name': account.name,
                    'store_count': len(account_stores),
                    'issues': account_issues
                })

        return {
            'brand': {
                'id': str(brand.id),
                'name': brand.name
            },
            'categories': brand_wide_issues,
            'regions': regional_breakdowns,
            'accounts': account_comparisons,
            'total_stores': len(stores),
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'scope': {
                'brand_id': str(brand_id),
                'level': 'brand',
                'region_filter': region
            }
        }

    def _aggregate_issues_across_locations(
        self,
        account_id: Optional[str],
        location_ids: List[str],
        target_categories: List[str],
        start_date,
        end_date,
        limit: int
    ) -> Dict:
        """Helper to aggregate issues across multiple locations"""
        from django.db.models import Sum, Avg

        category_issues = {}

        for category in target_categories:
            # Aggregate trends across all locations
            from .models import TopicTrend, GoogleReview

            # Get all negative trends for this category across locations
            trends_query = TopicTrend.objects.filter(
                location_id__in=location_ids,
                category=category,
                overall_sentiment='NEGATIVE',
                is_active=True
            )

            # Group by topic name and aggregate mentions
            topic_aggregates = {}
            for trend in trends_query:
                if trend.topic not in topic_aggregates:
                    topic_aggregates[trend.topic] = {
                        'total_mentions': 0,
                        'locations': [],
                        'trend_directions': []
                    }
                topic_aggregates[trend.topic]['total_mentions'] += trend.current_mentions
                topic_aggregates[trend.topic]['locations'].append(str(trend.location_id))
                topic_aggregates[trend.topic]['trend_directions'].append(trend.trend_direction)

            # Sort by total mentions and take top N
            sorted_topics = sorted(
                topic_aggregates.items(),
                key=lambda x: x[1]['total_mentions'],
                reverse=True
            )[:limit]

            # Build issues list with examples
            issues = []
            for topic, data in sorted_topics:
                # Get example reviews for this topic across all locations
                reviews_query = GoogleReview.objects.filter(
                    location_id__in=location_ids,
                    review_created_at__gte=start_date,
                    review_created_at__lte=end_date,
                    analysis__topics__contains=[topic]
                )
                if account_id:
                    reviews_query = reviews_query.filter(account_id=account_id)

                examples = reviews_query.select_related('analysis', 'location').order_by('-rating')[:3]

                # Determine predominant trend direction
                increasing = data['trend_directions'].count('INCREASING')
                decreasing = data['trend_directions'].count('DECREASING')
                if increasing > decreasing:
                    predominant_direction = 'INCREASING'
                elif decreasing > increasing:
                    predominant_direction = 'DECREASING'
                else:
                    predominant_direction = 'STABLE'

                issues.append({
                    'topic': topic,
                    'total_mentions': data['total_mentions'],
                    'affected_locations': len(set(data['locations'])),
                    'trend_direction': predominant_direction,
                    'examples': [
                        {
                            'reviewer': review.reviewer_name,
                            'rating': review.rating,
                            'review_text': review.review_text[:200] + '...' if len(review.review_text) > 200 else review.review_text,
                            'date': review.review_created_at.isoformat(),
                            'store': review.location.store.name if review.location and review.location.store else 'Unknown'
                        }
                        for review in examples
                    ]
                })

            # Only include categories that have issues
            if issues:
                category_issues[category] = {
                    'top_issues': issues,
                    'total_issues': len(issues)
                }

        return category_issues

    def _aggregate_brand_wide_issues(
        self,
        stores: List,
        target_categories: List[str],
        start_date,
        end_date,
        limit: int
    ) -> Dict:
        """Helper to aggregate issues across all stores in a brand (cross-account)"""
        from .models import GoogleLocation

        # Get all locations for these stores (across different accounts)
        all_location_ids = list(
            GoogleLocation.objects.filter(
                store__in=stores
            ).values_list('id', flat=True)
        )

        return self._aggregate_issues_across_locations(
            account_id=None,  # Cross-account aggregation
            location_ids=all_location_ids,
            target_categories=target_categories,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
