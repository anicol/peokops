"""
Custom JWT token generation with tenant context for RLS.
"""
from rest_framework_simplejwt.tokens import RefreshToken


def get_tokens_with_tenant_context(user):
    """
    Generate JWT tokens with tenant context for Row-Level Security.
    
    Adds account_id, brand_id, and role to token claims for use in
    database-level tenant isolation via PostgreSQL RLS policies.
    
    Args:
        user: User instance
        
    Returns:
        dict: {'refresh': str, 'access': str} with tenant-aware tokens
    """
    refresh = RefreshToken.for_user(user)
    
    if user.account:
        refresh['account_id'] = user.account.id
        refresh['brand_id'] = user.account.brand.id if user.account.brand else None
    else:
        refresh['account_id'] = None
        refresh['brand_id'] = None
    
    refresh['role'] = user.role
    
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }
