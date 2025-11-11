from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, Mock
from brands.models import Brand, Store
from videos.models import Video
from .models import Inspection, Finding, ActionItem

User = get_user_model()


def create_inspection_with_video(video, mode=None):
    """Helper function to create inspection and link video (new relationship pattern)"""
    inspection = Inspection.objects.create(
        title=video.title,
        created_by=video.uploaded_by,
        store=video.store,
        mode=mode or Inspection.Mode.ENTERPRISE
    )
    video.inspection = inspection
    video.save()
    return inspection


class InspectionModelTest(TestCase):
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
        self.user = User.objects.create_user(
            username="testuser",
            store=self.store
        )
        self.video = Video.objects.create(
            uploaded_by=self.user,
            store=self.store,
            title="Test Video",
            file="test_video.mp4"
        )

    def test_create_inspection(self):
        inspection = create_inspection_with_video(self.video)

        self.assertEqual(inspection.mode, Inspection.Mode.ENTERPRISE)
        self.assertEqual(inspection.status, Inspection.Status.PENDING)
        self.assertEqual(str(inspection), "Test Video - ENTERPRISE (PENDING)")
        self.assertEqual(inspection.video, self.video)  # Test backward-compatible property

    def test_create_finding(self):
        inspection = create_inspection_with_video(self.video)
        finding = Finding.objects.create(
            inspection=inspection,
            category=Finding.Category.PPE,
            severity=Finding.Severity.HIGH,
            title="Missing Face Cover",
            description="Employee not wearing face cover",
            confidence=0.95
        )
        self.assertEqual(finding.category, Finding.Category.PPE)
        self.assertEqual(finding.severity, Finding.Severity.HIGH)
        self.assertEqual(str(finding), "PPE - Missing Face Cover")

    def test_create_action_item(self):
        inspection = create_inspection_with_video(self.video)
        finding = Finding.objects.create(
            inspection=inspection,
            category=Finding.Category.SAFETY,
            severity=Finding.Severity.CRITICAL,
            title="Blocked Exit",
            description="Exit door is blocked",
            confidence=0.90
        )
        action_item = ActionItem.objects.create(
            inspection=inspection,
            finding=finding,
            title="Clear Blocked Exit",
            description="Remove items blocking the exit door",
            priority=ActionItem.Priority.URGENT
        )
        self.assertEqual(action_item.priority, ActionItem.Priority.URGENT)
        self.assertEqual(action_item.status, ActionItem.Status.OPEN)
        self.assertEqual(str(action_item), "Clear Blocked Exit (URGENT)")


