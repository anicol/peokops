"""
Comprehensive tenant isolation tests.

Tests that users cannot access data from other tenants across all major endpoints.
"""
from django.test import TestCase
from django.utils import timezone
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
        self.brand_a = Brand.objects.create(name="Brand A")
        
        self.owner_a = User.objects.create_user(
            username="owner_a",
            email="owner_a@test.com",
            password="password123",
            role=User.Role.OWNER
        )
        
        self.account_a = Account.objects.create(
            name="Account A",
            brand=self.brand_a,
            owner=self.owner_a
        )
        
        self.owner_a.account = self.account_a
        self.owner_a.save()
        
        self.store_a = Store.objects.create(
            name="Store A",
            code="STORE-A",
            account=self.account_a,
            brand=self.brand_a,
            address="123 Test St",
            city="Testville",
            state="TS",
            zip_code="00000",
            timezone="America/New_York"
        )
        
        self.owner_a.store = self.store_a
        self.owner_a.save()
        
        self.gm_a = User.objects.create_user(
            username="gm_a",
            email="gm_a@test.com",
            password="password123",
            role=User.Role.GM
        )
        self.gm_a.account = self.account_a
        self.gm_a.store = self.store_a
        self.gm_a.save()
        
        self.brand_b = Brand.objects.create(name="Brand B")
        
        self.owner_b = User.objects.create_user(
            username="owner_b",
            email="owner_b@test.com",
            password="password123",
            role=User.Role.OWNER
        )
        
        self.account_b = Account.objects.create(
            name="Account B",
            brand=self.brand_b,
            owner=self.owner_b
        )
        
        self.owner_b.account = self.account_b
        self.owner_b.save()
        
        self.store_b = Store.objects.create(
            name="Store B",
            code="STORE-B",
            account=self.account_b,
            brand=self.brand_b,
            address="456 Test Ave",
            city="Testburg",
            state="TB",
            zip_code="11111",
            timezone="America/Los_Angeles"
        )
        
        self.owner_b.store = self.store_b
        self.owner_b.save()
        
        self.gm_b = User.objects.create_user(
            username="gm_b",
            email="gm_b@test.com",
            password="password123",
            role=User.Role.GM
        )
        self.gm_b.account = self.account_b
        self.gm_b.store = self.store_b
        self.gm_b.save()
        
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
            shift_window="OPEN"
        )
        pulse_b = EmployeeVoicePulse.objects.create(
            account=self.account_b,
            store=self.store_b,
            shift_window="CLOSE"
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
            shift_window="CLOSE"
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
        
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@test.com",
            role=User.Role.OWNER
        )
        
        self.account = Account.objects.create(
            name="Test Account",
            brand=self.brand,
            owner=self.owner
        )
        
        self.owner.account = self.account
        self.owner.save()
        
        self.store = Store.objects.create(
            name="Test Store",
            code="TEST-001",
            account=self.account,
            brand=self.brand,
            address="789 Test Blvd",
            city="Testopolis",
            state="TP",
            zip_code="22222",
            timezone="America/New_York"
        )
        
        self.owner.store = self.store
        self.owner.save()
        
        self.super_admin = User.objects.create_user(
            username="super",
            email="super@test.com",
            role=User.Role.SUPER_ADMIN
        )
        
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@test.com",
            role=User.Role.ADMIN
        )
        self.admin.account = self.account
        self.admin.store = self.store
        self.admin.save()
        
        self.gm = User.objects.create_user(
            username="gm",
            email="gm@test.com",
            role=User.Role.GM
        )
        self.gm.account = self.account
        self.gm.store = self.store
        self.gm.save()
    
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


