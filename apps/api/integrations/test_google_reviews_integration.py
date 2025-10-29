"""
Integration test for Google Reviews feature

This test validates the entire Google Reviews integration flow:
1. Review analysis with AI
2. Pattern detection from multiple reviews
3. Micro-check generation from patterns
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from accounts.models import Account
from brands.models import Brand
from integrations.models import (
    GoogleReviewsConfig,
    GoogleLocation,
    GoogleReview,
    GoogleReviewAnalysis
)
from integrations.review_micro_check_generator import ReviewMicroCheckGenerator
from micro_checks.models import MicroCheckTemplate
from ai_services.bedrock_service import BedrockRecommendationService
from cryptography.fernet import Fernet
from django.conf import settings


class GoogleReviewsIntegrationTest(TestCase):
    """Test the complete Google Reviews integration"""

    def setUp(self):
        """Set up test data"""
        # Create user (owner)
        from accounts.models import User
        self.owner = User.objects.create_user(
            username="testowner",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="Owner",
            role=User.Role.OWNER
        )

        # Create brand and account
        self.brand = Brand.objects.create(
            name="Test Restaurant",
            industry="RESTAURANT",
            subtype="QSR"
        )

        self.account = Account.objects.create(
            name="Test Account",
            brand=self.brand,
            owner=self.owner,
            company_name="Test Company",
            billing_email="billing@example.com",
            phone="+15551234567"
        )

        # Create Google Reviews config
        # Generate a proper Fernet key for testing
        import base64
        test_key = base64.urlsafe_b64encode(b'0' * 32)  # Simple test key
        fernet = Fernet(test_key)
        encrypted_token = fernet.encrypt(b"test_access_token")
        encrypted_refresh = fernet.encrypt(b"test_refresh_token")

        self.config = GoogleReviewsConfig.objects.create(
            account=self.account,
            access_token_encrypted=encrypted_token,
            refresh_token_encrypted=encrypted_refresh,
            token_expires_at=timezone.now() + timedelta(hours=1),
            google_account_id="12345",
            is_active=True,
            auto_generate_checks=True,
            min_reviews_for_check=3
        )

        # Create location
        self.location = GoogleLocation.objects.create(
            account=self.account,
            google_location_id="location_123",
            google_location_name="Test Location",
            address="123 Test St"
        )

    def test_review_analysis(self):
        """Test that review analysis extracts topics and sentiment correctly"""
        # Create a review
        review = GoogleReview.objects.create(
            location=self.location,
            account=self.account,
            google_review_id="review_1",
            reviewer_name="John Doe",
            rating=2,
            review_text="The bathroom was dirty and staff were rude",
            review_created_at=timezone.now()
        )

        # Analyze the review
        bedrock_service = BedrockRecommendationService()
        result = bedrock_service.analyze_review(
            review_text=review.review_text,
            rating=review.rating
        )

        # Create analysis
        analysis = GoogleReviewAnalysis.objects.create(
            review=review,
            topics=result['topics'],
            sentiment_score=result['sentiment_score'],
            actionable_issues=result['actionable_issues'],
            suggested_category=result['suggested_category'],
            model_used='bedrock' if bedrock_service.enabled else 'fallback',
            confidence=result.get('confidence', 0.5)
        )

        # Assertions
        self.assertIsNotNone(analysis)
        self.assertTrue(len(analysis.topics) > 0)
        self.assertTrue(analysis.sentiment_score < 0)  # Negative review
        self.assertTrue(len(analysis.actionable_issues) > 0)
        self.assertIn(analysis.suggested_category, [
            'cleanliness', 'service', 'staff_attitude', 'other'
        ])

    def test_pattern_detection(self):
        """Test that recurring patterns are detected across multiple reviews"""
        # Create multiple reviews with same issue
        issue_text = "bathroom was not clean"

        for i in range(4):
            review = GoogleReview.objects.create(
                location=self.location,
                account=self.account,
                google_review_id=f"review_{i}",
                reviewer_name=f"Customer {i}",
                rating=2,
                review_text=f"The {issue_text}. Not impressed.",
                review_created_at=timezone.now() - timedelta(days=i),
                needs_analysis=False,
                analyzed_at=timezone.now()
            )

            GoogleReviewAnalysis.objects.create(
                review=review,
                topics=['cleanliness'],
                sentiment_score=-0.6,
                actionable_issues=[issue_text],
                suggested_category='cleanliness',
                model_used='test',
                confidence=0.9
            )

        # Test pattern detection
        generator = ReviewMicroCheckGenerator()
        reviews = GoogleReview.objects.filter(
            account=self.account,
            analyzed_at__isnull=False
        )

        patterns = generator._analyze_patterns(reviews, min_reviews=3)

        # Assertions
        self.assertTrue(len(patterns) > 0)
        pattern = patterns[0]
        self.assertEqual(pattern['category'], 'cleanliness')
        self.assertGreaterEqual(pattern['review_count'], 3)
        self.assertIn(issue_text, pattern['issue'])

    def test_micro_check_generation(self):
        """Test that micro-checks are generated from review patterns"""
        # Create reviews with recurring issue
        issue_text = "tables were sticky and not cleaned properly"

        for i in range(4):
            review = GoogleReview.objects.create(
                location=self.location,
                account=self.account,
                google_review_id=f"review_clean_{i}",
                reviewer_name=f"Customer {i}",
                rating=2,
                review_text=f"Disappointed - {issue_text}",
                review_created_at=timezone.now() - timedelta(days=i),
                needs_analysis=False,
                analyzed_at=timezone.now()
            )

            GoogleReviewAnalysis.objects.create(
                review=review,
                topics=['cleanliness'],
                sentiment_score=-0.7,
                actionable_issues=[issue_text],
                suggested_category='cleanliness',
                model_used='test',
                confidence=0.9
            )

        # Generate micro-checks
        generator = ReviewMicroCheckGenerator()
        result = generator.generate_checks_for_account(
            account_id=self.account.id,
            days_back=7
        )

        # Assertions
        self.assertGreater(result['generated_count'], 0)

        # Check that micro-check was created
        checks = MicroCheckTemplate.objects.filter(
            brand=self.brand,
            source='google_reviews',
            is_active=True
        )

        self.assertTrue(checks.exists())
        check = checks.first()
        self.assertIn('CLEANLINESS', check.category)
        self.assertIn(issue_text[:20], check.title)  # Partial match
        self.assertEqual(check.source, 'google_reviews')
        self.assertIn('review_count', check.metadata)
        self.assertEqual(check.metadata['review_count'], 4)

    def test_duplicate_prevention(self):
        """Test that duplicate micro-checks are not created"""
        # Create pattern and generate check
        issue_text = "floors were slippery"

        for i in range(3):
            review = GoogleReview.objects.create(
                location=self.location,
                account=self.account,
                google_review_id=f"review_floor_{i}",
                reviewer_name=f"Customer {i}",
                rating=2,
                review_text=issue_text,
                review_created_at=timezone.now() - timedelta(days=i),
                needs_analysis=False,
                analyzed_at=timezone.now()
            )

            GoogleReviewAnalysis.objects.create(
                review=review,
                topics=['cleanliness', 'safety'],
                sentiment_score=-0.5,
                actionable_issues=[issue_text],
                suggested_category='cleanliness',
                model_used='test',
                confidence=0.8
            )

        # Generate first time
        generator = ReviewMicroCheckGenerator()
        result1 = generator.generate_checks_for_account(
            account_id=self.account.id,
            days_back=7
        )

        # Generate second time (should not create duplicates)
        result2 = generator.generate_checks_for_account(
            account_id=self.account.id,
            days_back=7
        )

        # Assertions
        self.assertGreater(result1['generated_count'], 0)
        self.assertEqual(result2['generated_count'], 0)  # No new checks

        # Verify only one check exists
        checks = MicroCheckTemplate.objects.filter(
            brand=self.brand,
            source='google_reviews',
            title__icontains=issue_text[:20]
        )
        self.assertEqual(checks.count(), 1)

    def test_severity_calculation(self):
        """Test that severity is calculated correctly based on frequency and sentiment"""
        generator = ReviewMicroCheckGenerator()

        # Test CRITICAL severity
        severity1 = generator._calculate_severity(review_count=5, avg_sentiment=-0.7)
        self.assertEqual(severity1, 'CRITICAL')

        # Test HIGH severity
        severity2 = generator._calculate_severity(review_count=3, avg_sentiment=-0.5)
        self.assertEqual(severity2, 'HIGH')

        # Test MEDIUM severity
        severity3 = generator._calculate_severity(review_count=3, avg_sentiment=-0.1)
        self.assertEqual(severity3, 'MEDIUM')

        # Test LOW severity
        severity4 = generator._calculate_severity(review_count=1, avg_sentiment=-0.1)
        self.assertEqual(severity4, 'LOW')
