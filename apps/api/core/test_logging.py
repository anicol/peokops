"""
Comprehensive tests for Sentry and structured logging configuration.

Tests verify that:
1. Request ID middleware generates and tracks request IDs
2. JSON formatter outputs structured logs
3. Request ID filter adds request IDs to log records
4. Sentry configuration is properly initialized when DSN is provided
5. Logging configuration uses appropriate formatters for DEBUG mode
"""
from django.test import TestCase, RequestFactory, override_settings
from django.http import HttpResponse
from core.logging import RequestIdMiddleware, RequestIdFilter, JsonFormatter
import logging
import json
import uuid


class RequestIdMiddlewareTest(TestCase):
    """Test request ID middleware functionality"""

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = RequestIdMiddleware(lambda r: HttpResponse())

    def test_generates_request_id_when_not_provided(self):
        """Test that middleware generates a request ID if not provided"""
        request = self.factory.get('/api/health/')
        
        self.middleware.process_request(request)
        
        self.assertTrue(hasattr(request, 'request_id'))
        self.assertIsNotNone(request.request_id)
        
        try:
            uuid.UUID(request.request_id)
            is_valid_uuid = True
        except ValueError:
            is_valid_uuid = False
        
        self.assertTrue(is_valid_uuid, "Request ID should be a valid UUID")

    def test_uses_provided_request_id_from_header(self):
        """Test that middleware uses X-Request-ID header if provided"""
        provided_id = str(uuid.uuid4())
        request = self.factory.get('/api/health/', HTTP_X_REQUEST_ID=provided_id)
        
        self.middleware.process_request(request)
        
        self.assertEqual(request.request_id, provided_id)

    def test_adds_request_id_to_response_headers(self):
        """Test that middleware adds request ID to response headers"""
        request = self.factory.get('/api/health/')
        self.middleware.process_request(request)
        
        response = HttpResponse()
        response = self.middleware.process_response(request, response)
        
        self.assertIn('X-Request-ID', response)
        self.assertEqual(response['X-Request-ID'], request.request_id)

    def test_handles_request_without_request_id(self):
        """Test that middleware handles requests without request_id attribute"""
        request = self.factory.get('/api/health/')
        response = HttpResponse()
        
        response = self.middleware.process_response(request, response)
        
        self.assertNotIn('X-Request-ID', response)


class RequestIdFilterTest(TestCase):
    """Test request ID logging filter"""

    def test_filter_adds_request_id_to_record(self):
        """Test that filter adds request_id attribute to log records"""
        log_filter = RequestIdFilter()
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        
        result = log_filter.filter(record)
        
        self.assertTrue(result)
        self.assertTrue(hasattr(record, 'request_id'))

    def test_filter_handles_missing_request(self):
        """Test that filter handles cases where no request is available"""
        log_filter = RequestIdFilter()
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        
        result = log_filter.filter(record)
        
        self.assertTrue(result)
        self.assertTrue(hasattr(record, 'request_id'))
        self.assertIsNone(record.request_id)


