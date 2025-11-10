"""
Tenant context middleware.

Attaches tenant context to each request and sets Sentry tags for observability.
"""
from accounts.jwt_utils import get_impersonation_context_from_request
from .utils import tenant_ids, determine_scope


class TenantContextMiddleware:
    """
    Middleware to attach tenant context to each request.
    
    Sets request.tenant with brand_id, account_id, store_id, and scope.
    Handles impersonation by using the impersonated user's tenant.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            impersonation_ctx = get_impersonation_context_from_request(request)
            
            effective_user = request.user
            
            request.tenant = {
                **tenant_ids(effective_user),
                'scope': determine_scope(effective_user),
                'is_impersonating': bool(impersonation_ctx),
                'original_user_id': impersonation_ctx['original_user_id'] if impersonation_ctx else None
            }
            
            try:
                import sentry_sdk
                sentry_sdk.set_tag('tenant.brand_id', request.tenant['brand_id'])
                sentry_sdk.set_tag('tenant.account_id', request.tenant['account_id'])
                sentry_sdk.set_tag('tenant.store_id', request.tenant['store_id'])
                sentry_sdk.set_tag('tenant.scope', request.tenant['scope'])
                if request.tenant['is_impersonating']:
                    sentry_sdk.set_tag('impersonation', True)
            except ImportError:
                pass
        else:
            request.tenant = None
        
        response = self.get_response(request)
        return response