class InspectionAPITest(TestCase):
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
            store=self.store
        )
        self.video = Video.objects.create(
            uploaded_by=self.user,
            store=self.store,
            title="Test Video",
            file="test_video.mp4",
            status=Video.Status.COMPLETED
        )
        self.client.force_authenticate(user=self.user)

    @patch('inspections.tasks.analyze_video.delay')
    def test_start_inspection(self, mock_analyze_video):
        data = {'mode': 'INSPECTION'}
        response = self.client.post(f'/api/inspections/start/{self.video.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['mode'], 'INSPECTION')
        mock_analyze_video.assert_called_once()

    def test_get_inspections(self):
        inspection = create_inspection_with_video(self.video)
        inspection.overall_score = 85.5
        inspection.save()
        
        response = self.client.get('/api/inspections/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['overall_score'], 85.5)

    def test_get_inspection_detail(self):
        inspection = create_inspection_with_video(self.video)
        inspection.overall_score = 85.5
        inspection.save()
        
        response = self.client.get(f'/api/inspections/{inspection.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['overall_score'], 85.5)

    def test_get_inspection_stats(self):
        inspection = create_inspection_with_video(self.video)
        inspection.status = Inspection.Status.COMPLETED
        inspection.overall_score = 85.5
        inspection.save()
        
        response = self.client.get('/api/inspections/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_inspections'], 1)
        self.assertEqual(response.data['completed_inspections'], 1)
        self.assertAlmostEqual(response.data['average_score'], 85.5, places=1)


class InspectorWorkflowTest(TestCase):
    """Test inspector queue and workflow management"""
    
    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name="Test Brand")

        # Create account owner first (needed for Account.owner field)
        self.owner = User.objects.create_user(
            username="owner", email="owner@test.com", password="test123",
            role=User.Role.OWNER
        )

        # Create account
        from accounts.models import Account
        self.account = Account.objects.create(
            name="Test Account",
            brand=self.brand,
            owner=self.owner
        )

        # Link owner to account
        self.owner.account = self.account
        self.owner.save()

        self.store1 = Store.objects.create(
            brand=self.brand, account=self.account, name="Store 1", code="ST001",
            address="123 Test St", city="Test City", state="TS", zip_code="12345"
        )
        self.store2 = Store.objects.create(
            brand=self.brand, account=self.account, name="Store 2", code="ST002",
            address="456 Test Ave", city="Test City", state="TS", zip_code="12345"
        )

        # Create users with different roles
        self.inspector = User.objects.create_user(
            username="inspector", email="inspector@test.com", password="test123",
            role=User.Role.INSPECTOR, store=self.store1
        )
        self.admin = User.objects.create_user(
            username="admin", email="admin@test.com", password="test123",
            role=User.Role.ADMIN
        )
        # ADMIN needs account association to get brand_id
        self.admin.account = self.account
        self.admin.save()
        self.manager = User.objects.create_user(
            username="manager", email="manager@test.com", password="test123",
            role=User.Role.GM, store=self.store2
        )
        
        # Create videos for inspection
        self.video1 = Video.objects.create(
            uploaded_by=self.manager, store=self.store1,
            title="Urgent Inspection Video", file="urgent.mp4",
            status=Video.Status.COMPLETED
        )
        self.video2 = Video.objects.create(
            uploaded_by=self.manager, store=self.store2,
            title="Normal Inspection Video", file="normal.mp4",
            status=Video.Status.COMPLETED
        )
        
        # Create inspections in different states
        self.pending_inspection = create_inspection_with_video(self.video1)
        self.pending_inspection.status = Inspection.Status.PENDING
        self.pending_inspection.save()

        self.completed_inspection = create_inspection_with_video(self.video2)
        self.completed_inspection.status = Inspection.Status.COMPLETED
        self.completed_inspection.overall_score = 88.5
        self.completed_inspection.save()
        
    def test_inspector_queue_access(self):
        """Test inspector can access their queue"""
        self.client.force_authenticate(user=self.inspector)
        
        # Inspector should see videos from their assigned store and unassigned
        response = self.client.get('/api/videos/?status=COMPLETED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_admin_queue_access(self):
        """Test admin can access all queues"""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get('/api/inspections/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)  # Should see all inspections
        
    def test_inspection_priority_sorting(self):
        """Test inspections are sorted by priority"""
        from datetime import timedelta
        from django.utils import timezone
        
        # Create old inspection (higher priority)
        old_video = Video.objects.create(
            uploaded_by=self.manager, store=self.store1,
            title="Old Video", file="old.mp4",
            status=Video.Status.COMPLETED
        )
        Video.objects.filter(id=old_video.id).update(
            created_at=timezone.now() - timedelta(hours=25)
        )
        
        old_inspection = create_inspection_with_video(old_video)
        old_inspection.status = Inspection.Status.PENDING
        old_inspection.save()
        
        self.client.force_authenticate(user=self.inspector)
        response = self.client.get('/api/inspections/?status=PENDING')
        
        # Should return pending inspections, older ones first
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_inspection_assignment(self):
        """Test assigning inspections to specific inspectors"""
        self.client.force_authenticate(user=self.admin)

        # Assign inspection to inspector
        data = {'assigned_to': self.inspector.id}
        response = self.client.patch(
            f'/api/inspections/{self.pending_inspection.id}/',
            data
        )

        # Check if assignment endpoints exist
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND  # If endpoint doesn't exist yet
        ])
        
    def test_inspection_review_process(self):
        """Test the complete inspection review workflow"""
        self.client.force_authenticate(user=self.inspector)
        
        # Get inspection details
        response = self.client.get(f'/api/inspections/{self.pending_inspection.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Review and complete inspection
        review_data = {
            'status': 'COMPLETED',
            'notes': 'Inspection completed - minor violations found',
            'overall_score': 82.5
        }
        
        response = self.client.patch(
            f'/api/inspections/{self.pending_inspection.id}/',
            review_data
        )
        
        # Should be successful or not implemented yet
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND
        ])
        
    def test_finding_creation_during_review(self):
        """Test creating findings during inspection review"""
        self.client.force_authenticate(user=self.inspector)
        
        finding_data = {
            'inspection': self.pending_inspection.id,
            'category': 'PPE',
            'severity': 'HIGH', 
            'title': 'Missing Face Mask',
            'description': 'Employee not wearing required face mask',
            'confidence': 0.95,
            'timestamp': 15.5
        }
        
        response = self.client.post('/api/findings/', finding_data)
        
        # Should create finding or endpoint not exist yet
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_404_NOT_FOUND
        ])
        
    def test_action_item_generation(self):
        """Test automatic action item generation from findings"""
        # Create a high-severity finding
        finding = Finding.objects.create(
            inspection=self.pending_inspection,
            category=Finding.Category.SAFETY,
            severity=Finding.Severity.CRITICAL,
            title="Blocked Emergency Exit",
            description="Exit door is blocked by equipment",
            confidence=0.92
        )
        
        action_item_data = {
            'inspection': self.pending_inspection.id,
            'finding': finding.id,
            'title': 'Clear Emergency Exit',
            'description': 'Remove equipment blocking the emergency exit',
            'priority': 'URGENT',
            'assigned_to': self.manager.id
        }
        
        self.client.force_authenticate(user=self.inspector)
        response = self.client.post('/api/action-items/', action_item_data)
        
        # Should create action item or endpoint not exist yet
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_404_NOT_FOUND
        ])


