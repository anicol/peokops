"""
Structured logging utilities for PeakOps.

Provides JSON formatting and request ID tracking for centralized log aggregation.
"""
import json
import logging
import uuid
from datetime import datetime
from django.utils.deprecation import MiddlewareMixin


class RequestIdMiddleware(MiddlewareMixin):
    """
    Middleware to generate and attach a unique request ID to each request.
    
    The request ID is used for correlation across logs, making it easier to
    trace a single request through the system.
    """
    
    def process_request(self, request):
        """Generate a unique request ID for this request"""
        request_id = request.META.get('HTTP_X_REQUEST_ID')
        if not request_id:
            request_id = str(uuid.uuid4())
        
        request.request_id = request_id
        return None
    
    def process_response(self, request, response):
        """Add request ID to response headers"""
        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = request.request_id
        return response


class RequestIdFilter(logging.Filter):
    """
    Logging filter that adds request ID to log records.
    
    This allows correlation of all logs for a single request.
    """
    
    def filter(self, record):
        """Add request_id to log record if available"""
        from django.core.handlers.wsgi import WSGIRequest
        
        try:
            from django.http import HttpRequest
            import threading
            
            for frame_record in threading.current_thread()._target.__self__.__dict__.values():
                if isinstance(frame_record, (HttpRequest, WSGIRequest)):
                    if hasattr(frame_record, 'request_id'):
                        record.request_id = frame_record.request_id
                        return True
        except:
            pass
        
        record.request_id = None
        return True


class JsonFormatter(logging.Formatter):
    """
    JSON formatter for structured logging.
    
    Outputs logs in JSON format for easy parsing by log aggregation systems
    like CloudWatch, Datadog, or ELK stack.
    """
    
    def format(self, record):
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        if hasattr(record, 'request_id') and record.request_id:
            log_data['request_id'] = record.request_id
        
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        
        if hasattr(record, 'account_id'):
            log_data['account_id'] = record.account_id
        
        if hasattr(record, 'brand_id'):
            log_data['brand_id'] = record.brand_id
        
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        if hasattr(record, 'extra_data'):
            log_data['extra'] = record.extra_data
        
        return json.dumps(log_data)
