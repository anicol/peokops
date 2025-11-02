"""
Tenant Context Middleware for Row-Level Security.

Sets PostgreSQL session variables for current tenant context to enable
database-level tenant isolation via RLS policies.
"""
from django.db import connection
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
import logging

logger = logging.getLogger(__name__)


class TenantContextMiddleware:
    """
    Middleware to set PostgreSQL session variables for tenant context.
    
    Extracts account_id and role from JWT token and sets them as
    PostgreSQL session variables (app.tenant_id, app.user_role) for
    use in Row-Level Security policies.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_authenticator = JWTAuthentication()
    
    def __call__(self, request):
        account_id = None
        user_role = None
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                try:
                    validated_token = self.jwt_authenticator.get_validated_token(token)
                    account_id = validated_token.get('account_id')
                    user_role = validated_token.get('role')
                except (InvalidToken, Exception) as e:
                    logger.debug(f"Could not extract tenant context from token: {e}")
            
            if account_id is None and hasattr(request.user, 'account'):
                account_id = request.user.account.id if request.user.account else None
            if user_role is None and hasattr(request.user, 'role'):
                user_role = request.user.role
        
        if account_id is not None or user_role is not None:
            try:
                with connection.cursor() as cursor:
                    if account_id is not None:
                        cursor.execute("SET LOCAL app.tenant_id = %s", [str(account_id)])
                    if user_role is not None:
                        cursor.execute("SET LOCAL app.user_role = %s", [user_role])
            except Exception as e:
                logger.error(f"Failed to set tenant context: {e}")
        
        response = self.get_response(request)
        return response
