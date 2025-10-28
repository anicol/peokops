"""
Review-based Micro-Check Generator

Analyzes review patterns and automatically creates micro-checks for recurring issues.
"""

import logging
from collections import Counter, defaultdict
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q

from .models import GoogleReview, GoogleReviewAnalysis, GoogleReviewsConfig
from micro_checks.models import MicroCheckTemplate

logger = logging.getLogger(__name__)


class ReviewMicroCheckGenerator:
    """Generates micro-checks from review patterns"""

    # Map review categories to micro-check categories
    CATEGORY_MAPPING = {
        'cleanliness': 'CLEANLINESS',
        'service': 'OPERATIONAL',
        'food_quality': 'FOOD_QUALITY',
        'wait_time': 'OPERATIONAL',
        'staff_attitude': 'STAFF_BEHAVIOR',
        'atmosphere': 'OPERATIONAL',
        'pricing': 'OTHER',
        'other': 'OTHER'
    }

    # Severity based on how many reviews mention the issue
    def _calculate_severity(self, review_count, avg_sentiment):
        """
        Calculate severity based on frequency and sentiment.

        Args:
            review_count: Number of reviews mentioning the issue
            avg_sentiment: Average sentiment score (-1.0 to 1.0)

        Returns:
            Severity level (LOW, MEDIUM, HIGH, CRITICAL)
        """
        # Very negative sentiment + multiple mentions = higher severity
        if avg_sentiment <= -0.6 and review_count >= 5:
            return 'CRITICAL'
        elif avg_sentiment <= -0.4 and review_count >= 3:
            return 'HIGH'
        elif avg_sentiment <= -0.2 or review_count >= 3:
            return 'MEDIUM'
        else:
            return 'LOW'

    def generate_checks_for_account(self, account_id: int, days_back: int = 7):
        """
        Analyze recent reviews and generate micro-checks for recurring issues.

        Args:
            account_id: Account ID to generate checks for
            days_back: Number of days to analyze (default: 7)

        Returns:
            dict with generated_count and details
        """
        try:
            config = GoogleReviewsConfig.objects.get(account_id=account_id, is_active=True)
        except GoogleReviewsConfig.DoesNotExist:
            logger.error(f"No active Google Reviews config for account {account_id}")
            return {'generated_count': 0, 'error': 'No active config'}

        # Check if auto-generation is enabled
        if not config.auto_generate_checks:
            logger.info(f"Auto-generation disabled for account {account_id}")
            return {'generated_count': 0, 'message': 'Auto-generation disabled'}

        # Get recent analyzed reviews
        cutoff_date = timezone.now() - timedelta(days=days_back)
        reviews = GoogleReview.objects.filter(
            account_id=account_id,
            review_created_at__gte=cutoff_date,
            analyzed_at__isnull=False
        ).select_related('analysis', 'location')

        if not reviews.exists():
            logger.info(f"No analyzed reviews found for account {account_id}")
            return {'generated_count': 0, 'message': 'No analyzed reviews'}

        # Analyze patterns
        patterns = self._analyze_patterns(reviews, config.min_reviews_for_check)

        # Generate micro-checks
        generated_count = 0
        generated_checks = []

        for pattern in patterns:
            try:
                check = self._create_micro_check(
                    account=config.account,
                    pattern=pattern
                )
                if check:
                    generated_count += 1
                    generated_checks.append(check)
                    logger.info(f"Generated micro-check: {check.title}")

            except Exception as e:
                logger.error(f"Failed to create micro-check for pattern {pattern}: {e}")
                continue

        logger.info(f"Generated {generated_count} micro-checks for account {account_id}")

        return {
            'generated_count': generated_count,
            'checks': [{'id': str(c.id), 'title': c.title} for c in generated_checks]
        }

    def _analyze_patterns(self, reviews, min_reviews):
        """
        Analyze reviews to find recurring patterns.

        Args:
            reviews: QuerySet of GoogleReview objects
            min_reviews: Minimum number of reviews to create a pattern

        Returns:
            List of pattern dictionaries
        """
        # Group by category and actionable issues
        category_issues = defaultdict(list)
        category_sentiments = defaultdict(list)

        for review in reviews:
            try:
                analysis = review.analysis
                category = analysis.suggested_category

                # Track issues and sentiment for each category
                for issue in analysis.actionable_issues:
                    category_issues[category].append(issue)
                category_sentiments[category].append(analysis.sentiment_score)

            except GoogleReviewAnalysis.DoesNotExist:
                continue

        # Find patterns
        patterns = []

        for category, issues in category_issues.items():
            # Count how many times each issue appears
            issue_counter = Counter(issues)

            # Find issues that appear frequently enough
            for issue, count in issue_counter.items():
                if count >= min_reviews:
                    avg_sentiment = sum(category_sentiments[category]) / len(category_sentiments[category])
                    severity = self._calculate_severity(count, avg_sentiment)

                    patterns.append({
                        'category': category,
                        'issue': issue,
                        'review_count': count,
                        'avg_sentiment': avg_sentiment,
                        'severity': severity
                    })

        return patterns

    def _create_micro_check(self, account, pattern):
        """
        Create a micro-check template from a review pattern.

        Args:
            account: Account object
            pattern: Pattern dictionary

        Returns:
            MicroCheckTemplate object or None
        """
        category = self.CATEGORY_MAPPING.get(pattern['category'], 'OTHER')

        # Create descriptive title
        title = f"Address: {pattern['issue'][:50]}"
        if len(pattern['issue']) > 50:
            title += "..."

        # Create description
        description = f"""This check was automatically generated based on customer feedback.

{pattern['review_count']} recent customer reviews mentioned: "{pattern['issue']}"

Addressing this issue will help improve customer satisfaction and prevent negative reviews."""

        # Create success criteria
        success_criteria = f"""Check that the following issue has been addressed:
- {pattern['issue']}

Verify that staff are aware of this feedback and have taken corrective action."""

        # Check if similar check already exists
        existing = MicroCheckTemplate.objects.filter(
            account=account,
            title__icontains=pattern['issue'][:30],
            source='google_reviews'
        ).first()

        if existing:
            logger.info(f"Similar check already exists: {existing.title}")
            return None

        # Create the micro-check template
        check = MicroCheckTemplate.objects.create(
            account=account,
            category=category,
            severity=pattern['severity'],
            title=title,
            description=description,
            success_criteria=success_criteria,
            source='google_reviews',
            is_active=True,
            rotation_priority=5,  # Medium priority
            metadata={
                'review_count': pattern['review_count'],
                'avg_sentiment': pattern['avg_sentiment'],
                'generated_at': timezone.now().isoformat(),
                'original_category': pattern['category']
            }
        )

        return check


def generate_micro_checks_from_reviews(account_id: int, days_back: int = 7):
    """
    Convenience function to generate micro-checks from reviews.

    Args:
        account_id: Account ID
        days_back: Days to analyze (default: 7)

    Returns:
        dict with results
    """
    generator = ReviewMicroCheckGenerator()
    return generator.generate_checks_for_account(account_id, days_back)
