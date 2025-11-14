from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock

from accounts.models import User, Account
from brands.models import Brand, Store
from employee_voice.models import (
    EmployeeVoicePulse,
    EmployeeVoiceResponse,
    CrossVoiceCorrelation
)
from employee_voice.tasks import (
    _analyze_bottleneck_correlations,
    _analyze_confidence_correlations
)
from micro_checks.models import MicroCheckTemplate, MicroCheckRun, MicroCheckResponse, MicroCheckRunItem, MicroCheckAssignment
import hashlib


class BottleneckCorrelationTests(TestCase):
    """Test bottleneck correlation detection with JSONField array"""

    def setUp(self):
        self.brand = Brand.objects.create(name="Test Brand")
        
        self.user = User.objects.create(
            email="test@example.com",
            role=User.Role.OWNER
        )
        
        self.account = Account.objects.create(
            name="Test Account",
            brand=self.brand,
            owner=self.user
        )
        
        self.user.account = self.account
        self.user.save()
        
        self.store = Store.objects.create(
            name="Test Store",
            account=self.account,
            brand=self.brand,
            timezone='America/New_York'
        )
        
        self.pulse = EmployeeVoicePulse.objects.create(
            store=self.store,
            account=self.account,
            title="Test Pulse",
            status=EmployeeVoicePulse.Status.ACTIVE,
            created_by=self.user
        )
        
        self.template = MicroCheckTemplate.objects.create(
            brand=self.brand,
            title="Equipment Check",
            category="EQUIPMENT",
            success_criteria="Equipment working",
            created_by=self.user
        )

    def test_bottleneck_correlation_with_jsonfield_array(self):
        """Test that bottleneck correlation correctly handles JSONField array"""
        time_window_start = timezone.now() - timedelta(days=7)

        for i in range(5):
            EmployeeVoiceResponse.objects.create(
                pulse=self.pulse,
                anonymous_hash=f"hash_{i}",
                mood=3,
                confidence=2,
                bottlenecks=['EQUIPMENT', 'STAFFING'],
                completed_at=timezone.now()
            )

        run = MicroCheckRun.objects.create(
            store=self.store,
            scheduled_for=timezone.now().date(),
            created_via='MANUAL',
            store_timezone=self.store.timezone
        )

        # Create assignment for the responses
        assignment = MicroCheckAssignment.objects.create(
            run=run,
            store=self.store,
            sent_to=self.user,
            access_token_hash=hashlib.sha256(b'test_token').hexdigest(),
            token_expires_at=timezone.now() + timedelta(days=7)
        )

        # Create 5 templates (4 FAIL + 1 PASS) to comply with unique_together constraint
        templates = []
        for i in range(5):
            template = MicroCheckTemplate.objects.create(
                brand=self.brand,
                title=f"Equipment Check {i}",
                category="EQUIPMENT",
                success_criteria="Equipment working",
                created_by=self.user
            )
            templates.append(template)

            run_item = MicroCheckRunItem.objects.create(
                run=run,
                template=template,
                order=i + 1,
                template_version=template.version,
                title_snapshot=template.title,
                success_criteria_snapshot=template.success_criteria,
                category_snapshot=template.category,
                severity_snapshot=template.severity
            )

            # Create one response per template (4 FAIL + 1 PASS)
            MicroCheckResponse.objects.create(
                run_item=run_item,
                run=run,
                assignment=assignment,
                template=template,
                store=self.store,
                category=template.category,
                severity_snapshot=template.severity,
                status='FAIL' if i < 4 else 'PASS',
                completed_at=timezone.now(),
                completed_by=self.user,
                local_completed_date=timezone.now().date()
            )

        responses = EmployeeVoiceResponse.objects.filter(pulse=self.pulse)

        correlations_created = _analyze_bottleneck_correlations(
            self.pulse,
            responses,
            time_window_start
        )

        self.assertGreater(correlations_created, 0)

        correlation = CrossVoiceCorrelation.objects.filter(
            pulse=self.pulse,
            bottleneck_type='EQUIPMENT'
        ).first()

        self.assertIsNotNone(correlation)
        self.assertEqual(correlation.check_category, 'EQUIPMENT')
        self.assertEqual(correlation.check_fail_rate, 80.0)

    def test_bottleneck_correlation_with_empty_bottlenecks(self):
        """Test that empty bottlenecks arrays are handled correctly"""
        time_window_start = timezone.now() - timedelta(days=7)
        
        for i in range(3):
            EmployeeVoiceResponse.objects.create(
                pulse=self.pulse,
                anonymous_hash=f"hash_{i}",
                mood=3,
                confidence=2,
                bottlenecks=[],
                completed_at=timezone.now()
            )
        
        responses = EmployeeVoiceResponse.objects.filter(pulse=self.pulse)
        
        correlations_created = _analyze_bottleneck_correlations(
            self.pulse,
            responses,
            time_window_start
        )
        
        self.assertEqual(correlations_created, 0)


