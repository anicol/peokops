from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, Account
from brands.models import Brand, Store
from integrations.models import GoogleLocation, GoogleReview, GoogleReviewAnalysis
from insights.models import ReviewAnalysis
from insights.tasks import aggregate_store_review_analysis
from django.utils import timezone
from unittest.mock import patch, MagicMock


class InsightsAccessControlTests(TestCase):
    """Test access control for insights endpoints"""

    def setUp(self):
        self.client = APIClient()

        # Create brands
        self.brand1 = Brand.objects.create(name='Brand 1')
        self.brand2 = Brand.objects.create(name='Brand 2')

        # Create account owners
        self.owner1 = User.objects.create_user(
            username='owner1',
            email='owner1@test.com',
            password='password123',
            role='OWNER'
        )
        self.owner2 = User.objects.create_user(
            username='owner2',
            email='owner2@test.com',
            password='password123',
            role='OWNER'
        )

        # Create accounts
        self.account1 = Account.objects.create(
            name='Account 1',
            brand=self.brand1,
            owner=self.owner1
        )
        self.account2 = Account.objects.create(
            name='Account 2',
            brand=self.brand2,
            owner=self.owner2
        )

        # Link owners to accounts
        self.owner1.account = self.account1
        self.owner1.save()
        self.owner2.account = self.account2
        self.owner2.save()

        # Create stores
        self.store1 = Store.objects.create(
            brand=self.brand1,
            account=self.account1,
            name='Store 1',
            code='STORE-001',
            timezone='America/New_York',
            address='123 Main St',
            city='New York',
            state='NY',
            zip_code='10001'
        )
        self.store2 = Store.objects.create(
            brand=self.brand2,
            account=self.account2,
            name='Store 2',
            code='STORE-002',
            timezone='America/New_York',
            address='456 Oak Ave',
            city='New York',
            state='NY',
            zip_code='10002'
        )

        # Create TRIAL_ADMIN user (account-level)
        self.trial_admin = User.objects.create_user(
            username='trial_admin',
            email='trial_admin@test.com',
            password='password123',
            role='TRIAL_ADMIN'
        )
        self.trial_admin.account = self.account1
        self.trial_admin.save()

        # Create ADMIN user (brand-level)
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='password123',
            role='ADMIN'
        )
        self.admin.account = self.account1
        self.admin.save()

        # Create GM user (store-level)
        self.gm = User.objects.create_user(
            username='gm',
            email='gm@test.com',
            password='password123',
            role='GM',
            store=self.store1
        )

    def test_trial_admin_can_access_own_account_stores(self):
        """Test that TRIAL_ADMIN can access stores in their account"""
        self.client.force_authenticate(user=self.trial_admin)

        response = self.client.get(f'/api/insights/store/{self.store1.id}/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_trial_admin_cannot_access_other_account_stores(self):
        """Test that TRIAL_ADMIN cannot access stores in other accounts"""
        self.client.force_authenticate(user=self.trial_admin)

        response = self.client.get(f'/api/insights/store/{self.store2.id}/summary/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_access_own_account_stores(self):
        """Test that OWNER can access stores in their account"""
        self.client.force_authenticate(user=self.owner1)

        response = self.client.get(f'/api/insights/store/{self.store1.id}/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_owner_cannot_access_other_account_stores(self):
        """Test that OWNER cannot access stores in other accounts"""
        self.client.force_authenticate(user=self.owner1)

        response = self.client.get(f'/api/insights/store/{self.store2.id}/summary/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_all_stores(self):
        """Test that ADMIN can access all stores"""
        self.client.force_authenticate(user=self.admin)

        # Should be able to access store1
        response1 = self.client.get(f'/api/insights/store/{self.store1.id}/summary/')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Should be able to access store2
        response2 = self.client.get(f'/api/insights/store/{self.store2.id}/summary/')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

    def test_gm_can_access_stores_in_same_brand(self):
        """Test that GM can access stores in their brand"""
        self.client.force_authenticate(user=self.gm)

        response = self.client.get(f'/api/insights/store/{self.store1.id}/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_gm_cannot_access_stores_in_other_brands(self):
        """Test that GM cannot access stores in other brands"""
        self.client.force_authenticate(user=self.gm)

        response = self.client.get(f'/api/insights/store/{self.store2.id}/summary/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_access_insights(self):
        """Test that unauthenticated users cannot access insights"""
        response = self.client.get(f'/api/insights/store/{self.store1.id}/summary/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AggregateStoreReviewAnalysisTests(TestCase):
    """Test the aggregate_store_review_analysis task"""

    def setUp(self):
        # Create brand and account
        self.brand = Brand.objects.create(name='Test Brand')
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@test.com',
            password='password123',
            role='OWNER'
        )
        self.account = Account.objects.create(
            name='Test Account',
            brand=self.brand,
            owner=self.owner
        )
        self.owner.account = self.account
        self.owner.save()

        # Create store
        self.store = Store.objects.create(
            brand=self.brand,
            account=self.account,
            name='Test Store',
            code='TEST001',
            timezone='America/New_York',
            address='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345'
        )

        # Create Google location
        self.location = GoogleLocation.objects.create(
            account=self.account,
            store=self.store,
            google_location_id='test_location_123',
            google_location_name='Test Store Google',
            address='123 Test St',
            place_id='ChIJtest123',
            average_rating=4.2,
            total_review_count=5,
            is_active=True
        )

        # Create sample reviews with analysis
        self.reviews = []
        review_data = [
            {'rating': 1, 'text': 'Terrible service, staff was rude', 'sentiment': -0.8,
             'topics': ['service', 'staff_attitude'], 'categories': ['service'],
             'actionable_issues': ['staff was rude', 'terrible service']},
            {'rating': 2, 'text': 'Food was cold and order was wrong', 'sentiment': -0.6,
             'topics': ['temperature', 'accuracy'], 'categories': ['food_quality', 'service'],
             'actionable_issues': ['food was cold', 'order was wrong']},
            {'rating': 5, 'text': 'Amazing food and friendly staff!', 'sentiment': 0.9,
             'topics': ['food_quality', 'service'], 'categories': ['food_quality', 'service'],
             'actionable_issues': []},
            {'rating': 4, 'text': 'Good sandwich, clean location', 'sentiment': 0.7,
             'topics': ['food_quality', 'cleanliness'], 'categories': ['food_quality', 'cleanliness'],
             'actionable_issues': []},
            {'rating': 1, 'text': 'Order accuracy is terrible, missing items', 'sentiment': -0.9,
             'topics': ['accuracy'], 'categories': ['service'],
             'actionable_issues': ['missing items', 'order accuracy is terrible']},
        ]

        for i, data in enumerate(review_data):
            review = GoogleReview.objects.create(
                location=self.location,
                account=self.account,
                google_review_id=f'review_{i}',
                reviewer_name=f'Reviewer {i}',
                rating=data['rating'],
                review_text=data['text'],
                review_created_at=timezone.now() - timezone.timedelta(days=i),
                source='oauth',
                is_verified=True,
                needs_analysis=False,
                analyzed_at=timezone.now()
            )

            # Create analysis for each review
            GoogleReviewAnalysis.objects.create(
                review=review,
                topics=data['topics'],
                sentiment_score=data['sentiment'],
                actionable_issues=data['actionable_issues'],
                categories=data['categories'],
                suggested_category='service',
                model_used='bedrock',
                confidence=0.9
            )

            self.reviews.append(review)

        # Create ReviewAnalysis record
        self.analysis = ReviewAnalysis.objects.create(
            store=self.store,
            business_name=self.location.google_location_name,
            location=self.location.address,
            place_id=self.location.place_id,
            google_rating=self.location.average_rating,
            google_address=self.location.address,
            account=self.brand,
            status='PENDING'
        )

    @patch('marketing.management.commands.research_google_reviews.Command')
    def test_aggregate_analysis_with_mocked_ai(self, mock_analyzer_class):
        """Test that aggregate_store_review_analysis calls AI analyzer correctly"""
        # Mock the analyzer
        mock_analyzer = MagicMock()
        mock_analyzer_class.return_value = mock_analyzer

        # Mock AI responses
        mock_insights = {
            'key_issues': [
                {
                    'theme': 'Staff Attitude Problems',
                    'severity': 'HIGH',
                    'mentions': 2,
                    'summary': 'Multiple customers report rude staff',
                    'examples': [{'snippet': 'staff was rude', 'rating': 1}]
                }
            ],
            'operational_themes': {
                'service': {
                    'count': 4,
                    'sentiment': 'mixed',
                    'positive_count': 1,
                    'neutral_count': 0,
                    'negative_count': 3,
                    'examples': [{'snippet': 'friendly staff', 'rating': 5}]
                }
            },
            'rating_distribution': {'1': 2, '2': 1, '4': 1, '5': 1},
            'positive_reviews': [],
            'negative_reviews': []
        }

        mock_micro_checks = [
            {
                'title': 'Staff Courtesy Check',
                'question': 'Are all staff members greeting customers politely?',
                'success_criteria': 'Every customer greeted within 30 seconds',
                'category': 'SERVICE',
                'severity': 'HIGH',
                'mentions_in_reviews': 2
            }
        ]

        mock_analyzer.analyze_reviews.return_value = mock_insights
        mock_analyzer.generate_microcheck_suggestions.return_value = mock_micro_checks

        # Run the task
        aggregate_store_review_analysis(str(self.analysis.id))

        # Verify analyzer was called
        self.assertTrue(mock_analyzer.analyze_reviews.called)
        self.assertTrue(mock_analyzer.generate_microcheck_suggestions.called)

        # Check the analysis was updated
        self.analysis.refresh_from_db()
        self.assertEqual(self.analysis.status, 'COMPLETED')
        self.assertIsNotNone(self.analysis.insights)
        self.assertIsNotNone(self.analysis.micro_check_suggestions)
        self.assertEqual(self.analysis.reviews_analyzed, 5)

    def test_aggregate_analysis_fails_without_store(self):
        """Test that analysis fails if store is not linked"""
        # Create analysis without store
        orphan_analysis = ReviewAnalysis.objects.create(
            business_name='Orphan Business',
            status='PENDING'
        )

        # Run task
        aggregate_store_review_analysis(str(orphan_analysis.id))

        # Check it failed
        orphan_analysis.refresh_from_db()
        self.assertEqual(orphan_analysis.status, 'FAILED')
        self.assertIn('store', orphan_analysis.error_message.lower())

    def test_aggregate_analysis_fails_without_google_location(self):
        """Test that analysis fails if store has no Google location"""
        # Create store without Google location
        orphan_store = Store.objects.create(
            brand=self.brand,
            account=self.account,
            name='Orphan Store',
            code='ORPHAN001',
            timezone='America/New_York'
        )

        orphan_analysis = ReviewAnalysis.objects.create(
            store=orphan_store,
            business_name='Orphan Store',
            status='PENDING'
        )

        # Run task
        aggregate_store_review_analysis(str(orphan_analysis.id))

        # Check it failed
        orphan_analysis.refresh_from_db()
        self.assertEqual(orphan_analysis.status, 'FAILED')
        self.assertIn('google location', orphan_analysis.error_message.lower())

    def test_aggregate_analysis_fails_with_no_reviews(self):
        """Test that analysis fails if location has no reviews"""
        # Delete all reviews
        GoogleReview.objects.filter(location=self.location).delete()

        # Run task
        aggregate_store_review_analysis(str(self.analysis.id))

        # Check it failed
        self.analysis.refresh_from_db()
        self.assertEqual(self.analysis.status, 'FAILED')
        self.assertIn('no reviews', self.analysis.error_message.lower())

    @patch('marketing.management.commands.research_google_reviews.Command')
    def test_formats_reviews_correctly_for_ai(self, mock_analyzer_class):
        """Test that reviews are formatted correctly for AI analysis"""
        mock_analyzer = MagicMock()
        mock_analyzer_class.return_value = mock_analyzer

        # Simple mock responses
        mock_analyzer.analyze_reviews.return_value = {
            'key_issues': [],
            'operational_themes': {},
            'rating_distribution': {}
        }
        mock_analyzer.generate_microcheck_suggestions.return_value = []

        # Run task
        aggregate_store_review_analysis(str(self.analysis.id))

        # Get the formatted reviews that were passed to analyzer
        call_args = mock_analyzer.analyze_reviews.call_args
        formatted_reviews = call_args[0][0]

        # Verify format
        self.assertEqual(len(formatted_reviews), 5)

        # Check first review has required fields
        first_review = formatted_reviews[0]
        self.assertIn('author', first_review)
        self.assertIn('rating', first_review)
        self.assertIn('text', first_review)
        self.assertIn('timestamp', first_review)
        self.assertIn('time', first_review)

        # Verify data
        self.assertEqual(first_review['rating'], self.reviews[0].rating)
        self.assertEqual(first_review['text'], self.reviews[0].review_text)
        self.assertEqual(first_review['author'], self.reviews[0].reviewer_name)

    @patch('marketing.management.commands.research_google_reviews.Command')
    def test_date_range_extraction(self, mock_analyzer_class):
        """Test that oldest and newest review dates are extracted correctly"""
        mock_analyzer = MagicMock()
        mock_analyzer_class.return_value = mock_analyzer

        mock_analyzer.analyze_reviews.return_value = {
            'key_issues': [],
            'operational_themes': {},
            'rating_distribution': {}
        }
        mock_analyzer.generate_microcheck_suggestions.return_value = []

        # Run task
        aggregate_store_review_analysis(str(self.analysis.id))

        # Check date range
        self.analysis.refresh_from_db()
        self.assertIsNotNone(self.analysis.oldest_review_date)
        self.assertIsNotNone(self.analysis.newest_review_date)

        # Oldest should be earliest (days=4)
        # Newest should be most recent (days=0)
        self.assertTrue(self.analysis.oldest_review_date < self.analysis.newest_review_date)
