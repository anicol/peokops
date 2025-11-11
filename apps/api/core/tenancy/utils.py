"""
Tenant isolation utility functions.

Provides functions to determine tenant scope, extract tenant IDs,
and build Q filters for tenant-scoped querysets.
"""
from typing import Dict, Optional, Literal
from django.db.models import Q


TenantScope = Literal['super_admin', 'brand', 'account', 'store']


def determine_scope(user) -> TenantScope:
    """
    Determine tenant scope level based on user role.
    
    Args:
        user: User instance
    
    Returns:
        'super_admin': No scoping (sees everything)
        'brand': Brand-level scoping (ADMIN role)
        'account': Account-level scoping (OWNER, TRIAL_ADMIN)
        'store': Store-level scoping (GM, EMPLOYEE, INSPECTOR)
    """
    if user.role == 'SUPER_ADMIN':
        return 'super_admin'
    elif user.role == 'ADMIN':
        return 'brand'
    elif user.role in ['OWNER', 'TRIAL_ADMIN']:
        return 'account'
    else:  # GM, EMPLOYEE, INSPECTOR
        return 'store'


def tenant_ids(user) -> Dict[str, Optional[int]]:
    """
    Extract tenant IDs from user context.
    
    Args:
        user: User instance
    
    Returns:
        Dict with brand_id, account_id, store_id.
        Handles cases where user.account or user.store may be None.
    """
    brand_id = None
    account_id = None
    store_id = None
    
    if user.store:
        store_id = user.store.id
        if user.store.account:
            account_id = user.store.account.id
            if user.store.account.brand:
                brand_id = user.store.account.brand.id
        if not brand_id and hasattr(user.store, 'brand') and user.store.brand:
            brand_id = user.store.brand.id
    elif user.account:
        account_id = user.account.id
        if user.account.brand:
            brand_id = user.account.brand.id
    
    return {
        'brand_id': brand_id,
        'account_id': account_id,
        'store_id': store_id
    }


def build_tenant_filter(user, model_scope: TenantScope, 
                       field_paths: Dict[str, str]) -> Q:
    """
    Build Q filter for tenant scoping.
    
    Args:
        user: User making the request
        model_scope: Required scope level for this model
        field_paths: Dict mapping scope level to field path
                    e.g., {'brand': 'brand', 'account': 'account', 'store': 'store'}
                    or {'account': 'pulse__account', 'store': 'pulse__store'}
    
    Returns:
        Q object to filter queryset
    """
    user_scope = determine_scope(user)
    
    if user_scope == 'super_admin':
        return Q()  # No filtering
    
    ids = tenant_ids(user)
    
    if user_scope == 'brand' and 'brand' in field_paths and ids['brand_id']:
        return Q(**{field_paths['brand']: ids['brand_id']})
    elif user_scope == 'account' and 'account' in field_paths and ids['account_id']:
        return Q(**{field_paths['account']: ids['account_id']})
    elif user_scope == 'store' and 'store' in field_paths and ids['store_id']:
        return Q(**{field_paths['store']: ids['store_id']})
    
    return Q(pk__in=[])