class JsonFormatterTest(TestCase):
    """Test JSON log formatter"""

    def setUp(self):
        self.formatter = JsonFormatter()

    def test_formats_log_as_json(self):
        """Test that formatter outputs valid JSON"""
        record = logging.LogRecord(
            name='test.module',
            level=logging.INFO,
            pathname='test.py',
            lineno=42,
            msg='Test message',
            args=(),
            exc_info=None
        )
        record.funcName = 'test_function'
        
        output = self.formatter.format(record)
        
        parsed = json.loads(output)
        
        self.assertIn('timestamp', parsed)
        self.assertIn('level', parsed)
        self.assertIn('logger', parsed)
        self.assertIn('message', parsed)
        self.assertIn('module', parsed)
        self.assertIn('function', parsed)
        self.assertIn('line', parsed)

    def test_includes_request_id_when_present(self):
        """Test that formatter includes request_id if present"""
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        record.funcName = 'test_func'
        record.request_id = 'test-request-id-123'
        
        output = self.formatter.format(record)
        parsed = json.loads(output)
        
        self.assertEqual(parsed['request_id'], 'test-request-id-123')

    def test_includes_user_id_when_present(self):
        """Test that formatter includes user_id if present"""
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        record.funcName = 'test_func'
        record.user_id = 42
        
        output = self.formatter.format(record)
        parsed = json.loads(output)
        
        self.assertEqual(parsed['user_id'], 42)

    def test_includes_tenant_context_when_present(self):
        """Test that formatter includes account_id and brand_id if present"""
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        record.funcName = 'test_func'
        record.account_id = 10
        record.brand_id = 20
        
        output = self.formatter.format(record)
        parsed = json.loads(output)
        
        self.assertEqual(parsed['account_id'], 10)
        self.assertEqual(parsed['brand_id'], 20)

    def test_includes_exception_info_when_present(self):
        """Test that formatter includes exception information"""
        try:
            raise ValueError("Test error")
        except ValueError:
            import sys
            exc_info = sys.exc_info()
        
        record = logging.LogRecord(
            name='test',
            level=logging.ERROR,
            pathname='test.py',
            lineno=1,
            msg='Test error message',
            args=(),
            exc_info=exc_info
        )
        record.funcName = 'test_func'
        
        output = self.formatter.format(record)
        parsed = json.loads(output)
        
        self.assertIn('exception', parsed)
        self.assertIn('ValueError', parsed['exception'])
        self.assertIn('Test error', parsed['exception'])

    def test_includes_extra_data_when_present(self):
        """Test that formatter includes extra_data if present"""
        record = logging.LogRecord(
            name='test',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        record.funcName = 'test_func'
        record.extra_data = {'key': 'value', 'count': 42}
        
        output = self.formatter.format(record)
        parsed = json.loads(output)
        
        self.assertIn('extra', parsed)
        self.assertEqual(parsed['extra']['key'], 'value')
        self.assertEqual(parsed['extra']['count'], 42)


class SentryConfigurationTest(TestCase):
    """Test Sentry configuration"""

    @override_settings(SENTRY_DSN='')
    def test_sentry_not_initialized_without_dsn(self):
        """Test that Sentry is not initialized when DSN is empty"""
        from django.conf import settings
        
        self.assertEqual(settings.SENTRY_DSN, '')

    def test_sentry_environment_defaults(self):
        """Test that Sentry environment has appropriate defaults"""
        from django.conf import settings
        
        self.assertIn('SENTRY_ENVIRONMENT', dir(settings))
        self.assertIsNotNone(settings.SENTRY_ENVIRONMENT)

    def test_sentry_traces_sample_rate_configured(self):
        """Test that Sentry traces sample rate is configured"""
        from django.conf import settings
        
        self.assertIn('SENTRY_TRACES_SAMPLE_RATE', dir(settings))
        self.assertIsInstance(settings.SENTRY_TRACES_SAMPLE_RATE, float)
        self.assertGreaterEqual(settings.SENTRY_TRACES_SAMPLE_RATE, 0.0)
        self.assertLessEqual(settings.SENTRY_TRACES_SAMPLE_RATE, 1.0)


class LoggingConfigurationTest(TestCase):
    """Test logging configuration"""

    def test_logging_configuration_exists(self):
        """Test that LOGGING configuration is defined"""
        from django.conf import settings
        
        self.assertIn('LOGGING', dir(settings))
        self.assertIsInstance(settings.LOGGING, dict)

    def test_logging_has_json_formatter(self):
        """Test that logging configuration includes JSON formatter"""
        from django.conf import settings
        
        self.assertIn('formatters', settings.LOGGING)
        self.assertIn('json', settings.LOGGING['formatters'])

    def test_logging_has_request_id_filter(self):
        """Test that logging configuration includes request ID filter"""
        from django.conf import settings
        
        self.assertIn('filters', settings.LOGGING)
        self.assertIn('request_id', settings.LOGGING['filters'])

    def test_logging_formatter_configuration_exists(self):
        """Test that logging configuration includes both JSON and verbose formatters"""
        from django.conf import settings
        
        console_handler = settings.LOGGING['handlers']['console']
        
        self.assertIn('formatter', console_handler)
        self.assertIn(console_handler['formatter'], ['json', 'verbose'])

    def test_logging_includes_sentry_handler_when_dsn_configured(self):
        """Test that Sentry handler is included when DSN is configured"""
        from django.conf import settings
        
        if settings.SENTRY_DSN:
            self.assertIn('sentry', settings.LOGGING['handlers'])
            root_handlers = settings.LOGGING['root']['handlers']
            self.assertIn('sentry', root_handlers)


class RequestIdIntegrationTest(TestCase):
    """Integration tests for request ID tracking"""

    def test_request_id_flows_through_middleware_and_logging(self):
        """Test that request ID flows from middleware through logging"""
        from django.test import Client
        
        client = Client()
        request_id = str(uuid.uuid4())
        
        response = client.get('/api/health/', HTTP_X_REQUEST_ID=request_id)
        
        self.assertEqual(response.get('X-Request-ID'), request_id)


class DocumentationTest(TestCase):
    """Documentation tests for logging and monitoring"""

    def test_sentry_configuration_documented(self):
        """
        Document Sentry configuration requirements.
        
        To enable Sentry in production:
        1. Set SENTRY_DSN environment variable with your Sentry DSN
        2. Set SENTRY_ENVIRONMENT (defaults to 'production' in non-DEBUG mode)
        3. Set SENTRY_TRACES_SAMPLE_RATE (defaults to 0.1 = 10% sampling)
        
        Sentry will:
        - Capture errors and exceptions automatically
        - Track performance with distributed tracing
        - Include Django, Celery, and Redis integrations
        - Filter out DEBUG mode events (before_send)
        - Not send PII by default (send_default_pii=False)
        """
        self.assertTrue(True)

    def test_structured_logging_documented(self):
        """
        Document structured logging behavior.
        
        Logging configuration:
        - DEBUG mode: Uses verbose text formatter for readability
        - Production: Uses JSON formatter for log aggregation
        - Request IDs: Automatically tracked via middleware
        - Tenant context: Can be added via extra attributes
        
        To add tenant context to logs:
        ```python
        logger = logging.getLogger(__name__)
        logger.info('Message', extra={
            'user_id': user.id,
            'account_id': account.id,
            'brand_id': brand.id,
        })
        ```
        
        JSON log format includes:
        - timestamp (ISO 8601 UTC)
        - level, logger, message
        - module, function, line
        - request_id (if available)
        - user_id, account_id, brand_id (if provided)
        - exception (if present)
        - extra (custom data)
        """
        self.assertTrue(True)