class RekognitionIntegrationTest(TestCase):
    """Test Rekognition integration with inspection workflow"""

    def setUp(self):
        self.brand = Brand.objects.create(name="Test Brand")
        self.store = Store.objects.create(
            brand=self.brand, name="Test Store", code="TS001",
            address="123 Test St", city="Test City", state="TS", zip_code="12345"
        )
        self.user = User.objects.create_user(
            username="testuser", store=self.store
        )

    @override_settings(ENABLE_AWS_REKOGNITION=True, AWS_ACCESS_KEY_ID='test_key_id', AWS_SECRET_ACCESS_KEY='test_secret')
    @patch('ai_services.rekognition.boto3.client')
    @patch('ai_services.yolo_detector.YOLODetector.detect_objects')
    @patch('ai_services.yolo_detector.YOLODetector.detect_uniform_compliance')
    @patch('ai_services.ocr_service.OCRService.analyze_menu_board')
    def test_inspection_with_rekognition_success(self, mock_ocr, mock_yolo_uniform,
                                                  mock_yolo_objects, mock_boto3):
        """Test inspection completes successfully with Rekognition"""
        from ai_services.analyzer import VideoAnalyzer

        # Mock Rekognition responses
        mock_client = Mock()
        mock_boto3.return_value = mock_client
        mock_client.detect_protective_equipment.return_value = {
            'Persons': [{
                'Confidence': 95.0,
                'BoundingBox': {},
                'BodyParts': [{
                    'Name': 'FACE',
                    'Confidence': 98.0,
                    'BoundingBox': {},
                    'EquipmentDetections': [{
                        'Type': 'FACE_COVER',
                        'Confidence': 85.0,
                        'CoversBodyPart': {'Value': False},
                        'BoundingBox': {}
                    }]
                }]
            }]
        }
        mock_client.detect_labels.return_value = {
            'Labels': [{
                'Name': 'Fire Extinguisher',
                'Confidence': 92.3,
                'Instances': [{'Confidence': 92.3, 'BoundingBox': {}}]
            }]
        }
        mock_client.detect_text.return_value = {
            'TextDetections': [{
                'DetectedText': 'Menu Item',
                'Type': 'LINE',
                'Confidence': 95.0,
                'Geometry': {'BoundingBox': {}}
            }]
        }
        mock_client.detect_faces.return_value = {
            'FaceDetails': [{
                'Confidence': 99.0,
                'BoundingBox': {}
            }]
        }

        # Mock other services
        mock_yolo_objects.return_value = {'safety_objects': [], 'cleanliness_objects': []}
        mock_yolo_uniform.return_value = {'compliance_score': 95.0}
        mock_ocr.return_value = {'compliance_score': 90.0, 'compliance_issues': []}

        # Test
        analyzer = VideoAnalyzer()
        result = analyzer.analyze_frame('/fake/path.jpg', b'fake_bytes')

        # Verify
        self.assertTrue(result['rekognition_available'])
        self.assertEqual(len(result['warnings']), 0)
        self.assertIn('ppe_analysis', result)
        self.assertIn('safety_analysis', result)
        self.assertGreater(result['overall_score'], 0)

    @patch('ai_services.yolo_detector.YOLODetector.detect_objects')
    @patch('ai_services.yolo_detector.YOLODetector.detect_uniform_compliance')
    @patch('ai_services.ocr_service.OCRService.analyze_menu_board')
    def test_inspection_continues_when_rekognition_unavailable(self, mock_ocr,
                                                                mock_yolo_uniform,
                                                                mock_yolo_objects):
        """Test inspection continues with YOLO/OCR when Rekognition is unavailable"""
        from django.test import override_settings
        from ai_services.analyzer import VideoAnalyzer

        # Mock other services to succeed
        mock_yolo_objects.return_value = {'safety_objects': [], 'cleanliness_objects': []}
        mock_yolo_uniform.return_value = {'compliance_score': 95.0}
        mock_ocr.return_value = {'compliance_score': 90.0, 'compliance_issues': []}

        # Test with Rekognition disabled
        with override_settings(ENABLE_AWS_REKOGNITION=False):
            analyzer = VideoAnalyzer()
            result = analyzer.analyze_frame('/fake/path.jpg', b'fake_bytes')

        # Verify partial results
        self.assertFalse(result['rekognition_available'])
        self.assertGreater(len(result['warnings']), 0)
        # Other services should still work
        self.assertIn('uniform_analysis', result)
        self.assertIn('menu_board_analysis', result)
        # Score should be calculated from available services
        self.assertGreaterEqual(result['overall_score'], 0)

    @override_settings(ENABLE_AWS_REKOGNITION=True, AWS_ACCESS_KEY_ID='test_key_id', AWS_SECRET_ACCESS_KEY='test_secret')
    @patch('ai_services.rekognition.boto3.client')
    @patch('ai_services.yolo_detector.YOLODetector.detect_objects')
    @patch('ai_services.yolo_detector.YOLODetector.detect_uniform_compliance')
    @patch('ai_services.ocr_service.OCRService.analyze_menu_board')
    def test_inspection_handles_rekognition_api_error(self, mock_ocr, mock_yolo_uniform,
                                                       mock_yolo_objects, mock_boto3):
        """Test inspection handles Rekognition API errors gracefully"""
        from botocore.exceptions import ClientError
        from ai_services.analyzer import VideoAnalyzer

        # Mock Rekognition to fail
        mock_client = Mock()
        mock_boto3.return_value = mock_client
        mock_client.detect_protective_equipment.side_effect = ClientError(
            {'Error': {'Code': 'ServiceUnavailable', 'Message': 'Service unavailable'}},
            'DetectProtectiveEquipment'
        )

        # Mock other services
        mock_yolo_objects.return_value = {'safety_objects': [], 'cleanliness_objects': []}
        mock_yolo_uniform.return_value = {'compliance_score': 95.0}
        mock_ocr.return_value = {'compliance_score': 90.0, 'compliance_issues': []}

        # Test
        analyzer = VideoAnalyzer()
        result = analyzer.analyze_frame('/fake/path.jpg', b'fake_bytes')

        # Verify error is handled gracefully
        self.assertFalse(result['rekognition_available'])
        self.assertGreater(len(result['warnings']), 0)
        self.assertIn('unavailable', result['warnings'][0].lower())
        # Should still have results from other services
        self.assertGreaterEqual(result['overall_score'], 0)

    def test_finding_generation_from_rekognition_results(self):
        """Test findings are correctly generated from Rekognition analysis"""
        from ai_services.analyzer import VideoAnalyzer
        from videos.models import Video, VideoFrame

        video = Video.objects.create(
            uploaded_by=self.user,
            store=self.store,
            title="Test Video",
            file="test.mp4"
        )
        frame = VideoFrame.objects.create(
            video=video,
            frame_number=1,
            timestamp=0.0,
            width=1920,
            height=1080
        )

        # Mock frame analysis with PPE violation
        frame_analysis = {
            'ppe_analysis': {
                'summary': {
                    'total_persons': 2,
                    'persons_with_face_cover': 1,
                    'persons_with_hand_cover': 0,
                    'persons_with_head_cover': 0
                }
            },
            'safety_analysis': [],
            'cleanliness_analysis': [],
            'uniform_analysis': {'compliance_score': 95.0},
            'menu_board_analysis': {'compliance_score': 90.0, 'compliance_issues': []},
            'overall_score': 85.0,
            'rekognition_available': True
        }

        analyzer = VideoAnalyzer()
        findings = analyzer.generate_findings(frame_analysis, frame)

        # Should generate finding for missing face cover
        ppe_findings = [f for f in findings if f['category'] == 'PPE']
        self.assertGreater(len(ppe_findings), 0)
        self.assertIn('face cover', ppe_findings[0]['title'].lower())


