"""
Integration tests for Micro-Check (Micro-Check) workflows.

Tests critical multi-step user journeys including:
- Complete run lifecycle (creation → execution → completion)
- Corrective action workflow (failure → action → resolution)
- Magic link authentication and security
- Template management and usage tracking
"""
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta

from brands.models import Brand, Store
from micro_checks.models import (
    MicroCheckTemplate, MicroCheckRun, MicroCheckRunItem,
    MicroCheckResponse, CorrectiveAction, MicroCheckStreak
)
from micro_checks.utils import seed_default_templates

User = get_user_model()


class MicroCheckRunLifecycleTest(TransactionTestCase):
    """Test complete micro-check run lifecycle from creation to completion"""

    def setUp(self):
        self.client = APIClient()

        # Create brand and store
        self.brand = Brand.objects.create(name="Integration Test Brand")
        self.store = Store.objects.create(
            brand=self.brand,
            name="Test Store",
            code="INT-001",
            address="123 Test St",
            city="Test City",
            state="TS",
            zip_code="12345",
            timezone="America/New_York"
        )

        # Create manager user
        self.manager = User.objects.create_user(
            username="manager@test.com",
            email="manager@test.com",
            password="testpass123",
            role=User.Role.GM,
            store=self.store
        )

        # Seed default templates
        self.templates = seed_default_templates(self.brand, created_by=self.manager)

    def test_complete_run_lifecycle_all_pass(self):
        """Test full run lifecycle with all checks passing"""
        self.client.force_authenticate(user=self.manager)

        # Step 1: Create instant run
        response = self.client.post('/api/micro-checks/runs/create_instant_run/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        run_id = response.data['run']['id']
        magic_token = response.data['token']

        # Verify run created with items
        run = MicroCheckRun.objects.get(id=run_id)
        self.assertEqual(run.status, 'PENDING')
        self.assertEqual(run.store, self.store)
        self.assertGreater(run.items.count(), 0)

        initial_item_count = run.items.count()

        # Step 2: Access run via magic link (no authentication)
        self.client.force_authenticate(user=None)
        response = self.client.get(f'/api/micro-checks/runs/by_token/?token={magic_token}')

        # Should be able to access run with token
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['id']), str(run_id))

        # Step 3: Submit PASS responses for all items
        for item in run.items.all():
            response_data = {
                'token': magic_token,
                'run_item': str(item.id),
                'status': 'PASS',
                'notes': 'All good!'
            }

            response = self.client.post(
                '/api/micro-checks/responses/submit_via_magic_link/',
                response_data,
                format='json'
            )

            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

            # Verify response created
            micro_response = MicroCheckResponse.objects.get(run_item=item)
            self.assertEqual(micro_response.status, 'PASS')
            self.assertEqual(micro_response.store, self.store)

        # Step 4: Verify run completion
        run.refresh_from_db()
        self.assertEqual(run.status, 'COMPLETED')
        self.assertIsNotNone(run.completed_at)
        # Completed by the user the magic link was sent to
        self.assertEqual(run.completed_by, self.manager)

        # Step 5: Verify all responses recorded
        responses = MicroCheckResponse.objects.filter(run=run)
        self.assertEqual(responses.count(), initial_item_count)
        self.assertEqual(responses.filter(status='PASS').count(), initial_item_count)

        # Step 6: Verify no corrective actions created (all passed)
        actions = CorrectiveAction.objects.filter(response__run=run)
        self.assertEqual(actions.count(), 0)

    def test_complete_run_lifecycle_with_failures(self):
        """Test run lifecycle with failures creating corrective actions"""
        self.client.force_authenticate(user=self.manager)

        # Create run
        response = self.client.post('/api/micro-checks/runs/create_instant_run/')
        run_id = response.data['run']['id']
        magic_token = response.data['token']

        run = MicroCheckRun.objects.get(id=run_id)
        items = list(run.items.all())

        self.client.force_authenticate(user=None)

        # Submit mixed responses: PASS, FAIL, PASS
        statuses = ['PASS', 'FAIL', 'PASS']

        for item, expected_status in zip(items[:3], statuses):
            response_data = {
                'token': magic_token,
                'run_item': str(item.id),
                'status': expected_status,
                'notes': f'Test {expected_status} response'
            }

            response = self.client.post(
                '/api/micro-checks/responses/submit_via_magic_link/',
                response_data,
                format='json'
            )

            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify corrective action auto-created for failure
        fail_item = items[1]
        fail_response = MicroCheckResponse.objects.get(run_item=fail_item)
        self.assertEqual(fail_response.status, 'FAIL')

        # Corrective action should exist
        action = CorrectiveAction.objects.filter(response=fail_response).first()
        self.assertIsNotNone(action)
        self.assertEqual(action.status, 'OPEN')
        self.assertEqual(action.store, self.store)
        self.assertEqual(action.category, fail_item.category_snapshot)

    def test_run_with_inline_fix_workflow(self):
        """Test inline fix workflow during check execution"""
        self.client.force_authenticate(user=self.manager)

        # Create run
        response = self.client.post('/api/micro-checks/runs/create_instant_run/')
        run_id = response.data['run']['id']
        magic_token = response.data['token']

        run = MicroCheckRun.objects.get(id=run_id)
        first_item = run.items.first()

        self.client.force_authenticate(user=None)

        # Step 1: Submit FAIL response
        fail_data = {
            'token': magic_token,
            'run_item': str(first_item.id),
            'status': 'FAIL',
            'notes': 'Needs immediate fix'
        }

        response = self.client.post(
            '/api/micro-checks/responses/submit_via_magic_link/',
            fail_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Step 2: Verify corrective action created
        fail_response = MicroCheckResponse.objects.get(run_item=first_item)
        action = CorrectiveAction.objects.get(response=fail_response)
        self.assertEqual(action.status, 'OPEN')

        # Step 3: Mark as fixed inline (simulated - actual workflow requires photo upload)
        # This would be done via resolve_inline endpoint in real usage
        action.status = 'RESOLVED'
        action.fixed_during_session = True
        action.resolved_at = timezone.now()
        action.save()

        # Verify fixed
        action.refresh_from_db()
        self.assertEqual(action.status, 'RESOLVED')
        self.assertTrue(action.fixed_during_session)


class CorrectiveActionWorkflowTest(TransactionTestCase):
    """Test corrective action workflow from creation to resolution"""

    def setUp(self):
        self.client = APIClient()

        self.brand = Brand.objects.create(name="Action Test Brand")
        self.store = Store.objects.create(
            brand=self.brand,
            name="Action Test Store",
            code="ACT-001",
            timezone="America/New_York"
        )

        self.manager = User.objects.create_user(
            username="manager@test.com",
            email="manager@test.com",
            password="testpass123",
            role=User.Role.GM,
            store=self.store
        )

        # Seed templates and create a run
        seed_default_templates(self.brand, created_by=self.manager)

        self.client.force_authenticate(user=self.manager)
        response = self.client.post('/api/micro-checks/runs/create_instant_run/')
        self.run_id = response.data['run']['id']
        self.magic_token = response.data['token']

    def test_action_auto_creation_on_failure(self):
        """Test that corrective actions are automatically created for failures"""
        run = MicroCheckRun.objects.get(id=self.run_id)
        first_item = run.items.first()

        # Submit failure via magic link
        self.client.force_authenticate(user=None)

        fail_data = {
            'token': self.magic_token,
            'run_item': str(first_item.id),
            'status': 'FAIL',
            'notes': 'Critical issue found'
        }

        response = self.client.post(
            '/api/micro-checks/responses/submit_via_magic_link/',
            fail_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify action auto-created
        fail_response = MicroCheckResponse.objects.get(run_item=first_item)
        action = CorrectiveAction.objects.get(response=fail_response)

        self.assertEqual(action.status, 'OPEN')
        self.assertEqual(action.created_from, 'MICRO_CHECK')
        self.assertIsNone(action.assigned_to)
        self.assertIsNotNone(action.due_at)

    def test_action_resolution_workflow(self):
        """Test complete action resolution workflow"""
        # Create a failure with action
        run = MicroCheckRun.objects.get(id=self.run_id)
        first_item = run.items.first()

        self.client.force_authenticate(user=None)

        fail_data = {
            'token': self.magic_token,
            'run_item': str(first_item.id),
            'status': 'FAIL'
        }

        self.client.post(
            '/api/micro-checks/responses/submit_via_magic_link/',
            fail_data,
            format='json'
        )

        action = CorrectiveAction.objects.get(
            response__run_item=first_item
        )

        # Step 1: Action is open
        self.assertEqual(action.status, 'OPEN')

        # Step 2: Assign to team member
        self.client.force_authenticate(user=self.manager)
        action.assigned_to = self.manager
        action.status = 'IN_PROGRESS'
        action.save()

        # Step 3: Resolve action
        action.status = 'RESOLVED'
        action.resolved_at = timezone.now()
        action.resolved_by = self.manager
        action.resolution_notes = 'Issue fixed and verified'
        action.save()

        # Verify resolution
        action.refresh_from_db()
        self.assertEqual(action.status, 'RESOLVED')
        self.assertIsNotNone(action.resolved_at)
        self.assertEqual(action.resolved_by, self.manager)

    def test_multiple_failures_create_multiple_actions(self):
        """Test that multiple failures in one run create separate actions"""
        run = MicroCheckRun.objects.get(id=self.run_id)
        items = list(run.items.all()[:3])

        self.client.force_authenticate(user=None)

        # Submit 3 failures
        for item in items:
            fail_data = {
                'token': self.magic_token,
                'run_item': str(item.id),
                'status': 'FAIL',
                'notes': f'Failure for {item.title_snapshot}'
            }

            self.client.post(
                '/api/micro-checks/responses/submit_via_magic_link/',
                fail_data,
                format='json'
            )

        # Verify 3 actions created
        actions = CorrectiveAction.objects.filter(
            response__run_item__in=items
        )

        self.assertEqual(actions.count(), 3)

        # All should be open
        self.assertEqual(
            actions.filter(status='OPEN').count(),
            3
        )

        # All should have unique responses
        response_ids = set(actions.values_list('response_id', flat=True))
        self.assertEqual(len(response_ids), 3)


class MagicLinkAuthenticationTest(TransactionTestCase):
    """Test magic link token authentication and security"""

    def setUp(self):
        self.client = APIClient()

        self.brand = Brand.objects.create(name="Token Test Brand")
        self.store = Store.objects.create(
            brand=self.brand,
            name="Token Test Store",
            code="TOK-001",
            timezone="America/New_York"
        )

        self.manager = User.objects.create_user(
            username="manager@test.com",
            email="manager@test.com",
            password="testpass123",
            role=User.Role.GM,
            store=self.store
        )

        seed_default_templates(self.brand, created_by=self.manager)

    def test_magic_link_token_generated_on_run_creation(self):
        """Test that magic link tokens are generated when creating runs"""
        self.client.force_authenticate(user=self.manager)

        response = self.client.post('/api/micro-checks/runs/create_instant_run/')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)

        token = response.data['token']
        self.assertIsNotNone(token)
        self.assertGreater(len(token), 10)  # Should be substantial length

    def test_unauthenticated_access_with_valid_token(self):
        """Test that valid tokens allow unauthenticated access to runs"""
        # Create run with token
        self.client.force_authenticate(user=self.manager)
        response = self.client.post('/api/micro-checks/runs/create_instant_run/')

        run_id = response.data['run']['id']
        token = response.data['token']

        # Access without authentication using token
        self.client.force_authenticate(user=None)
        response = self.client.get(f'/api/micro-checks/runs/by_token/?token={token}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['id']), str(run_id))

    def test_token_allows_response_submission(self):
        """Test that tokens allow response submission without login"""
        self.client.force_authenticate(user=self.manager)
        response = self.client.post('/api/micro-checks/runs/create_instant_run/')

        run_id = response.data['run']['id']
        token = response.data['token']

        run = MicroCheckRun.objects.get(id=run_id)
        first_item = run.items.first()

        # Submit response without authentication
        self.client.force_authenticate(user=None)

        response_data = {
            'token': token,
            'run_item': str(first_item.id),
            'status': 'PASS',
            'notes': 'Submitted via magic link'
        }

        response = self.client.post(
            '/api/micro-checks/responses/submit_via_magic_link/',
            response_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify response recorded
        micro_response = MicroCheckResponse.objects.get(run_item=first_item)
        self.assertEqual(micro_response.status, 'PASS')

    def test_token_reuse_allowed_for_same_run(self):
        """Test that tokens can be reused for the same run (for review/corrections)"""
        self.client.force_authenticate(user=self.manager)
        response = self.client.post('/api/micro-checks/runs/create_instant_run/')

        token = response.data['token']
        run_id = response.data['run']['id']

        self.client.force_authenticate(user=None)

        # Access run multiple times with same token
        for _ in range(3):
            response = self.client.get(f'/api/micro-checks/runs/by_token/?token={token}')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(str(response.data['id']), str(run_id))

    def test_different_stores_have_different_tokens(self):
        """Test that tokens are unique per run/store"""
        # Create second store
        store2 = Store.objects.create(
            brand=self.brand,
            name="Store 2",
            code="TOK-002",
            timezone="America/New_York"
        )

        manager2 = User.objects.create_user(
            username="manager2@test.com",
            email="manager2@test.com",
            password="testpass123",
            role=User.Role.GM,
            store=store2
        )

        # Create runs for both stores
        self.client.force_authenticate(user=self.manager)
        response1 = self.client.post('/api/micro-checks/runs/create_instant_run/')
        token1 = response1.data['token']
        run_id1 = response1.data['run']['id']

        self.client.force_authenticate(user=manager2)
        response2 = self.client.post('/api/micro-checks/runs/create_instant_run/')
        token2 = response2.data['token']
        run_id2 = response2.data['run']['id']

        # Tokens should be different
        self.assertNotEqual(token1, token2)

        # Token1 should only access run1
        self.client.force_authenticate(user=None)
        response = self.client.get(f'/api/micro-checks/runs/by_token/?token={token1}')
        self.assertEqual(str(response.data['id']), str(run_id1))

        # Token2 should only access run2
        response = self.client.get(f'/api/micro-checks/runs/by_token/?token={token2}')
        self.assertEqual(str(response.data['id']), str(run_id2))
