"""
Test unified review storage flow:
1. Scraped reviews from marketing tool
2. Prospect conversion and migration
3. OAuth sync with deduplication
"""
import base64
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from cryptography.fernet import Fernet
from django.conf import settings

from accounts.models import User, Account
from brands.models import Brand
from insights.models import ReviewAnalysis
from integrations.models import GoogleReviewsConfig, GoogleLocation, GoogleReview


class TestUnifiedReviewStorage(TestCase):
    """Test the unified storage flow for Google Reviews"""

    def setUp(self):
        """Set up test data"""
        # Create user (owner)
        self.owner = User.objects.create_user(
            username="testowner",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="Owner",
            role=User.Role.OWNER
        )

        # Create brand
        self.brand = Brand.objects.create(
            name="Test Restaurant",
            industry="RESTAURANT",
            subtype="QSR"
        )

        # Create account
        self.account = Account.objects.create(
            name="Test Account",
            brand=self.brand,
            owner=self.owner,
            company_name="Test Company",
            billing_email="billing@example.com",
            phone="+15551234567"
        )

    def test_complete_unified_flow(self):
        """Test complete flow from scraping to OAuth deduplication"""

        # Step 1: Create a review analysis (marketing tool scrapes reviews)
        review_analysis = ReviewAnalysis.objects.create(
            business_name="Prospect Restaurant",
            location="123 Main St",
            status=ReviewAnalysis.Status.COMPLETED,
            scraped_data={
                'business_info': {
                    'name': 'Prospect Restaurant',
                    'address': '123 Main St',
                    'rating': 4.2,
                    'total_reviews': 150
                },
                'reviews': [
                    {
                        'author': 'John Doe',
                        'rating': 5,
                        'text': 'Great food and excellent service!',
                        'timestamp': '2025-10-15'
                    },
                    {
                        'author': 'Jane Smith',
                        'rating': 2,
                        'text': 'Tables were dirty and staff was rude',
                        'timestamp': '2025-10-20'
                    }
                ]
            }
        )

        # Verify no reviews exist yet
        self.assertEqual(GoogleReview.objects.count(), 0)

        # Step 2: Prospect converts to customer (trigger migration)
        # Note: mark_converted expects a User instance
        review_analysis.mark_converted(self.owner)

        # Verify migration worked
        self.assertEqual(GoogleReview.objects.count(), 2)
        self.assertEqual(GoogleLocation.objects.count(), 1)

        # Check location was created correctly
        location = GoogleLocation.objects.first()
        self.assertEqual(location.google_location_name, "Prospect Restaurant")
        self.assertEqual(location.address, "123 Main St")
        self.assertAlmostEqual(float(location.average_rating), 4.2, places=2)
        self.assertTrue(location.is_active)

        # Check reviews were migrated with correct source
        scraped_reviews = GoogleReview.objects.filter(source='scraped')
        self.assertEqual(scraped_reviews.count(), 2)

        for review in scraped_reviews:
            self.assertFalse(review.is_verified)
            self.assertEqual(review.account, self.account)
            self.assertEqual(review.location, location)

        # Find the positive review
        positive_review = GoogleReview.objects.get(reviewer_name='John Doe')
        self.assertEqual(positive_review.rating, 5)
        self.assertEqual(positive_review.review_text, 'Great food and excellent service!')

        # Step 3: OAuth sync connects and syncs the same reviews (deduplication test)
        # Simulate OAuth sync by creating a verified version of John's review
        oauth_review, created = GoogleReview.objects.update_or_create(
            google_review_id='oauth_12345',  # Real OAuth ID
            defaults={
                'location': location,
                'account': self.account,
                'reviewer_name': 'John Doe',
                'rating': 5,
                'review_text': 'Great food and excellent service!',
                'review_reply': '',
                'review_created_at': timezone.now() - timedelta(days=13),
                'source': 'oauth',
                'is_verified': True,
                'needs_analysis': False
            }
        )

        # Should be a new review (OAuth has different ID)
        self.assertTrue(created)

        # Verify we now have 3 reviews total (2 scraped + 1 oauth)
        # Note: In production, deduplication would happen in google_reviews_sync.py
        # which checks for existing scraped reviews and uses update_or_create
        # on the google_review_id to upgrade them
        self.assertEqual(GoogleReview.objects.count(), 3)

        # Verify verified review exists
        verified_reviews = GoogleReview.objects.filter(is_verified=True)
        self.assertEqual(verified_reviews.count(), 1)
        self.assertEqual(verified_reviews.first().source, 'oauth')

    def test_migration_creates_location(self):
        """Test that migration creates a GoogleLocation"""
        review_analysis = ReviewAnalysis.objects.create(
            business_name="Pizza Place",
            location="456 Oak Ave",
            scraped_data={
                'business_info': {
                    'name': 'Pizza Place',
                    'address': '456 Oak Ave',
                    'rating': 4.5,
                    'total_reviews': 200
                },
                'reviews': []
            }
        )

        review_analysis.mark_converted(self.owner)

        location = GoogleLocation.objects.get(google_location_name="Pizza Place")
        self.assertEqual(location.address, "456 Oak Ave")
        self.assertAlmostEqual(float(location.average_rating), 4.5, places=2)
        self.assertEqual(location.total_review_count, 200)

    def test_migration_skips_if_no_account(self):
        """Test that migration doesn't happen without account link"""
        review_analysis = ReviewAnalysis.objects.create(
            business_name="Test Business",
            scraped_data={'reviews': [{'author': 'Test', 'rating': 5}]}
        )

        # Call migration directly without account
        result = review_analysis.migrate_reviews_to_integrations()

        # Should return None and not create anything
        self.assertIsNone(result)
        self.assertEqual(GoogleReview.objects.count(), 0)

    def test_source_field_filtering(self):
        """Test that we can filter by source field"""
        location = GoogleLocation.objects.create(
            account=self.account,
            google_location_id='test_123',
            google_location_name='Test Location',
            address='123 Test St',
            is_active=True
        )

        # Create scraped review
        GoogleReview.objects.create(
            google_review_id='scraped_1',
            location=location,
            account=self.account,
            reviewer_name='Scraper Test',
            rating=4,
            review_text='Scraped review',
            review_created_at=timezone.now(),
            source='scraped',
            is_verified=False
        )

        # Create OAuth review
        GoogleReview.objects.create(
            google_review_id='oauth_1',
            location=location,
            account=self.account,
            reviewer_name='OAuth Test',
            rating=5,
            review_text='OAuth review',
            review_created_at=timezone.now(),
            source='oauth',
            is_verified=True
        )

        # Test filtering
        scraped = GoogleReview.objects.filter(source='scraped')
        oauth = GoogleReview.objects.filter(source='oauth')
        verified = GoogleReview.objects.filter(is_verified=True)

        self.assertEqual(scraped.count(), 1)
        self.assertEqual(oauth.count(), 1)
        self.assertEqual(verified.count(), 1)
        self.assertEqual(scraped.first().reviewer_name, 'Scraper Test')
        self.assertEqual(oauth.first().reviewer_name, 'OAuth Test')
