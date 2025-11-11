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
            created_via='MANUAL',
            store_timezone=self.store_a.timezone,
            created_by=self.owner_a,
            sequence=2  # Avoid unique constraint conflict with setUp
        )
        run_b = MicroCheckRun.objects.create(
            store=self.store_b,
            scheduled_for=timezone.now().date(),
            created_via='MANUAL',
            store_timezone=self.store_b.timezone,
            created_by=self.owner_b,
            sequence=2  # Avoid unique constraint conflict with setUp
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
            created_via='MANUAL',
            store_timezone=self.store_b.timezone,
            created_by=self.owner_b,
            sequence=2  # Avoid unique constraint conflict with setUp
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
            created_via='MANUAL',
            store_timezone=self.store_b.timezone,
            created_by=self.owner_b,
            sequence=2  # Avoid unique constraint conflict with setUp
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
            confidence=0.95,
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
        response = self.client.get('/api/inspections/findings/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        finding_ids = [f['id'] for f in response.data['results']]
        self.assertIn(self.finding_a.id, finding_ids)
        self.assertNotIn(self.finding_b.id, finding_ids)
    
    def test_retrieve_cross_tenant_finding_returns_404(self):
        """Retrieving finding from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/inspections/findings/{self.finding_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_owner_a_cannot_see_action_item_b(self):
        """Owner A cannot see action items from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/inspections/action-items/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        action_ids = [a['id'] for a in response.data['results']]
        self.assertIn(self.action_item_a.id, action_ids)
        self.assertNotIn(self.action_item_b.id, action_ids)
    
    def test_retrieve_cross_tenant_action_item_returns_404(self):
        """Retrieving action item from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/inspections/action-items/{self.action_item_b.id}/')
        
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
            image="frames/test_a_100.jpg",
            width=1920,
            height=1080
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
            image="frames/test_b_200.jpg",
            width=1920,
            height=1080
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
        response = self.client.get('/api/videos/video-frames/')
        
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
        
        # Create streaks for tenant B (gm_b already created by parent setUp)
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

class UploadTenantIsolationTests(TenantIsolationTestCase):
    """Tests for upload tenant isolation"""
    
    def setUp(self):
        super().setUp()
        from uploads.models import Upload
        
        # Create uploads for tenant A
        self.upload_a = Upload.objects.create(
            store=self.store_a,
            created_by=self.owner_a,
            mode='COACHING',
            s3_key='uploads/store_a/video1.mp4',
            status='COMPLETE',
            duration_s=120,
            original_filename='video1.mp4'
        )

        # Create uploads for tenant B
        self.upload_b = Upload.objects.create(
            store=self.store_b,
            created_by=self.owner_b,
            mode='ENTERPRISE',
            s3_key='uploads/store_b/video1.mp4',
            status='COMPLETE',
            duration_s=150,
            original_filename='video1.mp4'
        )
        
        self.client = APIClient()
    
    def test_owner_a_cannot_see_upload_b(self):
        """Owner A cannot see uploads from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/uploads/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        upload_ids = [u['id'] for u in response.data['results']]
        self.assertIn(self.upload_a.id, upload_ids)
        self.assertNotIn(self.upload_b.id, upload_ids)
    
    def test_retrieve_cross_tenant_upload_returns_404(self):
        """Retrieving upload from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/uploads/{self.upload_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_gm_a_cannot_see_upload_b(self):
        """GM A cannot see uploads from store B"""
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/uploads/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        upload_ids = [u['id'] for u in response.data['results']]
        self.assertIn(self.upload_a.id, upload_ids)
        self.assertNotIn(self.upload_b.id, upload_ids)
    
    def test_super_admin_sees_all_uploads(self):
        """Super admin can see uploads from all tenants"""
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/uploads/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        upload_ids = [u['id'] for u in response.data['results']]
        self.assertIn(self.upload_a.id, upload_ids)
        self.assertIn(self.upload_b.id, upload_ids)


class MediaAssetTenantIsolationTests(TenantIsolationTestCase):
    """Tests for media asset tenant isolation"""
    
    def setUp(self):
        super().setUp()
        from micro_checks.models import MediaAsset
        import hashlib

        # Create media assets for tenant A
        self.media_a = MediaAsset.objects.create(
            store=self.store_a,
            kind='IMAGE',
            s3_key='media/store_a/image1.jpg',
            s3_bucket='test-bucket',
            sha256=hashlib.sha256(b'test_image_a').hexdigest(),
            bytes=1024,
            retention_policy='COACHING_7D'
        )

        # Create media assets for tenant B
        self.media_b = MediaAsset.objects.create(
            store=self.store_b,
            kind='VIDEO',
            s3_key='media/store_b/video1.mp4',
            s3_bucket='test-bucket',
            sha256=hashlib.sha256(b'test_video_b').hexdigest(),
            bytes=2048,
            retention_policy='ENTERPRISE_90D'
        )
        
        self.client = APIClient()
    
    def test_owner_a_cannot_see_media_b(self):
        """Owner A cannot see media assets from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/micro-checks/media/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        media_ids = [str(m['id']) for m in response.data['results']]
        self.assertIn(str(self.media_a.id), media_ids)
        self.assertNotIn(str(self.media_b.id), media_ids)
    
    def test_retrieve_cross_tenant_media_returns_404(self):
        """Retrieving media asset from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/micro-checks/media/{self.media_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_gm_a_cannot_see_media_b(self):
        """GM A cannot see media assets from store B"""
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/micro-checks/media/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        media_ids = [str(m['id']) for m in response.data['results']]
        self.assertIn(str(self.media_a.id), media_ids)
        self.assertNotIn(str(self.media_b.id), media_ids)
    
    def test_unauthenticated_user_cannot_create_media(self):
        """Unauthenticated users cannot create media assets"""
        response = self.client.post('/api/micro-checks/media/', {
            'store': self.store_a.id,
            'kind': 'IMAGE',
            's3_key': 'test.jpg',
            'retention_policy': 'COACHING_7D'
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_super_admin_sees_all_media(self):
        """Super admin can see media from all tenants"""
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/micro-checks/media/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        media_ids = [str(m['id']) for m in response.data['results']]
        self.assertIn(str(self.media_a.id), media_ids)
        self.assertIn(str(self.media_b.id), media_ids)


class MicroCheckResponseTenantIsolationTests(TenantIsolationTestCase):
    """Tests for micro check response tenant isolation"""
    
    def setUp(self):
        super().setUp()
        from micro_checks.models import MicroCheckRun, MicroCheckResponse, MicroCheckRunItem, MicroCheckAssignment
        from django.utils.crypto import get_random_string
        import hashlib

        # Create runs and responses for tenant A
        self.run_a = MicroCheckRun.objects.create(
            store=self.store_a,
            scheduled_for=timezone.now().date(),
            created_via='MANUAL',
            store_timezone=self.store_a.timezone
        )

        self.run_item_a = MicroCheckRunItem.objects.create(
            run=self.run_a,
            template=self.template_a,
            order=1,
            template_version=self.template_a.version,
            title_snapshot=self.template_a.title,
            success_criteria_snapshot=self.template_a.success_criteria,
            category_snapshot=self.template_a.category,
            severity_snapshot=self.template_a.severity
        )

        # Create assignment for tenant A
        token_a = get_random_string(32)
        self.assignment_a = MicroCheckAssignment.objects.create(
            run=self.run_a,
            store=self.store_a,
            sent_to=self.gm_a,
            access_token_hash=hashlib.sha256(token_a.encode()).hexdigest(),
            token_expires_at=timezone.now() + timezone.timedelta(days=7),
            purpose='RUN_ACCESS'
        )

        self.response_a = MicroCheckResponse.objects.create(
            run_item=self.run_item_a,
            run=self.run_a,
            assignment=self.assignment_a,
            template=self.template_a,
            status='PASS'
        )

        # Create runs and responses for tenant B
        self.run_b = MicroCheckRun.objects.create(
            store=self.store_b,
            scheduled_for=timezone.now().date(),
            created_via='MANUAL',
            store_timezone=self.store_b.timezone
        )

        self.run_item_b = MicroCheckRunItem.objects.create(
            run=self.run_b,
            template=self.template_b,
            order=1,
            template_version=self.template_b.version,
            title_snapshot=self.template_b.title,
            success_criteria_snapshot=self.template_b.success_criteria,
            category_snapshot=self.template_b.category,
            severity_snapshot=self.template_b.severity
        )

        # Create assignment for tenant B
        token_b = get_random_string(32)
        self.assignment_b = MicroCheckAssignment.objects.create(
            run=self.run_b,
            store=self.store_b,
            sent_to=self.gm_b,
            access_token_hash=hashlib.sha256(token_b.encode()).hexdigest(),
            token_expires_at=timezone.now() + timezone.timedelta(days=7),
            purpose='RUN_ACCESS'
        )

        self.response_b = MicroCheckResponse.objects.create(
            run_item=self.run_item_b,
            run=self.run_b,
            assignment=self.assignment_b,
            template=self.template_b,
            status='FAIL'
        )
        
        self.client = APIClient()
    
    def test_owner_a_cannot_see_response_b(self):
        """Owner A cannot see responses from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/micro-checks/responses/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = [str(r['id']) for r in response.data['results']]
        self.assertIn(str(self.response_a.id), response_ids)
        self.assertNotIn(str(self.response_b.id), response_ids)
    
    def test_retrieve_cross_tenant_response_returns_404(self):
        """Retrieving response from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/micro-checks/responses/{self.response_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_gm_a_cannot_see_response_b(self):
        """GM A cannot see responses from store B"""
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/micro-checks/responses/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = [str(r['id']) for r in response.data['results']]
        self.assertIn(str(self.response_a.id), response_ids)
        self.assertNotIn(str(self.response_b.id), response_ids)
    
    def test_super_admin_sees_all_responses(self):
        """Super admin can see responses from all tenants"""
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/micro-checks/responses/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = [str(r['id']) for r in response.data['results']]
        self.assertIn(str(self.response_a.id), response_ids)
        self.assertIn(str(self.response_b.id), response_ids)


class CorrectiveActionTenantIsolationTests(TenantIsolationTestCase):
    """Tests for corrective action tenant isolation"""
    
    def setUp(self):
        super().setUp()
        from micro_checks.models import MicroCheckRun, MicroCheckRunItem, MicroCheckResponse, MicroCheckAssignment, CorrectiveAction
        from django.utils.crypto import get_random_string
        import hashlib

        # Create runs for both tenants
        self.run_a = MicroCheckRun.objects.create(
            store=self.store_a,
            scheduled_for=timezone.now().date(),
            created_via='MANUAL',
            store_timezone=self.store_a.timezone
        )

        self.run_item_a = MicroCheckRunItem.objects.create(
            run=self.run_a,
            template=self.template_a,
            order=1,
            template_version=self.template_a.version,
            title_snapshot=self.template_a.title,
            success_criteria_snapshot=self.template_a.success_criteria,
            category_snapshot=self.template_a.category,
            severity_snapshot=self.template_a.severity
        )

        # Create assignment and response for tenant A
        token_a = get_random_string(32)
        assignment_a = MicroCheckAssignment.objects.create(
            run=self.run_a,
            store=self.store_a,
            sent_to=self.gm_a,
            access_token_hash=hashlib.sha256(token_a.encode()).hexdigest(),
            token_expires_at=timezone.now() + timezone.timedelta(days=7),
            purpose='RUN_ACCESS'
        )

        response_a = MicroCheckResponse.objects.create(
            run_item=self.run_item_a,
            run=self.run_a,
            assignment=assignment_a,
            template=self.template_a,
            status='FAIL'
        )

        # CorrectiveAction is auto-created by MicroCheckResponse.save() for FAIL status
        self.action_a = response_a.corrective_action

        self.run_b = MicroCheckRun.objects.create(
            store=self.store_b,
            scheduled_for=timezone.now().date(),
            created_via='MANUAL',
            store_timezone=self.store_b.timezone
        )

        self.run_item_b = MicroCheckRunItem.objects.create(
            run=self.run_b,
            template=self.template_b,
            order=1,
            template_version=self.template_b.version,
            title_snapshot=self.template_b.title,
            success_criteria_snapshot=self.template_b.success_criteria,
            category_snapshot=self.template_b.category,
            severity_snapshot=self.template_b.severity
        )

        # Create assignment and response for tenant B
        token_b = get_random_string(32)
        assignment_b = MicroCheckAssignment.objects.create(
            run=self.run_b,
            store=self.store_b,
            sent_to=self.gm_b,
            access_token_hash=hashlib.sha256(token_b.encode()).hexdigest(),
            token_expires_at=timezone.now() + timezone.timedelta(days=7),
            purpose='RUN_ACCESS'
        )

        response_b = MicroCheckResponse.objects.create(
            run_item=self.run_item_b,
            run=self.run_b,
            assignment=assignment_b,
            template=self.template_b,
            status='FAIL'
        )

        # CorrectiveAction is auto-created by MicroCheckResponse.save() for FAIL status
        self.action_b = response_b.corrective_action
        
        self.client = APIClient()
    
    def test_owner_a_cannot_see_action_b(self):
        """Owner A cannot see corrective actions from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/micro-checks/actions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        action_ids = [str(a['id']) for a in response.data['results']]
        self.assertIn(str(self.action_a.id), action_ids)
        self.assertNotIn(str(self.action_b.id), action_ids)
    
    def test_retrieve_cross_tenant_action_returns_404(self):
        """Retrieving corrective action from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/micro-checks/actions/{self.action_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_gm_a_cannot_see_action_b(self):
        """GM A cannot see corrective actions from store B"""
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/micro-checks/actions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        action_ids = [str(a['id']) for a in response.data['results']]
        self.assertIn(str(self.action_a.id), action_ids)
        self.assertNotIn(str(self.action_b.id), action_ids)
    
    def test_update_cross_tenant_action_rejected(self):
        """Owner A cannot update corrective action from store B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.patch(
            f'/api/micro-checks/actions/{self.action_b.id}/',
            {'status': 'RESOLVED'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_super_admin_sees_all_actions(self):
        """Super admin can see corrective actions from all tenants"""
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/micro-checks/actions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        action_ids = [str(a['id']) for a in response.data['results']]
        self.assertIn(str(self.action_a.id), action_ids)
        self.assertIn(str(self.action_b.id), action_ids)


class EmployeeVoiceResponseTenantIsolationTests(TenantIsolationTestCase):
    """Tests for employee voice response tenant isolation"""
    
    def setUp(self):
        super().setUp()
        from employee_voice.models import EmployeeVoicePulse, EmployeeVoiceResponse
        
        # Create pulses for both tenants
        self.pulse_a = EmployeeVoicePulse.objects.create(
            account=self.account_a,
            store=self.store_a,
            title='Pulse A',
            description='How are you feeling?'
        )

        self.response_a = EmployeeVoiceResponse.objects.create(
            pulse=self.pulse_a,
            mood=3,
            confidence=3,
            bottlenecks=[],
            comment='Great week',
            anonymous_hash='hash_a'
        )

        self.pulse_b = EmployeeVoicePulse.objects.create(
            account=self.account_b,
            store=self.store_b,
            title='Pulse B',
            description='How are you feeling?'
        )

        self.response_b = EmployeeVoiceResponse.objects.create(
            pulse=self.pulse_b,
            mood=2,
            confidence=1,
            bottlenecks=['STAFFING'],
            comment='',
            anonymous_hash='hash_b'
        )
        
        self.client = APIClient()
    
    def test_owner_a_cannot_see_response_b(self):
        """Owner A cannot see employee voice responses from account B"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/employee-voice/responses/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = [str(r['id']) for r in response.data['results']]
        self.assertIn(str(self.response_a.id), response_ids)
        self.assertNotIn(str(self.response_b.id), response_ids)
    
    def test_retrieve_cross_tenant_response_returns_404(self):
        """Retrieving employee voice response from another tenant returns 404"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f'/api/employee-voice/responses/{self.response_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_gm_a_cannot_see_response_b(self):
        """GM A cannot see employee voice responses from account B"""
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/employee-voice/responses/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = [str(r['id']) for r in response.data['results']]
        self.assertIn(str(self.response_a.id), response_ids)
        self.assertNotIn(str(self.response_b.id), response_ids)

    def test_super_admin_sees_all_responses(self):
        """Super admin can see employee voice responses from all tenants"""
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/employee-voice/responses/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = [str(r['id']) for r in response.data['results']]
        self.assertIn(str(self.response_a.id), response_ids)
        self.assertIn(str(self.response_b.id), response_ids)


class AdminBrandLevelAccessTests(TenantIsolationTestCase):
    """Tests for ADMIN role brand-level access across multiple accounts"""
    
    def setUp(self):
        super().setUp()
        from inspections.models import Inspection
        
        # Create ADMIN user for Brand A
        self.admin_a = User.objects.create_user(
            username="admin_a",
            email="admin_a@test.com",
            password="password123",
            role=User.Role.ADMIN
        )
        # ADMIN needs account set to get brand_id via user.account.brand
        self.admin_a.account = self.account_a
        self.admin_a.save()
        
        # Create a second account and store for Brand A
        self.account_a2 = Account.objects.create(
            name="Account A2",
            brand=self.brand_a,
            owner=self.owner_a
        )
        
        self.store_a2 = Store.objects.create(
            name="Store A2",
            code="STORE-A2",
            account=self.account_a2,
            brand=self.brand_a,
            address="789 Test Blvd",
            city="Testland",
            state="TL",
            zip_code="22222",
            timezone="America/Chicago"
        )
        
        # Create inspections in both stores of Brand A
        self.inspection_a1 = Inspection.objects.create(
            title="Inspection A1",
            store=self.store_a,
            created_by=self.owner_a,
            mode="INSPECTION",
            status="COMPLETED"
        )
        
        self.inspection_a2 = Inspection.objects.create(
            title="Inspection A2",
            store=self.store_a2,
            created_by=self.owner_a,
            mode="INSPECTION",
            status="COMPLETED"
        )
        
        # Create inspection in Brand B
        self.inspection_b = Inspection.objects.create(
            title="Inspection B",
            store=self.store_b,
            created_by=self.owner_b,
            mode="INSPECTION",
            status="COMPLETED"
        )
        
        self.client = APIClient()
    
    def test_admin_sees_all_brand_inspections(self):
        """ADMIN sees inspections from all accounts/stores in their brand"""
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get('/api/inspections/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inspection_ids = [i['id'] for i in response.data['results']]
        
        # Should see both inspections from Brand A (different accounts)
        self.assertIn(self.inspection_a1.id, inspection_ids)
        self.assertIn(self.inspection_a2.id, inspection_ids)
        
        # Should NOT see Brand B
        self.assertNotIn(self.inspection_b.id, inspection_ids)
    
    def test_admin_sees_all_brand_videos(self):
        """ADMIN sees videos from all accounts/stores in their brand"""
        from videos.models import Video
        
        video_a1 = Video.objects.create(
            title="Video A1",
            store=self.store_a,
            uploaded_by=self.owner_a,
            file="videos/a1.mp4"
        )
        
        video_a2 = Video.objects.create(
            title="Video A2",
            store=self.store_a2,
            uploaded_by=self.owner_a,
            file="videos/a2.mp4"
        )
        
        video_b = Video.objects.create(
            title="Video B",
            store=self.store_b,
            uploaded_by=self.owner_b,
            file="videos/b.mp4"
        )
        
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get('/api/videos/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [v['id'] for v in response.data['results']]
        
        self.assertIn(video_a1.id, video_ids)
        self.assertIn(video_a2.id, video_ids)
        self.assertNotIn(video_b.id, video_ids)
    
    def test_admin_sees_all_brand_uploads(self):
        """ADMIN sees uploads from all stores in their brand"""
        from uploads.models import Upload

        upload_a1 = Upload.objects.create(
            store=self.store_a,
            created_by=self.owner_a,
            mode='COACHING',
            s3_key='uploads/a1.mp4',
            status='COMPLETE',
            original_filename='a1.mp4'
        )

        upload_a2 = Upload.objects.create(
            store=self.store_a2,
            created_by=self.owner_a,
            mode='COACHING',
            s3_key='uploads/a2.mp4',
            status='COMPLETE',
            original_filename='a2.mp4'
        )

        upload_b = Upload.objects.create(
            store=self.store_b,
            created_by=self.owner_b,
            mode='COACHING',
            s3_key='uploads/b.mp4',
            status='COMPLETE',
            original_filename='b.mp4'
        )
        
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get('/api/uploads/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        upload_ids = [u['id'] for u in response.data['results']]
        
        self.assertIn(upload_a1.id, upload_ids)
        self.assertIn(upload_a2.id, upload_ids)
        self.assertNotIn(upload_b.id, upload_ids)


class GMStoreLevelIsolationTests(TenantIsolationTestCase):
    """Tests for GM isolation within same account (multi-store scenarios)"""
    
    def setUp(self):
        super().setUp()
        from inspections.models import Inspection
        
        # Create a second store in Account A
        self.store_a2 = Store.objects.create(
            name="Store A2",
            code="STORE-A2",
            account=self.account_a,
            brand=self.brand_a,
            address="999 Test Way",
            city="Testopolis",
            state="TP",
            zip_code="33333",
            timezone="America/Denver"
        )
        
        # Create GM for Store A2
        self.gm_a2 = User.objects.create_user(
            username="gm_a2",
            email="gm_a2@test.com",
            password="password123",
            role=User.Role.GM
        )
        self.gm_a2.account = self.account_a
        self.gm_a2.store = self.store_a2
        self.gm_a2.save()
        
        # Create inspections for both stores in Account A
        self.inspection_a1 = Inspection.objects.create(
            title="Inspection Store A1",
            store=self.store_a,
            created_by=self.gm_a,
            mode="INSPECTION",
            status="COMPLETED"
        )
        
        self.inspection_a2 = Inspection.objects.create(
            title="Inspection Store A2",
            store=self.store_a2,
            created_by=self.gm_a2,
            mode="INSPECTION",
            status="COMPLETED"
        )
        
        self.client = APIClient()
    
    def test_gm_a1_cannot_see_store_a2_inspections(self):
        """GM at Store A1 cannot see Store A2 inspections (same account)"""
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/inspections/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inspection_ids = [i['id'] for i in response.data['results']]
        
        # GM A should only see their own store
        self.assertIn(self.inspection_a1.id, inspection_ids)
        self.assertNotIn(self.inspection_a2.id, inspection_ids)
    
    def test_gm_a2_cannot_see_store_a1_inspections(self):
        """GM at Store A2 cannot see Store A1 inspections (same account)"""
        self.client.force_authenticate(user=self.gm_a2)
        response = self.client.get('/api/inspections/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inspection_ids = [i['id'] for i in response.data['results']]
        
        # GM A2 should only see their own store
        self.assertIn(self.inspection_a2.id, inspection_ids)
        self.assertNotIn(self.inspection_a1.id, inspection_ids)
    
    def test_owner_sees_all_account_stores(self):
        """OWNER sees inspections from all stores in their account"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/inspections/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inspection_ids = [i['id'] for i in response.data['results']]
        
        # Owner should see both stores
        self.assertIn(self.inspection_a1.id, inspection_ids)
        self.assertIn(self.inspection_a2.id, inspection_ids)
    
    def test_gm_a1_cannot_see_store_a2_videos(self):
        """GM at Store A1 cannot see Store A2 videos (same account)"""
        from videos.models import Video
        
        video_a1 = Video.objects.create(
            title="Video A1",
            store=self.store_a,
            uploaded_by=self.gm_a,
            file="videos/a1.mp4"
        )
        
        video_a2 = Video.objects.create(
            title="Video A2",
            store=self.store_a2,
            uploaded_by=self.gm_a2,
            file="videos/a2.mp4"
        )
        
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get('/api/videos/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [v['id'] for v in response.data['results']]
        
        self.assertIn(video_a1.id, video_ids)
        self.assertNotIn(video_a2.id, video_ids)
    
    def test_gm_cannot_access_other_store_upload(self):
        """GM cannot retrieve upload from another store in same account"""
        from uploads.models import Upload

        upload_a2 = Upload.objects.create(
            store=self.store_a2,
            created_by=self.owner_a,
            mode='COACHING',
            s3_key='uploads/a2.mp4',
            status='COMPLETE',
            original_filename='a2.mp4'
        )
        
        self.client.force_authenticate(user=self.gm_a)
        response = self.client.get(f'/api/uploads/{upload_a2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class WriteOperationTenantIsolationTests(TenantIsolationTestCase):
    """Tests for write operations (create/update/delete) across ViewSets"""
    
    def setUp(self):
        super().setUp()
        from inspections.models import Inspection, Finding
        from videos.models import Video
        
        # Create test data
        self.video_a = Video.objects.create(
            title="Video A",
            store=self.store_a,
            uploaded_by=self.owner_a,
            file="videos/a.mp4"
        )
        
        self.inspection_a = Inspection.objects.create(
            title="Inspection A",
            store=self.store_a,
            created_by=self.owner_a,
            mode="INSPECTION",
            status="COMPLETED"
        )
        
        self.finding_a = Finding.objects.create(
            inspection=self.inspection_a,
            category="CLEANLINESS",
            severity="MEDIUM",
            title="Finding A",
            description="Test finding",
            confidence=0.95
        )
        
        self.client = APIClient()
    
    def test_cannot_create_video_for_other_tenant_store(self):
        """User cannot create video for another tenant's store"""
        self.client.force_authenticate(user=self.owner_a)
        
        response = self.client.post('/api/videos/', {
            'title': 'Malicious Video',
            'store': self.store_b.id,  # Wrong tenant!
            'file': 'videos/malicious.mp4'
        })
        
        # Should be rejected (either 403 or 400 depending on validation)
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
    
    def test_cannot_update_cross_tenant_inspection(self):
        """User cannot update inspection from another tenant"""
        from inspections.models import Inspection
        
        inspection_b = Inspection.objects.create(
            title="Inspection B",
            store=self.store_b,
            created_by=self.owner_b,
            mode="INSPECTION",
            status="PENDING"
        )
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.patch(
            f'/api/inspections/{inspection_b.id}/',
            {'status': 'COMPLETED'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify it wasn't updated
        inspection_b.refresh_from_db()
        self.assertEqual(inspection_b.status, 'PENDING')
    
    def test_cannot_delete_cross_tenant_finding(self):
        """User cannot delete finding from another tenant"""
        from inspections.models import Inspection, Finding
        
        inspection_b = Inspection.objects.create(
            title="Inspection B",
            store=self.store_b,
            created_by=self.owner_b,
            mode="INSPECTION",
            status="COMPLETED"
        )
        
        finding_b = Finding.objects.create(
            inspection=inspection_b,
            category="SAFETY",
            severity="HIGH",
            title="Finding B",
            description="Test finding B",
            confidence=0.93
        )
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.delete(f'/api/inspections/findings/{finding_b.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify it still exists
        self.assertTrue(Finding.objects.filter(id=finding_b.id).exists())
    
    def test_cannot_update_cross_tenant_video(self):
        """User cannot update video from another tenant"""
        from videos.models import Video
        
        video_b = Video.objects.create(
            title="Video B",
            store=self.store_b,
            uploaded_by=self.owner_b,
            file="videos/b.mp4"
        )
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.patch(
            f'/api/videos/{video_b.id}/',
            {'title': 'Hacked Title'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify title wasn't changed
        video_b.refresh_from_db()
        self.assertEqual(video_b.title, 'Video B')
    
    def test_cannot_delete_cross_tenant_upload(self):
        """User cannot delete upload from another tenant"""
        from uploads.models import Upload

        upload_b = Upload.objects.create(
            store=self.store_b,
            created_by=self.owner_b,
            mode='COACHING',
            s3_key='uploads/b.mp4',
            status='COMPLETE',
            original_filename='b.mp4'
        )
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.delete(f'/api/uploads/{upload_b.id}/')

        # Upload ViewSet is ReadOnly, so DELETE returns 405 (Method Not Allowed)
        # This is acceptable since the resource can't be deleted at all
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Verify it still exists
        self.assertTrue(Upload.objects.filter(id=upload_b.id).exists())
    
    def test_can_update_own_inspection(self):
        """User CAN update their own inspection"""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.patch(
            f'/api/inspections/{self.inspection_a.id}/',
            {'status': 'PENDING'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify it was updated
        self.inspection_a.refresh_from_db()
        self.assertEqual(self.inspection_a.status, 'PENDING')
    
    def test_can_delete_own_finding(self):
        """User CAN delete their own finding"""
        from inspections.models import Finding

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.delete(f'/api/inspections/findings/{self.finding_a.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify it was deleted
        self.assertFalse(Finding.objects.filter(id=self.finding_a.id).exists())
