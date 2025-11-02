"""
Demo mode middleware for VerityInspect
"""
from django.conf import settings
from django.http import JsonResponse
from django.urls import reverse
from django.utils.deprecation import MiddlewareMixin


class DemoModeMiddleware(MiddlewareMixin):
    """
    Middleware to enhance demo mode experience
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.demo_messages = {
            'login': 'Demo Mode: Use username "admin", "manager", or "inspector" with password "demo123"',
            'upload_limit': 'Demo Mode: File uploads are limited to 50MB and processed with mock AI',
            'data_retention': 'Demo Mode: Data is automatically cleaned up after 7 days',
            'features': 'Demo Mode: Some features use simulated data for demonstration purposes'
        }
    
    def process_response(self, request, response):
        """Add demo mode headers to API responses"""
        if not settings.DEMO_MODE:
            return response
            
        # Add demo mode headers for API endpoints
        if request.path.startswith('/api/'):
            response['X-Demo-Mode'] = 'true'
            response['X-Demo-Version'] = '1.0.0'
            
            # Add demo context to JSON responses
            if (response.get('Content-Type', '').startswith('application/json') and 
                hasattr(response, 'data')):
                try:
                    import json
                    data = json.loads(response.content.decode())
                    
                    # Add demo context to response
                    if isinstance(data, dict):
                        data['_demo'] = {
                            'mode': True,
                            'message': 'This is demo data for demonstration purposes'
                        }
                        
                        response.content = json.dumps(data).encode()
                except:
                    pass  # Don't break if JSON parsing fails
        
        return response
    
    def process_request(self, request):
        """Process demo mode specific requests"""
        if not settings.DEMO_MODE:
            return None
            
        # Auto-populate demo credentials hint for login
        if request.path == '/api/auth/login/' and request.method == 'POST':
            request.demo_login_hint = self.demo_messages['login']
        
        # Mock expensive operations in demo mode
        if request.path.startswith('/api/videos/') and request.method == 'POST':
            # Add demo upload context
            request.demo_upload = True
        
        return None


class DemoDataMiddleware(MiddlewareMixin):
    """
    Middleware to inject demo-specific data context
    """
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """Add demo context to request"""
        if not settings.DEMO_MODE:
            return None
            
        # Add demo user context
        if hasattr(request, 'user') and request.user.is_authenticated:
            request.demo_user_type = getattr(request.user, 'role', 'UNKNOWN')
        
        return None