class ConfidenceCorrelationTests(TestCase):
    """Test confidence correlation detection with IntegerField"""

    def setUp(self):
        self.brand = Brand.objects.create(name="Test Brand")
        
        self.user = User.objects.create(
            email="test2@example.com",
            role=User.Role.OWNER
        )
        
        self.account = Account.objects.create(
            name="Test Account",
            brand=self.brand,
            owner=self.user
        )
        
        self.user.account = self.account
        self.user.save()
        
        self.store = Store.objects.create(
            name="Test Store",
            account=self.account,
            brand=self.brand,
            timezone='America/New_York'
        )
        
        self.pulse = EmployeeVoicePulse.objects.create(
            store=self.store,
            account=self.account,
            title="Test Pulse",
            status=EmployeeVoicePulse.Status.ACTIVE,
            created_by=self.user
        )
        
        self.template = MicroCheckTemplate.objects.create(
            brand=self.brand,
            title="Training Check",
            category="TRAINING",
            success_criteria="Training complete",
            created_by=self.user
        )

    def test_confidence_correlation_with_integer_field(self):
        """Test that confidence correlation correctly uses IntegerField values"""
        time_window_start = timezone.now() - timedelta(days=7)

        for i in range(7):
            EmployeeVoiceResponse.objects.create(
                pulse=self.pulse,
                anonymous_hash=f"hash_{i}",
                mood=3,
                confidence=EmployeeVoiceResponse.Confidence.NO,
                bottlenecks=[],
                completed_at=timezone.now()
            )

        for i in range(7, 10):
            EmployeeVoiceResponse.objects.create(
                pulse=self.pulse,
                anonymous_hash=f"hash_{i}",
                mood=3,
                confidence=EmployeeVoiceResponse.Confidence.YES,
                bottlenecks=[],
                completed_at=timezone.now()
            )

        run = MicroCheckRun.objects.create(
            store=self.store,
            scheduled_for=timezone.now().date(),
            created_via='MANUAL',
            store_timezone=self.store.timezone
        )

        # Create assignment for the responses
        assignment = MicroCheckAssignment.objects.create(
            run=run,
            store=self.store,
            sent_to=self.user,
            access_token_hash=hashlib.sha256(b'test_token_2').hexdigest(),
            token_expires_at=timezone.now() + timedelta(days=7)
        )

        # Create 10 templates (4 FAIL + 6 PASS) to comply with unique_together constraint
        templates = []
        for i in range(10):
            template = MicroCheckTemplate.objects.create(
                brand=self.brand,
                title=f"Training Check {i}",
                category="TRAINING",
                success_criteria="Training complete",
                created_by=self.user
            )
            templates.append(template)

            run_item = MicroCheckRunItem.objects.create(
                run=run,
                template=template,
                order=i + 1,
                template_version=template.version,
                title_snapshot=template.title,
                success_criteria_snapshot=template.success_criteria,
                category_snapshot=template.category,
                severity_snapshot=template.severity
            )

            # Create one response per template (4 FAIL + 6 PASS)
            MicroCheckResponse.objects.create(
                run_item=run_item,
                run=run,
                assignment=assignment,
                template=template,
                store=self.store,
                category=template.category,
                severity_snapshot=template.severity,
                status='FAIL' if i < 4 else 'PASS',
                completed_at=timezone.now(),
                completed_by=self.user,
                local_completed_date=timezone.now().date()
            )

        responses = EmployeeVoiceResponse.objects.filter(pulse=self.pulse)

        correlations_created = _analyze_confidence_correlations(
            self.pulse,
            responses,
            time_window_start
        )

        self.assertGreater(correlations_created, 0)

        correlation = CrossVoiceCorrelation.objects.filter(
            pulse=self.pulse,
            correlation_type=CrossVoiceCorrelation.CorrelationType.CONFIDENCE_TO_CHECK_FAIL
        ).first()

        self.assertIsNotNone(correlation)
        self.assertEqual(correlation.check_category, 'TRAINING')

    def test_confidence_correlation_filters_by_integer_not_string(self):
        """Test that confidence filtering uses integer values, not string 'LOW'"""
        time_window_start = timezone.now() - timedelta(days=7)
        
        for i in range(5):
            EmployeeVoiceResponse.objects.create(
                pulse=self.pulse,
                anonymous_hash=f"hash_{i}",
                mood=3,
                confidence=1,
                bottlenecks=[],
                completed_at=timezone.now()
            )
        
        responses = EmployeeVoiceResponse.objects.filter(pulse=self.pulse)
        
        try:
            correlations_created = _analyze_confidence_correlations(
                self.pulse,
                responses,
                time_window_start
            )
            self.assertGreaterEqual(correlations_created, 0)
        except Exception as e:
            self.fail(f"Confidence correlation raised exception: {e}")
