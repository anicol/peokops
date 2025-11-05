"""
Tests for category-based review aggregation feature

Tests the multi-level aggregation system:
1. Store-level aggregation
2. Multi-store (account) aggregation
3. Brand-level aggregation with regional breakdown
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from accounts.models import Account, User
from brands.models import Brand, Store
from integrations.models import (
    GoogleLocation,
    GoogleReview,
    GoogleReviewAnalysis,
    TopicTrend
)
from integrations.insights_service import ReviewInsightsService
from rest_framework.test import APIClient
from rest_framework import status


class CategoryAggregationTestCase(TestCase):
    """Base test case with common setup for category aggregation tests"""

    def setUp(self):
        """Set up test data for category aggregation"""
        # Create users
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="testpass123",
            role=User.Role.ADMIN
        )

        self.owner_user = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
            role=User.Role.OWNER
        )

        # Create brand
        self.brand = Brand.objects.create(
            name="Test Pizza Chain",
            industry="RESTAURANT",
            subtype="QSR"
        )

        # Create two accounts (franchisees)
        self.account1 = Account.objects.create(
            name="Franchisee A",
            brand=self.brand,
            owner=self.owner_user,
            company_name="Company A",
            billing_email="billing@franchisee-a.com",
            phone="+15551111111"
        )

        self.account2 = Account.objects.create(
            name="Franchisee B",
            brand=self.brand,
            owner=self.owner_user,
            company_name="Company B",
            billing_email="billing@franchisee-b.com",
            phone="+15552222222"
        )

        # Create stores
        self.store1 = Store.objects.create(
            account=self.account1,
            brand=self.brand,
            name="Downtown Store",
            code="STORE001",
            address="123 Main St",
            city="New York",
            state="NY",
            zip_code="10001",
            region="Northeast"
        )

        self.store2 = Store.objects.create(
            account=self.account1,
            brand=self.brand,
            name="Uptown Store",
            code="STORE002",
            address="456 North Ave",
            city="New York",
            state="NY",
            zip_code="10002",
            region="Northeast"
        )

        self.store3 = Store.objects.create(
            account=self.account2,
            brand=self.brand,
            name="Westside Store",
            code="STORE003",
            address="789 West Blvd",
            city="Los Angeles",
            state="CA",
            zip_code="90001",
            region="West"
        )

        # Create Google locations
        self.location1 = GoogleLocation.objects.create(
            account=self.account1,
            store=self.store1,
            google_location_id="loc_1",
            google_location_name="Downtown Store",
            address="123 Main St"
        )

        self.location2 = GoogleLocation.objects.create(
            account=self.account1,
            store=self.store2,
            google_location_id="loc_2",
            google_location_name="Uptown Store",
            address="456 North Ave"
        )

        self.location3 = GoogleLocation.objects.create(
            account=self.account2,
            store=self.store3,
            google_location_id="loc_3",
            google_location_name="Westside Store",
            address="789 West Blvd"
        )

        # Create sample reviews with analysis
        self._create_sample_reviews()

        # Initialize service
        self.insights_service = ReviewInsightsService()

        # Setup API client
        self.client = APIClient()

    def _create_sample_reviews(self):
        """Create sample reviews with multi-category analysis"""
        now = timezone.now()

        # Location 1 (Downtown) - Food Quality issues
        review1 = GoogleReview.objects.create(
            location=self.location1,
            account=self.account1,
            google_review_id="review_1",
            reviewer_name="John Doe",
            rating=2,
            review_text="The pizza was cold and the service was slow",
            review_created_at=now - timedelta(days=5)
        )
        GoogleReviewAnalysis.objects.create(
            review=review1,
            categories=['Food Quality', 'Service'],
            topics=['Cold food', 'Slow service'],
            sentiment_score=-0.7,
            actionable_issues=['Cold food', 'Slow service'],
            suggested_category='Food Quality',
            model_used='test_model'
        )

        review2 = GoogleReview.objects.create(
            location=self.location1,
            account=self.account1,
            google_review_id="review_2",
            reviewer_name="Jane Smith",
            rating=2,
            review_text="Pizza arrived cold again. This is the third time.",
            review_created_at=now - timedelta(days=3)
        )
        GoogleReviewAnalysis.objects.create(
            review=review2,
            categories=['Food Quality'],
            topics=['Cold food'],
            sentiment_score=-0.8,
            actionable_issues=['Cold food'],
            suggested_category='Food Quality',
            model_used='test_model'
        )

        # Location 2 (Uptown) - Service issues
        review3 = GoogleReview.objects.create(
            location=self.location2,
            account=self.account1,
            google_review_id="review_3",
            reviewer_name="Bob Johnson",
            rating=2,
            review_text="Waited 30 minutes for our order. Staff was rude.",
            review_created_at=now - timedelta(days=7)
        )
        GoogleReviewAnalysis.objects.create(
            review=review3,
            categories=['Service'],
            topics=['Slow service', 'Rude staff'],
            sentiment_score=-0.6,
            actionable_issues=['Slow service', 'Rude staff'],
            suggested_category='Service',
            model_used='test_model'
        )

        # Location 3 (Westside) - Cleanliness issues
        review4 = GoogleReview.objects.create(
            location=self.location3,
            account=self.account2,
            google_review_id="review_4",
            reviewer_name="Alice Williams",
            rating=2,
            review_text="The bathroom was dirty and tables weren't cleaned",
            review_created_at=now - timedelta(days=4)
        )
        GoogleReviewAnalysis.objects.create(
            review=review4,
            categories=['Cleanliness'],
            topics=['Dirty bathroom', 'Dirty tables'],
            sentiment_score=-0.7,
            actionable_issues=['Dirty bathroom', 'Dirty tables'],
            suggested_category='Cleanliness',
            model_used='test_model'
        )

        # Create topic trends
        TopicTrend.objects.create(
            account=self.account1,
            location=self.location1,
            topic='Cold food',
            category='Food Quality',
            overall_sentiment='NEGATIVE',
            trend_direction='INCREASING',
            current_mentions=2,
            previous_mentions=0,
            percent_change=100.0,
            trend_velocity=2
        )

        TopicTrend.objects.create(
            account=self.account1,
            location=self.location2,
            topic='Slow service',
            category='Service',
            overall_sentiment='NEGATIVE',
            trend_direction='INCREASING',
            current_mentions=1,
            previous_mentions=0,
            percent_change=100.0,
            trend_velocity=1
        )

        TopicTrend.objects.create(
            account=self.account2,
            location=self.location3,
            topic='Dirty bathroom',
            category='Cleanliness',
            overall_sentiment='NEGATIVE',
            trend_direction='STABLE',
            current_mentions=1,
            previous_mentions=1,
            percent_change=0.0,
            trend_velocity=0
        )


class StoreLevelAggregationTests(CategoryAggregationTestCase):
    """Test store-level aggregation"""

    def test_get_top_issues_for_single_store(self):
        """Test getting top issues for a single store"""
        result = self.insights_service.get_top_issues_by_category(
            account_id=str(self.account1.id),
            location_id=str(self.location1.id),
            limit=3,
            days=30
        )

        # Verify response structure
        self.assertIn('categories', result)
        self.assertIn('scope', result)
        self.assertEqual(result['scope']['level'], 'store')
        self.assertEqual(result['scope']['location_id'], str(self.location1.id))

        # Verify Food Quality category has issues
        self.assertIn('Food Quality', result['categories'])
        food_quality = result['categories']['Food Quality']
        self.assertIn('top_issues', food_quality)
        self.assertTrue(len(food_quality['top_issues']) > 0)

        # Verify issue details
        cold_food_issue = food_quality['top_issues'][0]
        self.assertEqual(cold_food_issue['topic'], 'Cold food')
        self.assertEqual(cold_food_issue['total_mentions'], 2)
        self.assertEqual(cold_food_issue['trend_direction'], 'INCREASING')
        self.assertTrue(len(cold_food_issue['examples']) > 0)

    def test_get_top_issues_for_account_level(self):
        """Test getting top issues aggregated across all account locations"""
        result = self.insights_service.get_top_issues_by_category(
            account_id=str(self.account1.id),
            location_id=None,  # No location = account-level
            limit=3,
            days=30
        )

        # Verify scope
        self.assertEqual(result['scope']['level'], 'account')
        self.assertIsNone(result['scope'].get('location_id'))

        # Should have both Food Quality and Service categories
        self.assertIn('Food Quality', result['categories'])
        self.assertIn('Service', result['categories'])

    def test_category_filtering(self):
        """Test filtering by specific categories"""
        result = self.insights_service.get_top_issues_by_category(
            account_id=str(self.account1.id),
            categories=['Food Quality'],
            limit=3,
            days=30
        )

        # Should only have Food Quality
        self.assertIn('Food Quality', result['categories'])
        self.assertNotIn('Cleanliness', result['categories'])

    def test_time_window_filtering(self):
        """Test filtering by time window"""
        # Create an old review (60 days ago)
        old_review = GoogleReview.objects.create(
            location=self.location1,
            account=self.account1,
            google_review_id="old_review",
            reviewer_name="Old Reviewer",
            rating=1,
            review_text="Very old complaint about stale pizza",
            review_created_at=timezone.now() - timedelta(days=60)
        )
        GoogleReviewAnalysis.objects.create(
            review=old_review,
            categories=['Food Quality'],
            topics=['Stale food'],
            sentiment_score=-0.9,
            actionable_issues=['Stale food'],
            suggested_category='Food Quality',
            model_used='test_model'
        )

        # Query with 30-day window
        result = self.insights_service.get_top_issues_by_category(
            account_id=str(self.account1.id),
            days=30,
            limit=10
        )

        # Old review should not appear in examples
        food_issues = result['categories']['Food Quality']['top_issues']
        for issue in food_issues:
            if issue['topic'] == 'Stale food':
                self.fail("Old review should not appear in 30-day window")


class MultiStoreAggregationTests(CategoryAggregationTestCase):
    """Test multi-store aggregation"""

    def test_multi_store_aggregation(self):
        """Test aggregating issues across multiple stores"""
        result = self.insights_service.get_multi_store_issues_by_category(
            account_id=str(self.account1.id),
            limit=3,
            days=30
        )

        # Verify response structure
        self.assertIn('categories', result)
        self.assertIn('stores', result)
        self.assertIn('scope', result)
        self.assertEqual(result['scope']['level'], 'multi_store')

        # Should have aggregated categories
        self.assertIn('Food Quality', result['categories'])
        self.assertIn('Service', result['categories'])

        # Should have per-store breakdown
        self.assertTrue(len(result['stores']) > 0)
        store_names = [s['store_name'] for s in result['stores']]
        self.assertIn('Downtown Store', store_names)
        self.assertIn('Uptown Store', store_names)

    def test_multi_store_issue_aggregation(self):
        """Test that issues are properly aggregated across stores"""
        # Create same issue at both stores
        now = timezone.now()

        review_store2 = GoogleReview.objects.create(
            location=self.location2,
            account=self.account1,
            google_review_id="review_cold_2",
            reviewer_name="Review at Store 2",
            rating=2,
            review_text="Pizza was cold at this location too",
            review_created_at=now - timedelta(days=2)
        )
        GoogleReviewAnalysis.objects.create(
            review=review_store2,
            categories=['Food Quality'],
            topics=['Cold food'],
            sentiment_score=-0.7,
            actionable_issues=['Cold food'],
            suggested_category='Food Quality',
            model_used='test_model'
        )

        # Create trend for store 2
        TopicTrend.objects.create(
            account=self.account1,
            location=self.location2,
            topic='Cold food',
            category='Food Quality',
            overall_sentiment='NEGATIVE',
            trend_direction='INCREASING',
            current_mentions=1,
            previous_mentions=0,
            percent_change=100.0,
            trend_velocity=1
        )

        result = self.insights_service.get_multi_store_issues_by_category(
            account_id=str(self.account1.id),
            limit=3,
            days=30
        )

        # Cold food should show affected_locations = 2
        cold_food_issue = None
        for issue in result['categories']['Food Quality']['top_issues']:
            if issue['topic'] == 'Cold food':
                cold_food_issue = issue
                break

        self.assertIsNotNone(cold_food_issue)
        self.assertEqual(cold_food_issue['affected_locations'], 2)
        self.assertGreaterEqual(cold_food_issue['total_mentions'], 3)

    def test_store_ids_filtering(self):
        """Test filtering by specific store IDs"""
        result = self.insights_service.get_multi_store_issues_by_category(
            account_id=str(self.account1.id),
            store_ids=[str(self.store1.id)],
            limit=3,
            days=30
        )

        # Should only have stores we requested
        store_ids = [s['store_id'] for s in result['stores']]
        self.assertIn(str(self.store1.id), store_ids)
        self.assertNotIn(str(self.store2.id), store_ids)


class BrandLevelAggregationTests(CategoryAggregationTestCase):
    """Test brand-level aggregation"""

    def test_brand_level_aggregation(self):
        """Test aggregating issues across entire brand"""
        result = self.insights_service.get_brand_issues_by_category(
            brand_id=str(self.brand.id),
            limit=3,
            days=30
        )

        # Verify response structure
        self.assertIn('categories', result)
        self.assertIn('regions', result)
        self.assertIn('accounts', result)
        self.assertIn('scope', result)
        self.assertEqual(result['scope']['level'], 'brand')

        # Should aggregate issues from all accounts
        all_categories = result['categories']
        self.assertIn('Food Quality', all_categories)
        self.assertIn('Service', all_categories)
        self.assertIn('Cleanliness', all_categories)

    def test_regional_breakdown(self):
        """Test regional breakdown in brand-level view"""
        result = self.insights_service.get_brand_issues_by_category(
            brand_id=str(self.brand.id),
            limit=3,
            days=30
        )

        # Should have regional breakdown
        regions = result['regions']
        self.assertTrue(len(regions) > 0)

        region_names = [r['region'] for r in regions]
        self.assertIn('Northeast', region_names)
        self.assertIn('West', region_names)

        # Each region should have categories
        for region in regions:
            self.assertIn('categories', region)

    def test_account_comparison(self):
        """Test account-level comparison in brand view"""
        result = self.insights_service.get_brand_issues_by_category(
            brand_id=str(self.brand.id),
            limit=3,
            days=30
        )

        # Should have account comparison
        accounts = result['accounts']
        self.assertTrue(len(accounts) > 0)

        account_ids = [a['account_id'] for a in accounts]
        self.assertIn(str(self.account1.id), account_ids)
        self.assertIn(str(self.account2.id), account_ids)

    def test_region_filtering(self):
        """Test filtering by specific region"""
        result = self.insights_service.get_brand_issues_by_category(
            brand_id=str(self.brand.id),
            region='Northeast',
            limit=3,
            days=30
        )

        # Should only have Northeast region data
        regions = result.get('regions', [])
        if regions:
            region_names = [r['region'] for r in regions]
            self.assertIn('Northeast', region_names)
            self.assertNotIn('West', region_names)


class CategoryAggregationAPITests(CategoryAggregationTestCase):
    """Test API endpoints for category aggregation"""

    def test_top_issues_by_category_endpoint(self):
        """Test GET /api/integrations/google-reviews/insights/top-issues-by-category"""
        self.client.force_authenticate(user=self.owner_user)
        self.owner_user.account = self.account1
        self.owner_user.save()

        response = self.client.get(
            '/api/integrations/google-reviews/insights/top-issues-by-category/',
            {
                'limit': 3,
                'days': 30
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('categories', data)
        self.assertIn('scope', data)
        self.assertEqual(data['scope']['level'], 'account')

    def test_multi_store_issues_endpoint(self):
        """Test GET /api/integrations/google-reviews/insights/multi-store-issues"""
        self.client.force_authenticate(user=self.owner_user)
        self.owner_user.account = self.account1
        self.owner_user.save()

        response = self.client.get(
            '/api/integrations/google-reviews/insights/multi-store-issues/',
            {
                'limit': 3,
                'days': 30
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('categories', data)
        self.assertIn('stores', data)
        self.assertIn('scope', data)
        self.assertEqual(data['scope']['level'], 'multi_store')

    def test_brand_issues_endpoint_requires_admin(self):
        """Test that brand-level endpoint requires ADMIN role"""
        # Try with OWNER role - should fail
        self.client.force_authenticate(user=self.owner_user)
        self.owner_user.account = self.account1
        self.owner_user.save()

        response = self.client.get(
            '/api/integrations/google-reviews/insights/brand-issues/',
            {
                'brand_id': str(self.brand.id),
                'limit': 3,
                'days': 30
            }
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_brand_issues_endpoint_with_admin(self):
        """Test brand-level endpoint with ADMIN role"""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            '/api/integrations/google-reviews/insights/brand-issues/',
            {
                'brand_id': str(self.brand.id),
                'limit': 3,
                'days': 30
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('categories', data)
        self.assertIn('regions', data)
        self.assertIn('accounts', data)
        self.assertIn('scope', data)
        self.assertEqual(data['scope']['level'], 'brand')

    def test_category_filtering_in_api(self):
        """Test category filtering via API"""
        self.client.force_authenticate(user=self.owner_user)
        self.owner_user.account = self.account1
        self.owner_user.save()

        response = self.client.get(
            '/api/integrations/google-reviews/insights/top-issues-by-category/',
            {
                'categories': 'Food Quality,Service',
                'limit': 3,
                'days': 30
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should only have requested categories
        categories = data['categories']
        self.assertIn('Food Quality', categories)
        self.assertNotIn('Cleanliness', categories)

    def test_limit_parameter(self):
        """Test limit parameter controls number of issues per category"""
        self.client.force_authenticate(user=self.owner_user)
        self.owner_user.account = self.account1
        self.owner_user.save()

        response = self.client.get(
            '/api/integrations/google-reviews/insights/top-issues-by-category/',
            {
                'limit': 1,
                'days': 30
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Each category should have at most 1 issue
        for category, category_data in data['categories'].items():
            self.assertLessEqual(len(category_data['top_issues']), 1)


class EdgeCaseTests(CategoryAggregationTestCase):
    """Test edge cases and error handling"""

    def test_no_reviews_returns_empty_categories(self):
        """Test that accounts with no reviews return empty categories"""
        # Create a new account with no reviews
        new_account = Account.objects.create(
            name="Empty Account",
            brand=self.brand,
            owner=self.owner_user,
            company_name="Empty Company",
            billing_email="empty@example.com",
            phone="+15559999999"
        )

        result = self.insights_service.get_top_issues_by_category(
            account_id=str(new_account.id),
            limit=3,
            days=30
        )

        # Should return valid structure but empty categories
        self.assertIn('categories', result)
        self.assertEqual(len(result['categories']), 0)

    def test_positive_reviews_excluded_from_issues(self):
        """Test that positive reviews are not included in issues"""
        # Create a positive review
        positive_review = GoogleReview.objects.create(
            location=self.location1,
            account=self.account1,
            google_review_id="positive_review",
            reviewer_name="Happy Customer",
            rating=5,
            review_text="Great pizza! Love this place!",
            review_created_at=timezone.now() - timedelta(days=1)
        )
        GoogleReviewAnalysis.objects.create(
            review=positive_review,
            categories=['Food Quality'],
            topics=['Great pizza'],
            sentiment_score=0.9,
            actionable_issues=[],
            suggested_category='Food Quality',
            model_used='test_model'
        )

        result = self.insights_service.get_top_issues_by_category(
            account_id=str(self.account1.id),
            limit=10,
            days=30
        )

        # Positive topic should not appear in issues
        food_issues = result['categories'].get('Food Quality', {}).get('top_issues', [])
        for issue in food_issues:
            self.assertNotEqual(issue['topic'], 'Great pizza')

    def test_invalid_brand_id_returns_error(self):
        """Test that invalid brand ID returns appropriate error"""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            '/api/integrations/google-reviews/insights/brand-issues/',
            {
                'brand_id': '00000000-0000-0000-0000-000000000000',
                'limit': 3,
                'days': 30
            }
        )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
