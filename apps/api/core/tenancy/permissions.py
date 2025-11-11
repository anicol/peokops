"""
Tenant isolation permission classes.

Provides permission classes to enforce tenant boundaries on object-level operations.
"""
from rest_framework.permissions import BasePermission
from .utils import determine_scope, tenant_ids


class TenantObjectPermission(BasePermission):
    """
    Permission class to enforce tenant boundaries on object-level operations.
    
    Checks that the object being accessed belongs to the user's tenant.
    
    Usage:
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, TenantObjectPermission]
            tenant_object_paths = {
                'brand': 'brand_id',
                'account': 'account_id',
                'store': 'store_id'
            }
    """
    
    tenant_object_paths = {
        'brand': 'brand_id',
        'account': 'account_id',
        'store': 'store_id'
    }
    
    def has_object_permission(self, request, view, obj):
        """Check if user has permission to access this object"""
        user = request.user

        unrestricted_roles = getattr(view, 'tenant_unrestricted_roles', [])
        if unrestricted_roles and user.role in unrestricted_roles:
            return True

        if user.role == 'SUPER_ADMIN':
            return True

        user_scope = determine_scope(user)
        ids = tenant_ids(user)

        paths = getattr(view, 'tenant_object_paths', self.tenant_object_paths)

        # For nested relationships like inspection__store, we need to check account or brand level
        if user_scope == 'brand' and 'brand' in paths:
            obj_brand_id = self._get_nested_attr(obj, paths['brand'])
            return obj_brand_id == ids['brand_id']

        elif user_scope == 'account':
            # Account-level users can access if the object belongs to their account
            if 'account' in paths:
                obj_account_id = self._get_nested_attr(obj, paths['account'])
                return obj_account_id == ids['account_id']
            # Or if the object's store belongs to their account
            elif 'store' in paths:
                obj_store_id = self._get_nested_attr(obj, paths['store'])
                # Need to check if this store belongs to their account
                from brands.models import Store
                try:
                    store = Store.objects.get(id=obj_store_id)
                    return store.account_id == ids['account_id']
                except Store.DoesNotExist:
                    return False

        elif user_scope == 'store' and 'store' in paths:
            obj_store_id = self._get_nested_attr(obj, paths['store'])
            return obj_store_id == ids['store_id']

        return False
    
    def _get_nested_attr(self, obj, path):
        """Get nested attribute using dot notation (e.g., 'pulse.account.id')"""
        parts = path.split('.')
        value = obj
        for part in parts:
            if hasattr(value, part):
                value = getattr(value, part)
            else:
                return None
        return value
