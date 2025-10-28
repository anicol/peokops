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

    def mark_converted(self, account):
        """Mark as converted to trial and link to account"""
        if not self.converted_to_trial:
            self.converted_to_trial = True
            self.converted_at = timezone.now()
            self.account = account
            self.save(update_fields=['converted_to_trial', 'converted_at', 'account'])

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
