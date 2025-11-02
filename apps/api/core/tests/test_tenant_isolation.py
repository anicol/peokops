"""
Tests for multi-tenant data isolation and Row-Level Security.

These tests verify that users cannot access data from other tenants,
ensuring proper tenant isolation at both application and database levels.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, Account
from brands.models import Brand, Store
from accounts.jwt_tokens import get_tokens_with_tenant_context


class TenantIsolationTest(TestCase):
    """Test tenant isolation for multi-tenant data access"""
    
    def setUp(self):
        """Create two separate tenants with users, brands, and stores"""
        self.brand1 = Brand.objects.create(
            name='Tenant 1 Brand',
            is_active=True
        )
        
        self.brand2 = Brand.objects.create(
            name='Tenant 2 Brand',
            is_active=True
        )
        
        self.account1_owner = User.objects.create_user(
            username='tenant1_owner',
            email='owner1@tenant1.com',
            password='testpass123',
            role=User.Role.OWNER
        )
        self.account1 = Account.objects.create(
            name='Tenant 1 Account',
            brand=self.brand1,
            owner=self.account1_owner
        )
        self.account1_owner.account = self.account1
        self.account1_owner.save()
        
        self.account2_owner = User.objects.create_user(
            username='tenant2_owner',
            email='owner2@tenant2.com',
            password='testpass123',
            role=User.Role.OWNER
        )
        self.account2 = Account.objects.create(
            name='Tenant 2 Account',
            brand=self.brand2,
            owner=self.account2_owner
        )
        self.account2_owner.account = self.account2
        self.account2_owner.save()
        
        self.store1 = Store.objects.create(
            account=self.account1,
            brand=self.brand1,
            name='Tenant 1 Store',
            code='T1-STORE-001',
            address='123 Tenant 1 St',
            city='City1',
            state='State1',
            zip_code='12345'
        )
        
        self.store2 = Store.objects.create(
            account=self.account2,
            brand=self.brand2,
            name='Tenant 2 Store',
            code='T2-STORE-001',
            address='456 Tenant 2 Ave',
            city='City2',
            state='State2',
            zip_code='67890'
        )
        
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@tenant1.com',
            password='testpass123',
            role=User.Role.GM,
            account=self.account1,
            store=self.store1
        )
        
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@tenant2.com',
            password='testpass123',
            role=User.Role.GM,
            account=self.account2,
            store=self.store2
        )
        
        self.super_admin = User.objects.create_user(
            username='superadmin',
            email='admin@peakops.com',
            password='testpass123',
            role=User.Role.SUPER_ADMIN
        )
        
        self.client = APIClient()
    
    def _extract_list(self, response_data):
        """Helper to extract list from response (handles pagination)"""
        if isinstance(response_data, list):
            return response_data
        return response_data.get('results', response_data)
    
    def test_user_cannot_see_other_tenant_brands(self):
        """Test that users cannot access brands from other tenants"""
        tokens = get_tokens_with_tenant_context(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        response = self.client.get('/api/brands/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        brands = self._extract_list(response.data)
        brand_ids = [b['id'] for b in brands]
        
        self.assertIn(self.brand1.id, brand_ids)
        self.assertNotIn(self.brand2.id, brand_ids)
    
    def test_user_cannot_see_other_tenant_stores(self):
        """Test that users cannot access stores from other tenants"""
        tokens = get_tokens_with_tenant_context(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        response = self.client.get('/api/brands/stores/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stores = self._extract_list(response.data)
        store_ids = [s['id'] for s in stores]
        
        self.assertIn(self.store1.id, store_ids)
        self.assertNotIn(self.store2.id, store_ids)
    
    def test_super_admin_can_see_all_brands(self):
        """Test that SUPER_ADMIN can see all brands across tenants"""
        tokens = get_tokens_with_tenant_context(self.super_admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        response = self.client.get('/api/brands/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        brands = self._extract_list(response.data)
        brand_ids = [b['id'] for b in brands]
        
        self.assertIn(self.brand1.id, brand_ids)
        self.assertIn(self.brand2.id, brand_ids)
    
    def test_super_admin_can_see_all_stores(self):
        """Test that SUPER_ADMIN can see all stores across tenants"""
        tokens = get_tokens_with_tenant_context(self.super_admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        response = self.client.get('/api/brands/stores/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stores = self._extract_list(response.data)
        store_ids = [s['id'] for s in stores]
        
        self.assertIn(self.store1.id, store_ids)
        self.assertIn(self.store2.id, store_ids)
    
    def test_jwt_token_contains_tenant_context(self):
        """Test that JWT tokens contain account_id and role claims"""
        tokens = get_tokens_with_tenant_context(self.user1)
        
        from rest_framework_simplejwt.tokens import AccessToken
        access_token = AccessToken(tokens['access'])
        
        self.assertEqual(access_token['account_id'], self.account1.id)
        self.assertEqual(access_token['brand_id'], self.brand1.id)
        self.assertEqual(access_token['role'], User.Role.GM)
    
    def test_jwt_token_for_user_without_account(self):
        """Test that JWT tokens handle users without accounts gracefully"""
        user_no_account = User.objects.create_user(
            username='no_account',
            email='no_account@test.com',
            password='testpass123',
            role=User.Role.EMPLOYEE
        )
        
        tokens = get_tokens_with_tenant_context(user_no_account)
        
        from rest_framework_simplejwt.tokens import AccessToken
        access_token = AccessToken(tokens['access'])
        
        self.assertIsNone(access_token['account_id'])
        self.assertIsNone(access_token['brand_id'])
        self.assertEqual(access_token['role'], User.Role.EMPLOYEE)
    
    def test_user_cannot_access_other_tenant_store_detail(self):
        """Test that users cannot access store detail from other tenants"""
        tokens = get_tokens_with_tenant_context(self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        response = self.client.get(f'/api/brands/stores/{self.store2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TenantContextMiddlewareTest(TestCase):
    """Test tenant context middleware functionality"""
    
    def setUp(self):
        """Create test user with account"""
        self.brand = Brand.objects.create(name='Test Brand', is_active=True)
        
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@test.com',
            password='testpass123',
            role=User.Role.OWNER
        )
        
        self.account = Account.objects.create(
            name='Test Account',
            brand=self.brand,
            owner=self.owner
        )
        
        self.owner.account = self.account
        self.owner.save()
        
        self.client = APIClient()
    
    def test_middleware_sets_tenant_context(self):
        """Test that middleware sets tenant context from JWT token"""
        tokens = get_tokens_with_tenant_context(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        response = self.client.get('/api/brands/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_middleware_handles_missing_token(self):
        """Test that middleware handles requests without JWT token"""
        response = self.client.get('/api/health/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_middleware_handles_invalid_token(self):
        """Test that middleware handles invalid JWT tokens gracefully"""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token_here')
        
        response = self.client.get('/api/brands/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class BrandViewSetTenantIsolationTest(TestCase):
    """Test BrandListCreateView tenant isolation fix"""
    
    def setUp(self):
        """Create two brands and users"""
        self.brand1 = Brand.objects.create(name='Brand 1', is_active=True)
        self.brand2 = Brand.objects.create(name='Brand 2', is_active=True)
        
        self.owner1 = User.objects.create_user(
            username='owner1',
            email='owner1@brand1.com',
            password='testpass123',
            role=User.Role.OWNER
        )
        
        self.account1 = Account.objects.create(
            name='Account 1',
            brand=self.brand1,
            owner=self.owner1
        )
        
        self.owner1.account = self.account1
        self.owner1.save()
        
        self.client = APIClient()
    
    def _extract_list(self, response_data):
        """Helper to extract list from response (handles pagination)"""
        if isinstance(response_data, list):
            return response_data
        return response_data.get('results', response_data)
    
    def test_brand_list_filters_by_account(self):
        """Test that BrandListCreateView filters brands by account"""
        tokens = get_tokens_with_tenant_context(self.owner1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        response = self.client.get('/api/brands/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        brands = self._extract_list(response.data)
        self.assertEqual(len(brands), 1)
        self.assertEqual(brands[0]['id'], self.brand1.id)
    
    def test_user_without_account_sees_no_brands(self):
        """Test that users without accounts see no brands"""
        user_no_account = User.objects.create_user(
            username='no_account',
            email='no_account@test.com',
            password='testpass123',
            role=User.Role.EMPLOYEE
        )
        
        tokens = get_tokens_with_tenant_context(user_no_account)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        response = self.client.get('/api/brands/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        brands = self._extract_list(response.data)
        self.assertEqual(len(brands), 0)
