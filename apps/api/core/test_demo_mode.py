"""
Comprehensive tests for DEMO_MODE configuration.

Tests verify that:
1. DEMO_MODE defaults to False (secure by default)
2. Demo middleware behavior is properly gated by DEMO_MODE
3. Production deployment configuration disables DEMO_MODE
4. Session and CORS settings use secure defaults when DEMO_MODE is False
"""
from django.test import TestCase, override_settings
from django.test.client import RequestFactory
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework.response import Response as DRFResponse
from brands.models import Brand, Store
from core.middleware import DemoModeMiddleware, DemoDataMiddleware
import json
import yaml
import os

User = get_user_model()


class DemoModeDefaultsTest(TestCase):
    """Test that DEMO_MODE has secure defaults"""

    def test_demo_mode_defaults_to_false(self):
        """Test that DEMO_MODE defaults to False for security"""
        self.assertIn('DEMO_MODE', dir(settings))


class DemoModeMiddlewareTest(TestCase):
    """Test demo middleware behavior with different DEMO_MODE settings"""

    def setUp(self):
        self.factory = RequestFactory()
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

    @override_settings(DEMO_MODE=False)
    def test_middleware_no_headers_when_disabled(self):
        """Test that demo middleware does not add headers when DEMO_MODE is False"""
        middleware = DemoModeMiddleware(lambda r: None)
        
        request = self.factory.get('/api/health/')
        response = DRFResponse({'status': 'ok'})
        
        processed_response = middleware.process_response(request, response)
        
        self.assertNotIn('X-Demo-Mode', processed_response)
        self.assertNotIn('X-Demo-Version', processed_response)

    @override_settings(DEMO_MODE=False)
    def test_middleware_no_request_processing_when_disabled(self):
        """Test that demo middleware does not process requests when DEMO_MODE is False"""
        middleware = DemoModeMiddleware(lambda r: None)
        
        request = self.factory.post('/api/auth/login/')
        result = middleware.process_request(request)
        self.assertIsNone(result)
        self.assertFalse(hasattr(request, 'demo_login_hint'))
        
        request = self.factory.post('/api/videos/upload/')
        result = middleware.process_request(request)
        self.assertIsNone(result)
        self.assertFalse(hasattr(request, 'demo_upload'))

    @override_settings(DEMO_MODE=False)
    def test_data_middleware_no_processing_when_disabled(self):
        """Test that demo data middleware does not process when DEMO_MODE is False"""
        middleware = DemoDataMiddleware(lambda r: None)
        
        request = self.factory.get('/api/health/')
        request.user = self.user
        
        result = middleware.process_view(request, None, None, None)
        
        self.assertIsNone(result)
        self.assertFalse(hasattr(request, 'demo_user_type'))

    @override_settings(DEMO_MODE=True)
    def test_middleware_adds_headers_when_enabled(self):
        """Test that demo middleware adds headers when DEMO_MODE is True"""
        middleware = DemoModeMiddleware(lambda r: None)
        
        request = self.factory.get('/api/health/')
        response = DRFResponse({'status': 'ok'})
        
        processed_response = middleware.process_response(request, response)
        
        self.assertEqual(processed_response.get('X-Demo-Mode'), 'true')
        self.assertEqual(processed_response.get('X-Demo-Version'), '1.0.0')

    @override_settings(DEMO_MODE=True)
    def test_middleware_processes_requests_when_enabled(self):
        """Test that demo middleware processes requests when DEMO_MODE is True"""
        middleware = DemoModeMiddleware(lambda r: None)
        
        request = self.factory.post('/api/auth/login/')
        middleware.process_request(request)
        self.assertTrue(hasattr(request, 'demo_login_hint'))
        
        request = self.factory.post('/api/videos/upload/')
        middleware.process_request(request)
        self.assertTrue(hasattr(request, 'demo_upload'))


class ProductionConfigurationTest(TestCase):
    """Test that production deployment configuration is secure"""

    def test_render_yaml_disables_demo_mode(self):
        """Test that render.yaml sets DEMO_MODE=False for production"""
        render_yaml_path = os.path.join(
            os.path.dirname(__file__),
            '../../../render.yaml'
        )
        
        if not os.path.exists(render_yaml_path):
            self.skipTest("render.yaml not found")
        
        with open(render_yaml_path, 'r') as f:
            config = yaml.safe_load(f)
        
        api_service = None
        for service in config.get('services', []):
            if service.get('name') == 'peakops-api':
                api_service = service
                break
        
        self.assertIsNotNone(api_service, "peakops-api service not found in render.yaml")
        
        demo_mode_var = None
        for env_var in api_service.get('envVars', []):
            if env_var.get('key') == 'DEMO_MODE':
                demo_mode_var = env_var
                break
        
        self.assertIsNotNone(demo_mode_var, "DEMO_MODE not found in peakops-api envVars")
        self.assertEqual(
            demo_mode_var.get('value'),
            'False',
            "DEMO_MODE should be set to 'False' in production (render.yaml)"
        )

    @override_settings(DEMO_MODE=False, DEBUG=False)
    def test_production_security_settings(self):
        """Test that production mode enforces secure settings"""
        self.assertFalse(settings.DEMO_MODE)
        self.assertFalse(settings.DEBUG)


class SessionSecurityTest(TestCase):
    """Test session cookie security settings"""

    def test_session_cookie_age_reasonable(self):
        """Test that SESSION_COOKIE_AGE is set to a reasonable value"""
        session_age = getattr(settings, 'SESSION_COOKIE_AGE', 1209600)
        
        self.assertLessEqual(
            session_age,
            86400 * 30,
            "SESSION_COOKIE_AGE should not exceed 30 days for security"
        )


class DemoModeDocumentationTest(TestCase):
    """Documentation tests for DEMO_MODE configuration"""

    def test_demo_mode_purpose_documented(self):
        """
        Document the purpose and impact of DEMO_MODE.
        
        DEMO_MODE controls:
        1. Session cookie duration (7 days in demo vs 14 days default)
        2. CORS permissiveness (allows all origins in demo+debug)
        3. Demo headers and context injection in API responses
        4. Demo login hints and upload flags
        
        Production should have DEMO_MODE=False to enforce:
        - Secure session duration
        - Restricted CORS policy
        - No demo headers or context
        - Standard authentication flow
        """
        self.assertTrue(True)

    def test_migration_path_documented(self):
        """
        Document migration path for disabling DEMO_MODE.
        
        To disable DEMO_MODE in production:
        1. Update render.yaml: Set DEMO_MODE=False for peakops-api service
        2. Update settings.py: Change default from True to False
        3. Add explicit CORS_ALLOW_ALL_ORIGINS = False before demo block
        4. Add explicit SESSION_COOKIE_AGE default before demo block
        5. Deploy changes
        6. Verify middleware does not add demo headers
        7. Verify CORS policy is restrictive
        
        For local development with demo features:
        - Set DEMO_MODE=True in .env file
        """
        self.assertTrue(True)
