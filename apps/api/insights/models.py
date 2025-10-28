from django.db import models
from django.utils import timezone
import uuid


class ReviewAnalysis(models.Model):
    """Store Google Reviews analysis for prospects and customers"""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    # Unique identifier for public access
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Business information
    business_name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)

    # Contact information (optional, collected if they want email)
    contact_email = models.EmailField(blank=True)
    contact_name = models.CharField(max_length=100, blank=True)

    # Link to account when they convert
    account = models.ForeignKey(
        'brands.Brand',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='review_analyses',
        help_text='Linked when prospect converts to customer'
    )

    # Processing status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    progress_message = models.CharField(max_length=200, blank=True)
    progress_percentage = models.IntegerField(default=0)

    # Analysis results (stored as JSON)
    scraped_data = models.JSONField(null=True, blank=True, help_text='Raw scraped reviews')
    insights = models.JSONField(null=True, blank=True, help_text='Analyzed insights')
    micro_check_suggestions = models.JSONField(null=True, blank=True, help_text='Generated micro-check recommendations')

    # Business info from Google
    google_rating = models.FloatField(null=True, blank=True)
    google_address = models.CharField(max_length=500, blank=True)
    total_reviews_found = models.IntegerField(null=True, blank=True)
    reviews_analyzed = models.IntegerField(null=True, blank=True)

    # Error tracking
    error_message = models.TextField(blank=True)

    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    viewed_at = models.DateTimeField(null=True, blank=True)

    # Marketing tracking
    source = models.CharField(max_length=50, default='website', help_text='Where they came from')
    converted_to_trial = models.BooleanField(default=False)
    converted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Review Analysis'
        verbose_name_plural = 'Review Analyses'
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['contact_email']),
        ]

    def __str__(self):
        return f"{self.business_name} - {self.status}"

    def get_public_url(self):
        """Public URL for viewing results"""
        from django.conf import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f"{base_url}/review-analysis/{self.id}"

    def mark_viewed(self):
        """Mark as viewed by the prospect"""
        if not self.viewed_at:
            self.viewed_at = timezone.now()
            self.save(update_fields=['viewed_at'])

    def mark_converted(self, brand):
        """
        Mark as converted to trial and link to brand.

        Args:
            brand: Brand instance (note: stored in self.account field for historical reasons)
        """
        if not self.converted_to_trial:
            self.converted_to_trial = True
            self.converted_at = timezone.now()
            self.account = brand
            self.save(update_fields=['converted_to_trial', 'converted_at', 'account'])

            # Automatically migrate scraped reviews to integrations
            self.migrate_reviews_to_integrations()

    def migrate_reviews_to_integrations(self):
        """
        Migrate scraped reviews from JSON to GoogleReview table (unified storage).
        Called automatically when prospect converts to customer.
        """
        from integrations.models import GoogleLocation, GoogleReview, GoogleReviewAnalysis as IntegrationAnalysis
        from ai_services.bedrock_service import BedrockRecommendationService
        import logging

        logger = logging.getLogger(__name__)

        if not self.account or not self.scraped_data:
            return

        # Note: self.account is actually a Brand instance (confusing naming)
        # We need to get an Account from the Brand
        brand = self.account
        account = brand.accounts.first()

        if not account:
            logger.error(f"No Account found for Brand {brand.id} during review migration")
            return

        logger.info(f"Migrating scraped reviews for {self.business_name} to account {account.id}")

        # Create or get location for this business
        business_info = self.scraped_data.get('business_info', {})
        location, created = GoogleLocation.objects.get_or_create(
            account=account,
            google_location_name=self.business_name,
            defaults={
                'google_location_id': f'scraped_{self.id}',  # Temporary ID until OAuth connects
                'address': business_info.get('address', self.location),
                'average_rating': business_info.get('rating'),
                'total_review_count': business_info.get('total_reviews', 0),
                'is_active': True
            }
        )

        # Migrate each scraped review to GoogleReview table
        reviews_migrated = 0
        bedrock_service = BedrockRecommendationService()

        for review_data in self.scraped_data.get('reviews', []):
            try:
                # Create Google review with source='scraped'
                review, created = GoogleReview.objects.get_or_create(
                    google_review_id=f"scraped_{self.id}_{review_data.get('author', '')}_{review_data.get('timestamp', '')}",
                    defaults={
                        'location': location,
                        'account': account,
                        'reviewer_name': review_data.get('author', 'Anonymous'),
                        'rating': review_data.get('rating', 0),
                        'review_text': review_data.get('text', ''),
                        'review_reply': '',
                        'review_created_at': timezone.now() - timezone.timedelta(days=30),  # Approximate
                        'source': 'scraped',
                        'is_verified': False,
                        'needs_analysis': True
                    }
                )

                if created:
                    reviews_migrated += 1

                    # Run AI analysis if we have review text
                    if review.review_text:
                        try:
                            analysis_result = bedrock_service.analyze_review(
                                review_text=review.review_text,
                                rating=review.rating
                            )

                            IntegrationAnalysis.objects.create(
                                review=review,
                                topics=analysis_result['topics'],
                                sentiment_score=analysis_result['sentiment_score'],
                                actionable_issues=analysis_result['actionable_issues'],
                                suggested_category=analysis_result['suggested_category'],
                                confidence=analysis_result.get('confidence', 0.5),
                                model_used='bedrock' if bedrock_service.enabled else 'fallback'
                            )

                            review.needs_analysis = False
                            review.analyzed_at = timezone.now()
                            review.save()
                        except Exception as e:
                            logger.error(f"Failed to analyze migrated review: {e}")

            except Exception as e:
                logger.error(f"Failed to migrate review: {e}")
                continue

        logger.info(f"Migrated {reviews_migrated} scraped reviews to GoogleReview table")
        return reviews_migrated

    @property
    def is_processing(self):
        return self.status in [self.Status.PENDING, self.Status.PROCESSING]

    @property
    def key_issues(self):
        """Extract top 3 issues from insights"""
        if not self.insights or not self.insights.get('operational_themes'):
            return []

        themes = self.insights['operational_themes']
        sorted_themes = sorted(
            [(name, data) for name, data in themes.items() if data.get('count', 0) > 0],
            key=lambda x: x[1]['count'],
            reverse=True
        )

        return [
            {
                'theme': name.replace('_', ' ').title(),
                'mentions': data['count'],
                'examples': data.get('examples', [])[:1]
            }
            for name, data in sorted_themes[:3]
        ]

    @property
    def sentiment_summary(self):
        """Get sentiment breakdown"""
        if not self.insights:
            return None

        rating_dist = self.insights.get('rating_distribution', {})
        total = sum(rating_dist.values())

        if total == 0:
            return None

        positive = sum(rating_dist.get(str(i), 0) for i in [4, 5])
        negative = sum(rating_dist.get(str(i), 0) for i in [1, 2])
        neutral = rating_dist.get('3', 0)

        return {
            'positive_percentage': round(positive / total * 100, 1),
            'negative_percentage': round(negative / total * 100, 1),
            'neutral_percentage': round(neutral / total * 100, 1),
            'positive_count': positive,
            'negative_count': negative,
            'neutral_count': neutral,
            'total': total
        }
