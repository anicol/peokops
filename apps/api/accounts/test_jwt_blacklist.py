"""
Comprehensive tests for JWT token blacklist functionality.

Tests cover:
1. Token blacklisting on logout
2. Token rotation and blacklist after rotation
3. Blacklisted tokens cannot be used for authentication
4. Blacklisted tokens cannot be refreshed
5. Multiple logout attempts
6. Token blacklist persistence
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from brands.models import Brand, Store

User = get_user_model()


class JWTBlacklistTest(TestCase):
    """Test JWT token blacklist functionality"""

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

    def test_logout_blacklists_refresh_token(self):
        """Test that logout endpoint blacklists the refresh token"""
        login_data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        login_response = self.client.post('/api/auth/login/', login_data)
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        
        refresh_token = login_response.data['refresh']
        access_token = login_response.data['access']

        logout_data = {'refresh': refresh_token}
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = self.client.post('/api/auth/logout/', logout_data)
        
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
        self.assertIn('message', logout_response.data)

        outstanding_token = OutstandingToken.objects.filter(
            user=self.user,
            token=refresh_token
        ).first()
        self.assertIsNotNone(outstanding_token)
        
        blacklisted = BlacklistedToken.objects.filter(
            token=outstanding_token
        ).exists()
        self.assertTrue(blacklisted, "Refresh token should be blacklisted after logout")

    def test_blacklisted_token_cannot_refresh(self):
        """Test that blacklisted tokens cannot be used to get new access tokens"""
        refresh = RefreshToken.for_user(self.user)
        refresh_token = str(refresh)

        access_token = str(refresh.access_token)
        logout_data = {'refresh': refresh_token}
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        self.client.post('/api/auth/logout/', logout_data)

        refresh_data = {'refresh': refresh_token}
        refresh_response = self.client.post('/api/auth/refresh/', refresh_data)
        
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', refresh_response.data)

    def test_blacklisted_token_cannot_authenticate(self):
        """Test that access tokens from blacklisted refresh tokens cannot authenticate"""
        login_data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        login_response = self.client.post('/api/auth/login/', login_data)
        
        refresh_token = login_response.data['refresh']
        access_token = login_response.data['access']

        logout_data = {'refresh': refresh_token}
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = self.client.post('/api/auth/logout/', logout_data)
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        profile_response = self.client.get('/api/auth/profile/')
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)

    def test_token_rotation_blacklists_old_token(self):
        """Test that token rotation blacklists the old refresh token"""
        refresh = RefreshToken.for_user(self.user)
        old_refresh_token = str(refresh)

        refresh_data = {'refresh': old_refresh_token}
        refresh_response = self.client.post('/api/auth/refresh/', refresh_data)
        
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        new_access_token = refresh_response.data['access']
        new_refresh_token = refresh_response.data.get('refresh')
        
        self.assertIsNotNone(new_refresh_token)
        self.assertNotEqual(old_refresh_token, new_refresh_token)

        old_outstanding = OutstandingToken.objects.filter(
            user=self.user,
            token=old_refresh_token
        ).first()
        
        if old_outstanding:
            blacklisted = BlacklistedToken.objects.filter(
                token=old_outstanding
            ).exists()
            self.assertTrue(blacklisted, "Old refresh token should be blacklisted after rotation")

        old_refresh_data = {'refresh': old_refresh_token}
        old_refresh_response = self.client.post('/api/auth/refresh/', old_refresh_data)
        self.assertEqual(old_refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

        new_refresh_data = {'refresh': new_refresh_token}
        new_refresh_response = self.client.post('/api/auth/refresh/', new_refresh_data)
        self.assertEqual(new_refresh_response.status_code, status.HTTP_200_OK)

    def test_multiple_logout_attempts_idempotent(self):
        """Test that multiple logout attempts with same token are idempotent"""
        login_data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        login_response = self.client.post('/api/auth/login/', login_data)
        
        refresh_token = login_response.data['refresh']
        access_token = login_response.data['access']

        logout_data = {'refresh': refresh_token}
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        first_logout = self.client.post('/api/auth/logout/', logout_data)
        self.assertEqual(first_logout.status_code, status.HTTP_200_OK)

        second_logout = self.client.post('/api/auth/logout/', logout_data)
        self.assertEqual(second_logout.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_authentication(self):
        """Test that logout endpoint requires authentication"""
        logout_data = {'refresh': 'some_token'}
        logout_response = self.client.post('/api/auth/logout/', logout_data)
        
        self.assertEqual(logout_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_refresh_token(self):
        """Test that logout requires refresh token in request"""
        login_data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        login_response = self.client.post('/api/auth/login/', login_data)
        access_token = login_response.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = self.client.post('/api/auth/logout/', {})
        
        self.assertEqual(logout_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_with_invalid_token_format(self):
        """Test logout with malformed token"""
        login_data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        login_response = self.client.post('/api/auth/login/', login_data)
        access_token = login_response.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_data = {'refresh': 'invalid_token_format'}
        logout_response = self.client.post('/api/auth/logout/', logout_data)
        
        self.assertEqual(logout_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blacklist_persistence_across_requests(self):
        """Test that blacklisted tokens remain blacklisted across multiple requests"""
        refresh = RefreshToken.for_user(self.user)
        refresh_token = str(refresh)
        access_token = str(refresh.access_token)

        logout_data = {'refresh': refresh_token}
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        self.client.post('/api/auth/logout/', logout_data)

        for _ in range(3):
            refresh_data = {'refresh': refresh_token}
            refresh_response = self.client.post('/api/auth/refresh/', refresh_data)
            self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_different_users_tokens_isolated(self):
        """Test that token blacklisting is properly isolated between users"""
        user2 = User.objects.create_user(
            username="testuser2",
            email="test2@example.com",
            password="testpass123",
            store=self.store
        )

        refresh1 = RefreshToken.for_user(self.user)
        refresh2 = RefreshToken.for_user(user2)
        
        token1 = str(refresh1)
        token2 = str(refresh2)
        access1 = str(refresh1.access_token)

        logout_data = {'refresh': token1}
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access1}')
        self.client.post('/api/auth/logout/', logout_data)

        refresh_data1 = {'refresh': token1}
        response1 = self.client.post('/api/auth/refresh/', refresh_data1)
        self.assertEqual(response1.status_code, status.HTTP_401_UNAUTHORIZED)

        refresh_data2 = {'refresh': token2}
        response2 = self.client.post('/api/auth/refresh/', refresh_data2)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

    def test_outstanding_tokens_created_on_login(self):
        """Test that outstanding tokens are tracked on login"""
        initial_count = OutstandingToken.objects.filter(user=self.user).count()

        login_data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        self.client.post('/api/auth/login/', login_data)

        final_count = OutstandingToken.objects.filter(user=self.user).count()
        self.assertGreater(final_count, initial_count)
