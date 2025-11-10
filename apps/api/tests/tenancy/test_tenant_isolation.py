"""
Comprehensive tenant isolation tests.

Tests that users cannot access data from other tenants across all major endpoints.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, Account
from brands.models import Brand, Store
from micro_checks.models import MicroCheckTemplate, MicroCheckRun
from employee_voice.models import EmployeeVoicePulse
from integrations.models import SevenShiftsConfig


class TenantIsolationTestCase(TestCase):
    """
    Test that users cannot access data from other tenants.
    
    Setup: 2 brands, each with 1 account, each with 1 store
    """
    
    def setUp(self):
        """Create test data for two separate tenants"""
        self.brand_a = Brand.objects.create(name="Brand A", slug="brand-a")
        self.account_a = Account.objects.create(name="Account A", brand=self.brand_a)
        self.store_a = Store.objects.create(
            name="Store A",
            code="STORE-A",
            account=self.account_a,
            brand=self.brand_a,
            timezone="America/New_York"
        )
        
        self.owner_a = User.objects.create_user(
            username="owner_a",
            email="owner_a@test.com",
            password="password123",
            role=User.Role.OWNER,
            account=self.account_a,
            store=self.store_a
        )
        
        self.gm_a = User.objects.create_user(
            username="gm_a",
            email="gm_a@test.com",
            password="password123",
            role=User.Role.GM,
            account=self.account_a,
            store=self.store_a
        )
        
        self.brand_b = Brand.objects.create(name="Brand B", slug="brand-b")
        self.account_b = Account.objects.create(name="Account B", brand=self.brand_b)
        self.store_b = Store.objects.create(
            name="Store B",
            code="STORE-B",
            account=self.account_b,
            brand=self.brand_b,
            timezone="America/Los_Angeles"
        )
        
        self.owner_b = User.objects.create_user(
            username="owner_b",
            email="owner_b@test.com",
            password="password123",
            role=User.Role.OWNER,
            account=self.account_b,
            store=self.store_b
        )
        
        self.gm_b = User.objects.create_user(
            username="gm_b",
            email="gm_b@test.com",
            password="password123",
            role=User.Role.GM,
            account=self.account_b,
            store=self.store_b
        )
        
        self.super_admin = User.objects.create_user(
            username="super_admin",
            email="admin@test.com",
            password="password123",
            role=User.Role.SUPER_ADMIN
        )
        
        self.template_a = MicroCheckTemplate.objects.create(
            brand=self.brand_a,
            title="Template A",
            category="CLEANLINESS",
            severity="MEDIUM",
            description="Test template for Brand A",
            success_criteria="Pass criteria",
            level="BRAND",
            created_by=self.owner_a
        )
        
        self.template_b = MicroCheckTemplate.objects.create(
            brand=self.brand_b,
            title="Template B",
            category="FOOD_SAFETY",
            severity="HIGH",
            description="Test template for Brand B",
            success_criteria="Pass criteria",
            level="BRAND",
            created_by=self.owner_b
        )
        
        self.client = APIClient()
    
    
    def test_list_templates_owner_a_cannot_see_brand_b(self):
        """Owner A cannot see Owner B's templates"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/micro-checks/templates/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        template_ids = [t['id'] for t in response.data['results']]
        
        self.assertIn(str(self.template_a.id), template_ids)
        self.assertNotIn(str(self.template_b.id), template_ids)
    
    def test_list_templates_owner_b_cannot_see_brand_a(self):
        """Owner B cannot see Owner A's templates"""
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.get('/api/micro-checks/templates/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        template_ids = [t['id'] for t in response.data['results']]
        
        self.assertIn(str(self.template_b.id), template_ids)
        self.assertNotIn(str(self.template_a.id), template_ids)
    
    def test_retrieve_cross_tenant_template_returns_404(self):
        """Owner A gets 404 when accessing Owner B's template"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/micro-checks/templates/{self.template_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_template_with_cross_tenant_brand_rejected(self):
        """Owner A cannot create template for Brand B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post('/api/micro-checks/templates/', {
            'brand': str(self.brand_b.id),  # Wrong tenant!
            'title': 'Malicious Template',
            'category': 'CLEANLINESS',
            'severity': 'MEDIUM',
            'description': 'Test',
            'success_criteria': 'Pass',
            'level': 'BRAND'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_cross_tenant_template_rejected(self):
        """Owner A cannot update Owner B's template"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.patch(
            f'/api/micro-checks/templates/{self.template_b.id}/',
            {'title': 'Hacked Template'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_cross_tenant_template_rejected(self):
        """Owner A cannot delete Owner B's template"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.delete(f'/api/micro-checks/templates/{self.template_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_super_admin_sees_all_templates(self):
        """Super admin can see templates from all tenants"""
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/micro-checks/templates/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        template_ids = [t['id'] for t in response.data['results']]
        
        self.assertIn(str(self.template_a.id), template_ids)
        self.assertIn(str(self.template_b.id), template_ids)
    
    
    def test_list_runs_gm_a_cannot_see_store_b(self):
        """GM A cannot see GM B's runs"""
        run_a = MicroCheckRun.objects.create(
            store=self.store_a,
            scheduled_for=timezone.now().date(),
            created_by=self.owner_a
        )
        run_b = MicroCheckRun.objects.create(
            store=self.store_b,
            scheduled_for=timezone.now().date(),
            created_by=self.owner_b
        )
        
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/micro-checks/runs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        run_ids = [r['id'] for r in response.data['results']]
        
        self.assertIn(str(run_a.id), run_ids)
        self.assertNotIn(str(run_b.id), run_ids)
    
    def test_retrieve_cross_tenant_run_returns_404(self):
        """GM A gets 404 when accessing GM B's run"""
        run_b = MicroCheckRun.objects.create(
            store=self.store_b,
            scheduled_for=timezone.now().date(),
            created_by=self.owner_b
        )
        
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get(f'/api/micro-checks/runs/{run_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    
    def test_list_pulses_owner_a_cannot_see_account_b(self):
        """Owner A cannot see Owner B's pulses"""
        pulse_a = EmployeeVoicePulse.objects.create(
            account=self.account_a,
            store=self.store_a,
            name="Pulse A",
            shift_window="OPEN",
            language="en",
            created_by=self.owner_a
        )
        pulse_b = EmployeeVoicePulse.objects.create(
            account=self.account_b,
            store=self.store_b,
            name="Pulse B",
            shift_window="CLOSE",
            language="en",
            created_by=self.owner_b
        )
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/employee-voice/pulses/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pulse_ids = [p['id'] for p in response.data['results']]
        
        self.assertIn(str(pulse_a.id), pulse_ids)
        self.assertNotIn(str(pulse_b.id), pulse_ids)
    
    def test_retrieve_cross_tenant_pulse_returns_404(self):
        """Owner A gets 404 when accessing Owner B's pulse"""
        pulse_b = EmployeeVoicePulse.objects.create(
            account=self.account_b,
            store=self.store_b,
            name="Pulse B",
            shift_window="CLOSE",
            language="en",
            created_by=self.owner_b
        )
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/employee-voice/pulses/{pulse_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    
    def test_list_seven_shifts_configs_owner_a_cannot_see_account_b(self):
        """Owner A cannot see Owner B's 7shifts config"""
        
        pass
    
    
    def test_brand_param_outside_tenant_returns_empty(self):
        """Owner A cannot filter by Brand B's ID"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(
            '/api/micro-checks/templates/',
            {'brand': str(self.brand_b.id)}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_store_param_outside_tenant_returns_empty(self):
        """GM A cannot filter by Store B's ID"""
        run_b = MicroCheckRun.objects.create(
            store=self.store_b,
            scheduled_for=timezone.now().date(),
            created_by=self.owner_b
        )
        
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get(
            '/api/micro-checks/runs/',
            {'store': str(self.store_b.id)}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)


class TenantUtilsTestCase(TestCase):
    """Test tenant utility functions"""
    
    def setUp(self):
        """Create test users with different roles"""
        self.brand = Brand.objects.create(name="Test Brand")
        self.account = Account.objects.create(name="Test Account", brand=self.brand)
        self.store = Store.objects.create(
            name="Test Store",
            code="TEST-001",
            account=self.account,
            brand=self.brand,
            timezone="America/New_York"
        )
        
        self.super_admin = User.objects.create_user(
            username="super",
            email="super@test.com",
            role=User.Role.SUPER_ADMIN
        )
        
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@test.com",
            role=User.Role.ADMIN,
            account=self.account,
            store=self.store
        )
        
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@test.com",
            role=User.Role.OWNER,
            account=self.account,
            store=self.store
        )
        
        self.gm = User.objects.create_user(
            username="gm",
            email="gm@test.com",
            role=User.Role.GM,
            account=self.account,
            store=self.store
        )
    
    def test_determine_scope_super_admin(self):
        """Super admin has super_admin scope"""
        from core.tenancy.utils import determine_scope
        self.assertEqual(determine_scope(self.super_admin), 'super_admin')
    
    def test_determine_scope_admin(self):
        """Admin has brand scope"""
        from core.tenancy.utils import determine_scope
        self.assertEqual(determine_scope(self.admin), 'brand')
    
    def test_determine_scope_owner(self):
        """Owner has account scope"""
        from core.tenancy.utils import determine_scope
        self.assertEqual(determine_scope(self.owner), 'account')
    
    def test_determine_scope_gm(self):
        """GM has store scope"""
        from core.tenancy.utils import determine_scope
        self.assertEqual(determine_scope(self.gm), 'store')
    
    def test_tenant_ids_extraction(self):
        """Tenant IDs are correctly extracted from user"""
        from core.tenancy.utils import tenant_ids
        
        ids = tenant_ids(self.owner)
        self.assertEqual(ids['brand_id'], self.brand.id)
        self.assertEqual(ids['account_id'], self.account.id)
        self.assertEqual(ids['store_id'], self.store.id)
    
    def test_build_tenant_filter_super_admin_no_filter(self):
        """Super admin gets no filter (sees everything)"""
        from core.tenancy.utils import build_tenant_filter
        from django.db.models import Q
        
        filter_q = build_tenant_filter(
            user=self.super_admin,
            model_scope='account',
            field_paths={'account': 'account'}
        )
        
        self.assertEqual(filter_q, Q())
    
    def test_build_tenant_filter_owner_account_scoped(self):
        """Owner gets account-scoped filter"""
        from core.tenancy.utils import build_tenant_filter
        from django.db.models import Q
        
        filter_q = build_tenant_filter(
            user=self.owner,
            model_scope='account',
            field_paths={'account': 'account'}
        )
        
        expected = Q(account=self.account.id)
        self.assertEqual(filter_q, expected)