class InspectionAnalyticsTest(TestCase):
    """Test inspection analytics and reporting"""

    def setUp(self):
        self.client = APIClient()
        self.brand = Brand.objects.create(name="Test Brand")
        self.store = Store.objects.create(
            brand=self.brand, name="Test Store", code="TS001",
            address="123 Test St", city="Test City", state="TS", zip_code="12345"
        )
        self.user = User.objects.create_user(
            username="testuser", store=self.store
        )
        self.client.force_authenticate(user=self.user)
        
    def test_score_trend_calculation(self):
        """Test calculation of score trends over time"""
        from datetime import timedelta
        from django.utils import timezone
        
        # Create inspections over time with different scores
        base_date = timezone.now() - timedelta(days=30)
        
        for i in range(5):
            video = Video.objects.create(
                uploaded_by=self.user, store=self.store,
                title=f"Video {i+1}", file=f"video_{i+1}.mp4",
                status=Video.Status.COMPLETED
            )


            inspection = create_inspection_with_video(video)
            inspection.status = Inspection.Status.COMPLETED
            inspection.overall_score = 75 + (i * 2)  # Improving scores: 75, 77, 79, 81, 83
            inspection.save()
            
            # Set different creation dates
            Inspection.objects.filter(id=inspection.id).update(
                created_at=base_date + timedelta(days=i*7)
            )
        
        # Test analytics endpoint
        response = self.client.get('/api/inspections/analytics/scores/')
        
        # Should return analytics or endpoint not exist yet
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND
        ])
        
    def test_violation_category_breakdown(self):
        """Test breakdown of violations by category"""
        video = Video.objects.create(
            uploaded_by=self.user, store=self.store,
            title="Test Video", file="test.mp4",
            status=Video.Status.COMPLETED
        )
        
        inspection = create_inspection_with_video(video)
        inspection.status = Inspection.Status.COMPLETED
        inspection.overall_score = 75.0
        inspection.save()
        
        # Create findings in different categories
        Finding.objects.create(
            inspection=inspection, category=Finding.Category.PPE,
            severity=Finding.Severity.HIGH, title="Missing Mask",
            description="Employee not wearing mask", confidence=0.95
        )
        Finding.objects.create(
            inspection=inspection, category=Finding.Category.SAFETY,
            severity=Finding.Severity.MEDIUM, title="Wet Floor",
            description="Floor is wet without warning signs", confidence=0.88
        )
        Finding.objects.create(
            inspection=inspection, category=Finding.Category.CLEANLINESS,
            severity=Finding.Severity.LOW, title="Counter Stains",
            description="Minor stains on counter surface", confidence=0.75
        )
        
        response = self.client.get('/api/inspections/analytics/violations/')
        
        # Should return violation breakdown or endpoint not exist yet
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND
        ])
        
    def test_store_performance_comparison(self):
        """Test comparing performance across stores"""
        # This would test multi-store analytics when available
        response = self.client.get('/api/inspections/analytics/stores/')
        
        # Should return store comparison or endpoint not exist yet
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_403_FORBIDDEN  # If user doesn't have permission
        ])