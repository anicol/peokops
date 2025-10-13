"""
Integration tests for trial user complete journey.

Tests the end-to-end trial user experience including:
- Trial signup and account creation
- Onboarding completion with brand setup
- First micro-check run creation and execution
"""
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from brands.models import Brand, Store
from micro_checks.models import (
    MicroCheckTemplate, MicroCheckRun, MicroCheckResponse
)

User = get_user_model()


class TrialUserCompleteJourneyTest(TransactionTestCase):
    """Test complete trial user journey from signup to first run"""

    def setUp(self):
        self.client = APIClient()

    def test_complete_trial_journey_happy_path(self):
        """
        Test the complete happy path for a trial user:
        1. Sign up
        2. Complete onboarding
        3. Create first instant run
        4. Execute run via magic link
        """
        # Step 1: Trial Signup
        signup_data = {
            'email': 'trial@restaurant.com',
            'password': 'securepass123',
            'first_name': 'Trial',
            'last_name': 'Owner'
        }

        response = self.client.post('/api/auth/trial-signup/', signup_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('access', response.data)

        # Verify user created with trial role
        user = User.objects.get(email='trial@restaurant.com')
        self.assertIn(user.role, [User.Role.OWNER, 'TRIAL_ADMIN'])  # Could be either depending on migration state
        self.assertTrue(user.is_trial_user)
        self.assertIsNone(user.onboarding_completed_at)

        # Verify brand and store auto-created
        self.assertIsNotNone(user.store)
        brand = user.store.brand
        self.assertIsNotNone(brand)

        # Verify templates seeded
        templates = MicroCheckTemplate.objects.filter(brand=brand)
        self.assertEqual(templates.count(), 15)

        # Step 2: Complete Onboarding
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        onboarding_data = {
            'brand_name': 'Trial Restaurant Group',
            'industry': 'QSR',
            'store_count_range': '1-5',
            'role': 'GM',
            'focus_areas': ['EQUIPMENT', 'CLEANLINESS']
        }

        response = self.client.post('/api/auth/trial/onboarding/', onboarding_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify brand updated
        brand.refresh_from_db()
        self.assertEqual(brand.name, 'Trial Restaurant Group')
        self.assertEqual(brand.industry, 'QSR')
        self.assertEqual(brand.store_count_range, '1-5')
        self.assertEqual(brand.focus_areas, ['EQUIPMENT', 'CLEANLINESS'])

        # Verify user onboarding completed
        user.refresh_from_db()
        self.assertIsNotNone(user.onboarding_completed_at)

        # Step 3: Create First Instant Run
        response = self.client.post('/api/micro-checks/runs/create_instant_run/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('run', response.data)
        self.assertIn('token', response.data)

        run_id = response.data['run']['id']
        magic_token = response.data['token']

        # Verify run created
        run = MicroCheckRun.objects.get(id=run_id)
        self.assertEqual(run.status, 'PENDING')
        self.assertEqual(run.store, user.store)
        self.assertGreater(run.items.count(), 0)

        # Step 4: Execute Run via Magic Link (unauthenticated)
        self.client.credentials()  # Clear authentication

        # Access run with token
        response = self.client.get(f'/api/micro-checks/runs/by_token/?token={magic_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Submit responses for all items
        items = list(run.items.all())
        for i, item in enumerate(items):
            response_data = {
                'token': magic_token,
                'run_item': str(item.id),
                'status': 'PASS' if i < len(items) - 1 else 'FAIL',  # Fail last one
                'notes': 'Test response'
            }

            response = self.client.post(
                '/api/micro-checks/responses/submit_via_magic_link/',
                response_data,
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Step 5: Verify Run Completion
        run.refresh_from_db()
        self.assertEqual(run.status, 'COMPLETED')
        self.assertIsNotNone(run.completed_at)

        # Verify all responses recorded
        responses = MicroCheckResponse.objects.filter(run=run)
        self.assertEqual(responses.count(), run.items.count())

        # Verify at least one passed and one failed
        self.assertGreater(responses.filter(status='PASS').count(), 0)
        self.assertGreater(responses.filter(status='FAIL').count(), 0)

    def test_trial_user_multiple_runs_progression(self):
        """Test trial user creating and completing multiple runs"""
        # Create trial user
        signup_data = {
            'email': 'multi@trial.com',
            'password': 'password123',
            'first_name': 'Multi',
            'last_name': 'Run'
        }

        response = self.client.post('/api/auth/trial-signup/', signup_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        access_token = response.data['access']

        # Complete onboarding
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        onboarding_data = {
            'brand_name': 'Multi Run Co',
            'industry': 'CASUAL_DINING',
            'store_count_range': '1-5',
            'role': 'GM',
            'focus_areas': ['CLEANLINESS']
        }
        self.client.post('/api/auth/trial/onboarding/', onboarding_data, format='json')

        user = User.objects.get(email='multi@trial.com')

        # Create and complete 3 runs
        for i in range(3):
            # Create run
            response = self.client.post('/api/micro-checks/runs/create_instant_run/')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

            run_id = response.data['run']['id']
            magic_token = response.data['token']

            run = MicroCheckRun.objects.get(id=run_id)

            # Submit responses for all items
            self.client.credentials()  # Clear auth for magic link
            for item in run.items.all():
                response_data = {
                    'token': magic_token,
                    'run_item': str(item.id),
                    'status': 'PASS'
                }

                self.client.post(
                    '/api/micro-checks/responses/submit_via_magic_link/',
                    response_data,
                    format='json'
                )

            # Re-authenticate for next run
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Verify multiple completed runs
        completed_runs = MicroCheckRun.objects.filter(
            store=user.store,
            status='COMPLETED'
        )
        self.assertEqual(completed_runs.count(), 3)

    def test_onboarding_with_different_industries(self):
        """Test onboarding with different industry types"""
        industries = ['QSR', 'CASUAL_DINING', 'FINE_DINING', 'OTHER']

        for industry in industries:
            email = f'test_{industry.lower()}@trial.com'
            signup_data = {
                'email': email,
                'password': 'password123',
                'first_name': 'Test',
                'last_name': 'User'
            }

            response = self.client.post('/api/auth/trial-signup/', signup_data)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

            onboarding_data = {
                'brand_name': f'{industry} Restaurant',
                'industry': industry,
                'store_count_range': '1-5',
                'role': 'GM',
                'focus_areas': ['EQUIPMENT']
            }

            response = self.client.post('/api/auth/trial/onboarding/', onboarding_data, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verify brand industry set correctly
            user = User.objects.get(email=email)
            brand = user.store.brand
            self.assertEqual(brand.industry, industry)

            # Clear credentials for next iteration
            self.client.credentials()
