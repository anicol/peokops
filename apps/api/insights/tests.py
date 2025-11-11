from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, Account
from brands.models import Brand, Store


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
