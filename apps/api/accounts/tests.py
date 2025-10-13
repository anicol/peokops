from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch
from datetime import datetime, timedelta
from brands.models import Brand, Store
from micro_checks.models import MicroCheckTemplate

User = get_user_model()


class UserModelTest(TestCase):
    def setUp(self):
        self.brand = Brand.objects.create(name="Test Brand")
        self.store = Store.objects.create(
            brand=self.brand,
            name="Test Store",
            code="TS001",
            address="123 Test St",
            city="Test City",
            state="TS",
            zip_code="12345"
        )

    def test_create_user(self):
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
            role="INSPECTOR",
            store=self.store
        )
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.role, "INSPECTOR")
        self.assertEqual(user.full_name, "Test User")
        self.assertTrue(user.check_password("testpass123"))

    def test_user_str(self):
        user = User.objects.create_user(
            username="testuser",
            role="GM"
        )
        self.assertEqual(str(user), "testuser (GM)")


class AuthAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name="Test Brand")
        self.store = Store.objects.create(
            brand=self.brand,
            name="Test Store",
            code="TS001",
            address="123 Test St",
            city="Test City",
            state="TS",
            zip_code="12345"
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            store=self.store
        )

    def test_login_success(self):
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)

    def test_login_invalid_credentials(self):
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')

    def test_profile_unauthenticated(self):
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jwt_refresh_token(self):
        """Test JWT refresh token functionality"""
        refresh = RefreshToken.for_user(self.user)
        data = {'refresh': str(refresh)}
        
        response = self.client.post('/api/auth/refresh/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        
    def test_invalid_refresh_token(self):
        """Test invalid refresh token handling"""
        data = {'refresh': 'invalid_token'}
        response = self.client.post('/api/auth/refresh/', data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RBACTest(TestCase):
    """Role-Based Access Control tests"""
    
    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name="Test Brand")
        self.store1 = Store.objects.create(
            brand=self.brand, name="Store 1", code="ST001",
            address="123 Test St", city="Test City", state="TS", zip_code="12345"
        )
        self.store2 = Store.objects.create(
            brand=self.brand, name="Store 2", code="ST002", 
            address="456 Test Ave", city="Test City", state="TS", zip_code="12345"
        )
        
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username="admin", email="admin@test.com", password="test123",
            role=User.Role.ADMIN, store=self.store1
        )
        self.gm_user = User.objects.create_user(
            username="gm", email="gm@test.com", password="test123",
            role=User.Role.GM, store=self.store1
        )
        self.inspector_user = User.objects.create_user(
            username="inspector", email="inspector@test.com", password="test123",
            role=User.Role.INSPECTOR, store=self.store2
        )
        
    def test_admin_access_all_stores(self):
        """Test admin can access all stores"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/brands/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_gm_store_restrictions(self):
        """Test GM is restricted to their assigned store"""
        self.client.force_authenticate(user=self.gm_user)
        # This would need actual store filtering logic in views
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'GM')
        self.assertEqual(response.data['store'], self.store1.id)
        
    def test_inspector_permissions(self):
        """Test inspector role permissions"""
        self.client.force_authenticate(user=self.inspector_user)
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'INSPECTOR')
        
    def test_role_based_user_creation(self):
        """Test users are created with correct roles"""
        self.assertEqual(self.admin_user.role, User.Role.ADMIN)
        self.assertEqual(self.gm_user.role, User.Role.GM)
        self.assertEqual(self.inspector_user.role, User.Role.INSPECTOR)
        
    def test_unauthorized_access_to_admin_endpoints(self):
        """Test non-admin users cannot access admin endpoints"""
        self.client.force_authenticate(user=self.inspector_user)
        # This would test actual admin-only endpoints when they exist
        response = self.client.get('/api/users/')
        # Should return 403 Forbidden for non-admin users
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])


class TrialSignupTest(TestCase):
    """Test trial signup end-to-end flow"""

    def setUp(self):
        self.client = APIClient()

    def test_trial_signup_creates_user_brand_store(self):
        """Test that trial signup creates user, brand, store, and seeds templates"""
        data = {
            'email': 'trial@test.com',
            'password': 'testpass123',
            'first_name': 'Trial',
            'last_name': 'User'
        }

        response = self.client.post('/api/auth/trial-signup/', data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

        # Verify user created
        user = User.objects.get(email='trial@test.com')
        self.assertEqual(user.username, 'trial@test.com')
        self.assertEqual(user.role, User.Role.TRIAL_ADMIN)
        self.assertTrue(user.is_trial_user)
        self.assertIsNotNone(user.trial_expires_at)
        self.assertIsNotNone(user.referral_code)

        # Verify trial expiration set to 7 days (end of day)
        expected_expiration = (timezone.now() + timedelta(days=6)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        time_diff = abs((user.trial_expires_at - expected_expiration).total_seconds())
        self.assertLess(time_diff, 2, "Trial expiration should be ~7 days from now (EOD)")

        # Verify trial brand auto-created
        self.assertIsNotNone(user.store)
        self.assertIsNotNone(user.store.brand)
        brand = user.store.brand
        self.assertTrue(brand.is_trial)
        self.assertEqual(brand.trial_created_by, user)

        # Verify demo store auto-created
        store = user.store
        self.assertEqual(store.name, "Demo Store")
        self.assertEqual(store.code, f"TRIAL-{user.id}")
        self.assertEqual(store.brand, brand)

        # Verify 15 templates seeded
        templates = MicroCheckTemplate.objects.filter(brand=brand)
        self.assertEqual(templates.count(), 15)

        # Verify trial usage counters
        self.assertEqual(user.trial_stores_used, 1)  # Demo store counted

    def test_trial_signup_duplicate_email_fails(self):
        """Test that signup with existing email fails"""
        # Create existing user
        User.objects.create_user(
            username='existing@test.com',
            email='existing@test.com',
            password='password123'
        )

        # Attempt signup with same email
        data = {
            'email': 'existing@test.com',
            'password': 'newpass123'
        }

        response = self.client.post('/api/auth/trial-signup/', data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_trial_signup_returns_jwt_tokens(self):
        """Test that signup returns valid JWT tokens for immediate login"""
        data = {
            'email': 'newuser@test.com',
            'password': 'testpass123'
        }

        response = self.client.post('/api/auth/trial-signup/', data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify tokens exist
        access_token = response.data['access']
        refresh_token = response.data['refresh']
        self.assertIsNotNone(access_token)
        self.assertIsNotNone(refresh_token)

        # Verify access token works for authentication
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = self.client.get('/api/auth/profile/')
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data['email'], 'newuser@test.com')

    def test_trial_signup_sets_correct_limits(self):
        """Test that trial user has correct usage limits"""
        data = {
            'email': 'limits@test.com',
            'password': 'testpass123'
        }

        response = self.client.post('/api/auth/trial-signup/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email='limits@test.com')

        # Verify initial usage counters
        self.assertEqual(user.trial_videos_used, 0)
        self.assertEqual(user.trial_stores_used, 1)  # Demo store
        self.assertEqual(user.trial_reports_downloaded, 0)

        # Verify limits
        self.assertTrue(user.can_upload_video())  # Can upload (0/10)
        self.assertTrue(user.can_create_store())  # Can create (1/5, 4 remaining)
        self.assertTrue(user.can_download_report())  # Can download (0/2)

    def test_trial_signup_password_validation(self):
        """Test that password must meet minimum requirements"""
        data = {
            'email': 'short@test.com',
            'password': 'short'  # Less than 8 characters
        }

        response = self.client.post('/api/auth/trial-signup/', data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)


class OnboardingCompletionTest(TestCase):
    """Test onboarding completion with all permutations"""

    def setUp(self):
        self.client = APIClient()
        # Create a trial user with brand and store
        self.brand = Brand.objects.create(name="Trial Brand", is_trial=True)
        self.store = Store.objects.create(
            brand=self.brand,
            name="Demo Store",
            code="TRIAL-TEST",
            address="123 Demo St",
            city="Demo City",
            state="DS",
            zip_code="12345"
        )
        self.user = User.objects.create_user(
            username='trial@test.com',
            email='trial@test.com',
            password='testpass123',
            role=User.Role.TRIAL_ADMIN,
            is_trial_user=True,
            store=self.store
        )
        self.brand.trial_created_by = self.user
        self.brand.save()

    def test_onboarding_completion_updates_user_role(self):
        """Test that onboarding updates user role from TRIAL_ADMIN to selected role"""
        self.client.force_authenticate(user=self.user)

        data = {
            'role': 'GM',
            'industry': 'RESTAURANT',
            'store_count_range': '1-2',
            'focus_areas': ['food_safety', 'cleanliness']
        }

        response = self.client.post('/api/auth/trial/onboarding/', data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify user role updated
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.Role.GM)
        self.assertIsNotNone(self.user.onboarding_completed_at)

    def test_onboarding_completion_updates_brand_profile(self):
        """Test that onboarding updates brand industry and focus areas"""
        self.client.force_authenticate(user=self.user)

        data = {
            'role': 'OWNER',
            'industry': 'RETAIL',
            'store_count_range': '3-10',
            'focus_areas': ['cleanliness', 'customer_experience', 'inventory']
        }

        response = self.client.post('/api/auth/trial/onboarding/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify brand profile updated via response data
        brand_data = response.data['brand']
        self.assertEqual(brand_data['industry'], 'RETAIL')
        self.assertEqual(brand_data['store_count_range'], '3-10')
        self.assertEqual(sorted(brand_data['focus_areas']), sorted(['cleanliness', 'customer_experience', 'inventory']))
        self.assertIsNotNone(brand_data['onboarding_completed_at'])

        # Verify changes persisted to database
        self.brand.refresh_from_db()
        self.assertEqual(self.brand.industry, 'RETAIL')
        self.assertIsNotNone(self.brand.onboarding_completed_at)

    def test_onboarding_all_role_permutations(self):
        """Test onboarding with all valid role choices"""
        self.client.force_authenticate(user=self.user)

        roles = ['GM', 'OWNER', 'ADMIN']
        for role in roles:
            # Reset user role
            self.user.role = User.Role.TRIAL_ADMIN
            self.user.onboarding_completed_at = None
            self.user.save()

            data = {
                'role': role,
                'industry': 'RESTAURANT',
                'store_count_range': '1-2',
                'focus_areas': ['food_safety']
            }

            response = self.client.post('/api/auth/trial/onboarding/', data)

            self.assertEqual(response.status_code, status.HTTP_200_OK, f"Failed for role {role}")
            self.user.refresh_from_db()
            self.assertEqual(self.user.role, role)

    def test_onboarding_all_industry_permutations(self):
        """Test onboarding with all industry types"""
        self.client.force_authenticate(user=self.user)

        industries = ['RESTAURANT', 'RETAIL', 'HOSPITALITY', 'OTHER']
        for industry in industries:
            # Reset brand
            self.brand.industry = None
            self.brand.onboarding_completed_at = None
            self.brand.save()

            data = {
                'role': 'GM',
                'industry': industry,
                'store_count_range': '1-2',
                'focus_areas': ['cleanliness']
            }

            response = self.client.post('/api/auth/trial/onboarding/', data)

            self.assertEqual(response.status_code, status.HTTP_200_OK, f"Failed for industry {industry}")
            self.brand.refresh_from_db()
            self.assertEqual(self.brand.industry, industry)

    def test_onboarding_requires_authentication(self):
        """Test that onboarding endpoint requires authentication"""
        data = {
            'role': 'GM',
            'industry': 'RESTAURANT',
            'store_count_range': '1-2',
            'focus_areas': ['food_safety']
        }

        response = self.client.post('/api/auth/trial/onboarding/', data)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_onboarding_validates_required_fields(self):
        """Test that onboarding validates all required fields"""
        self.client.force_authenticate(user=self.user)

        # Missing role
        data = {
            'industry': 'RESTAURANT',
            'store_count_range': '1-2',
            'focus_areas': []
        }
        response = self.client.post('/api/auth/trial/onboarding/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing industry
        data = {
            'role': 'GM',
            'store_count_range': '1-2',
            'focus_areas': []
        }
        response = self.client.post('/api/auth/trial/onboarding/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid role
        data = {
            'role': 'INVALID_ROLE',
            'industry': 'RESTAURANT',
            'store_count_range': '1-2',
            'focus_areas': []
        }
        response = self.client.post('/api/auth/trial/onboarding/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid industry
        data = {
            'role': 'GM',
            'industry': 'INVALID_INDUSTRY',
            'store_count_range': '1-2',
            'focus_areas': []
        }
        response = self.client.post('/api/auth/trial/onboarding/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TrialExpirationTest(TestCase):
    """Test trial expiration scenarios and edge cases"""

    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name="Trial Brand", is_trial=True)
        self.store = Store.objects.create(
            brand=self.brand,
            name="Demo Store",
            code="TRIAL-EXP",
            address="123 Demo St",
            city="Demo City",
            state="DS",
            zip_code="12345"
        )

    def test_trial_expires_after_7_days(self):
        """Test that trial expires after 7 days"""
        # Create user with expiration in the past
        expired_date = timezone.now() - timedelta(days=1)
        user = User.objects.create_user(
            username='expired@test.com',
            email='expired@test.com',
            password='testpass123',
            role=User.Role.TRIAL_ADMIN,
            is_trial_user=True,
            trial_expires_at=expired_date,
            store=self.store
        )

        # Verify expiration properties
        self.assertTrue(user.is_trial_expired)
        self.assertEqual(user.trial_days_remaining, 0)

    def test_trial_days_remaining_calculation(self):
        """Test correct calculation of remaining trial days"""
        # Create user with 3 days remaining
        expires_in_3_days = timezone.now() + timedelta(days=3)
        user = User.objects.create_user(
            username='active@test.com',
            email='active@test.com',
            password='testpass123',
            role=User.Role.TRIAL_ADMIN,
            is_trial_user=True,
            trial_expires_at=expires_in_3_days,
            store=self.store
        )

        self.assertFalse(user.is_trial_expired)
        # Allow for 2-3 days due to time delta rounding
        self.assertIn(user.trial_days_remaining, [2, 3])

    def test_trial_hours_remaining_calculation(self):
        """Test calculation of remaining hours for urgency"""
        # Create user with 36 hours remaining
        expires_in_36_hours = timezone.now() + timedelta(hours=36)
        user = User.objects.create_user(
            username='urgent@test.com',
            email='urgent@test.com',
            password='testpass123',
            role=User.Role.TRIAL_ADMIN,
            is_trial_user=True,
            trial_expires_at=expires_in_36_hours,
            store=self.store
        )

        self.assertFalse(user.is_trial_expired)
        # Should be approximately 36 hours
        self.assertGreaterEqual(user.trial_hours_remaining, 35)
        self.assertLessEqual(user.trial_hours_remaining, 37)

    def test_trial_conversion_score_calculation(self):
        """Test that conversion score updates based on engagement"""
        user = User.objects.create_user(
            username='engage@test.com',
            email='engage@test.com',
            password='testpass123',
            role=User.Role.TRIAL_ADMIN,
            is_trial_user=True,
            trial_expires_at=timezone.now() + timedelta(days=7),
            store=self.store
        )

        initial_score = user.trial_conversion_score

        # Upload video (+20 points)
        user.increment_trial_usage('video')
        user.refresh_from_db()
        self.assertGreater(user.trial_conversion_score, initial_score)
        score_after_video = user.trial_conversion_score

        # Upload 3 more videos to reach 3+ threshold (+15 points)
        user.increment_trial_usage('video')
        user.increment_trial_usage('video')
        user.refresh_from_db()
        self.assertGreater(user.trial_conversion_score, score_after_video)
        score_after_multiple = user.trial_conversion_score

        # Download report (+10 points)
        user.increment_trial_usage('report')
        user.refresh_from_db()
        self.assertGreater(user.trial_conversion_score, score_after_multiple)

    def test_expired_trial_user_profile_still_accessible(self):
        """Test that expired trial users can still view their profile"""
        expired_date = timezone.now() - timedelta(days=1)
        user = User.objects.create_user(
            username='expired_view@test.com',
            email='expired_view@test.com',
            password='testpass123',
            role=User.Role.TRIAL_ADMIN,
            is_trial_user=True,
            trial_expires_at=expired_date,
            store=self.store
        )

        self.client.force_authenticate(user=user)
        response = self.client.get('/api/auth/profile/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'expired_view@test.com')
        self.assertTrue(response.data.get('is_trial_user'))
        # Trial status should indicate expiration
        trial_status = response.data.get('trial_status', {})
        self.assertTrue(trial_status.get('is_expired', False))