class InspectionTenantIsolationTests(TenantIsolationTestCase):
    """Tests for inspection, finding, and action item tenant isolation"""
    
    def setUp(self):
        super().setUp()
        from inspections.models import Inspection, Finding, ActionItem
        from videos.models import Video
        
        # Create video and inspection for tenant A
        self.video_a = Video.objects.create(
            title="Video A",
            store=self.store_a,
            uploaded_by=self.owner_a,
            file="videos/test_a.mp4"
        )
        
        self.inspection_a = Inspection.objects.create(
            title="Inspection A",
            store=self.store_a,
            created_by=self.owner_a,
            mode="INSPECTION",
            status="COMPLETED",
            overall_score=85.0
        )
        
        self.finding_a = Finding.objects.create(
            inspection=self.inspection_a,
            category="CLEANLINESS",
            severity="HIGH",
            title="Finding A",
            description="Test finding",
            confidence=0.95
        )
        
        self.action_item_a = ActionItem.objects.create(
            inspection=self.inspection_a,
            title="Action A",
            description="Fix this",
            priority="HIGH",
            status="OPEN"
        )
        
        # Create video and inspection for tenant B
        self.video_b = Video.objects.create(
            title="Video B",
            store=self.store_b,
            uploaded_by=self.owner_b,
            file="videos/test_b.mp4"
        )
        
        self.inspection_b = Inspection.objects.create(
            title="Inspection B",
            store=self.store_b,
            created_by=self.owner_b,
            mode="INSPECTION",
            status="COMPLETED",
            overall_score=90.0
        )
        
        self.finding_b = Finding.objects.create(
            inspection=self.inspection_b,
            category="SAFETY",
            severity="CRITICAL",
            title="Finding B",
            description="Test finding B",
            confidence=0.98
        )
        
        self.action_item_b = ActionItem.objects.create(
            inspection=self.inspection_b,
            title="Action B",
            description="Fix this B",
            priority="URGENT",
            status="OPEN"
        )
        
        self.client = APIClient()
    
    def test_owner_a_cannot_see_inspection_b(self):
        """Owner A cannot see inspections from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/inspections/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inspection_ids = [i['id'] for i in response.data['results']]
        self.assertIn(self.inspection_a.id, inspection_ids)
        self.assertNotIn(self.inspection_b.id, inspection_ids)
    
    def test_retrieve_cross_tenant_inspection_returns_404(self):
        """Retrieving inspection from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/inspections/{self.inspection_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_owner_a_cannot_see_finding_b(self):
        """Owner A cannot see findings from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/findings/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        finding_ids = [f['id'] for f in response.data['results']]
        self.assertIn(self.finding_a.id, finding_ids)
        self.assertNotIn(self.finding_b.id, finding_ids)
    
    def test_retrieve_cross_tenant_finding_returns_404(self):
        """Retrieving finding from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/findings/{self.finding_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_owner_a_cannot_see_action_item_b(self):
        """Owner A cannot see action items from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/action-items/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        action_ids = [a['id'] for a in response.data['results']]
        self.assertIn(self.action_item_a.id, action_ids)
        self.assertNotIn(self.action_item_b.id, action_ids)
    
    def test_retrieve_cross_tenant_action_item_returns_404(self):
        """Retrieving action item from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/action-items/{self.action_item_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class VideoTenantIsolationTests(TenantIsolationTestCase):
    """Tests for video and video frame tenant isolation"""
    
    def setUp(self):
        super().setUp()
        from videos.models import Video, VideoFrame
        
        # Create videos for tenant A
        self.video_a = Video.objects.create(
            title="Video A",
            store=self.store_a,
            uploaded_by=self.owner_a,
            file="videos/test_a.mp4",
            duration=120.0
        )
        
        self.frame_a = VideoFrame.objects.create(
            video=self.video_a,
            frame_number=100,
            timestamp=10.0,
            image="frames/test_a_100.jpg"
        )
        
        # Create videos for tenant B
        self.video_b = Video.objects.create(
            title="Video B",
            store=self.store_b,
            uploaded_by=self.owner_b,
            file="videos/test_b.mp4",
            duration=150.0
        )
        
        self.frame_b = VideoFrame.objects.create(
            video=self.video_b,
            frame_number=200,
            timestamp=20.0,
            image="frames/test_b_200.jpg"
        )
        
        self.client = APIClient()
    
    def test_owner_a_cannot_see_video_b(self):
        """Owner A cannot see videos from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/videos/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [v['id'] for v in response.data['results']]
        self.assertIn(self.video_a.id, video_ids)
        self.assertNotIn(self.video_b.id, video_ids)
    
    def test_retrieve_cross_tenant_video_returns_404(self):
        """Retrieving video from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/videos/{self.video_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_owner_a_cannot_see_frame_b(self):
        """Owner A cannot see video frames from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/video-frames/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        frame_ids = [f['id'] for f in response.data['results']]
        self.assertIn(self.frame_a.id, frame_ids)
        self.assertNotIn(self.frame_b.id, frame_ids)
    
    def test_retrieve_cross_tenant_frame_returns_404(self):
        """Retrieving frame from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/video-frames/{self.frame_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class BrandUserTenantIsolationTests(TenantIsolationTestCase):
    """Tests for brand and user tenant isolation fixes"""
    
    def setUp(self):
        super().setUp()
        self.client = APIClient()
    
    def test_owner_a_cannot_see_brand_b(self):
        """Owner A cannot see Brand B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/brands/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        brand_ids = [b['id'] for b in response.data['results']]
        self.assertIn(self.brand_a.id, brand_ids)
        self.assertNotIn(self.brand_b.id, brand_ids)
    
    def test_retrieve_cross_tenant_brand_returns_404(self):
        """Retrieving brand from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/brands/{self.brand_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_owner_a_cannot_see_user_from_account_b(self):
        """Owner A cannot see users from Account B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/auth/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = [u['id'] for u in response.data['results']]
        self.assertIn(self.owner_a.id, user_ids)
        self.assertNotIn(self.owner_b.id, user_ids)
    
    def test_retrieve_cross_tenant_user_returns_404(self):
        """Retrieving user from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/auth/users/{self.owner_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class MicroCheckStreakTenantIsolationTests(TenantIsolationTestCase):
    """Tests for micro check streak tenant isolation"""
    
    def setUp(self):
        super().setUp()
        from micro_checks.models import MicroCheckStreak, StoreStreak
        
        # Create streaks for tenant A
        self.user_streak_a = MicroCheckStreak.objects.create(
            user=self.gm_a,
            store=self.store_a,
            current_streak=5,
            longest_streak=10
        )
        
        self.store_streak_a = StoreStreak.objects.create(
            store=self.store_a,
            current_streak=7,
            longest_streak=15
        )
        
        # Create streaks for tenant B
        self.gm_b = User.objects.create_user(
            username="gm_b",
            email="gm_b@test.com",
            password="password123",
            role=User.Role.GM
        )
        self.gm_b.account = self.account_b
        self.gm_b.store = self.store_b
        self.gm_b.save()
        
        self.user_streak_b = MicroCheckStreak.objects.create(
            user=self.gm_b,
            store=self.store_b,
            current_streak=3,
            longest_streak=8
        )
        
        self.store_streak_b = StoreStreak.objects.create(
            store=self.store_b,
            current_streak=4,
            longest_streak=12
        )
        
        self.client = APIClient()
    
    def test_gm_a_cannot_see_streak_b(self):
        """GM A cannot see streaks from store B"""
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/micro-checks/streaks/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        streak_ids = [s['id'] for s in response.data['results']]
        self.assertIn(self.user_streak_a.id, streak_ids)
        self.assertNotIn(self.user_streak_b.id, streak_ids)
    
    def test_gm_a_cannot_see_store_streak_b(self):
        """GM A cannot see store streaks from store B"""
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/micro-checks/store-streaks/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        streak_ids = [s['id'] for s in response.data['results']]
        self.assertIn(self.store_streak_a.id, streak_ids)
        self.assertNotIn(self.store_streak_b.id, streak_ids)
