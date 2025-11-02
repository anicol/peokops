"""
Custom JWT token generation with tenant context for RLS.
"""
from rest_framework_simplejwt.tokens import RefreshToken


def get_tokens_with_tenant_context(user):
    """
    Generate JWT tokens with tenant context for Row-Level Security.
    
    Adds account_id, brand_id, and role to ACCESS token claims for use in
    database-level tenant isolation via PostgreSQL RLS policies.
    
    Note: Tenant claims are only added to the access token, not the refresh token.
    This ensures OutstandingToken tracking works correctly for JWT blacklisting.
    
    Args:
        user: User instance
        
    Returns:
        dict: {'refresh': str, 'access': str} with tenant-aware access token
    """
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    
    if user.account:
        access['account_id'] = user.account.id
        access['brand_id'] = user.account.brand.id if user.account.brand else None
    else:
        access['account_id'] = None
        access['brand_id'] = None
    
    access['role'] = user.role
    
    return {
        'refresh': str(refresh),
        'access': str(access),
    }
