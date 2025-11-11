"""
Tenant isolation mixins for DRF ViewSets.

Provides mixins to automatically scope querysets and validate tenant ownership
on create/update operations.
"""
from rest_framework.exceptions import PermissionDenied
from .utils import build_tenant_filter, tenant_ids


class ScopedQuerysetMixin:
    """
    Mixin to automatically scope querysets by tenant.
    
    Usage:
        class MyViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
            tenant_scope = 'account'  # or 'brand', 'store', 'auto'
            tenant_field_paths = {
                'brand': 'brand',
                'account': 'account', 
                'store': 'store'
            }
            tenant_unrestricted_roles = []  # Optional: roles that bypass filtering
    """
    
    tenant_scope = 'auto'  # 'brand', 'account', 'store', or 'auto'
    tenant_field_paths = {
        'brand': 'brand',
        'account': 'account',
        'store': 'store'
    }
    tenant_unrestricted_roles = []  # Roles that bypass tenant filtering
    
    def get_tenant_filter(self, user):
        """
        Build tenant filter Q object. Override this method for custom filtering logic.
        
        Args:
            user: User making the request
            
        Returns:
            Q object to filter queryset
        """
        return build_tenant_filter(
            user=user,
            model_scope=self.tenant_scope,
            field_paths=self.tenant_field_paths
        )
    
    def get_queryset(self):
        """Apply tenant filtering to queryset"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user or not user.is_authenticated:
            return queryset.none()
        
        if self.tenant_unrestricted_roles and user.role in self.tenant_unrestricted_roles:
            return queryset
        
        tenant_filter = self.get_tenant_filter(user)
        
        return queryset.filter(tenant_filter)


class ScopedCreateMixin:
    """
    Mixin to auto-assign tenant FKs on create and validate tenant ownership.
    
    Usage:
        class MyViewSet(ScopedCreateMixin, viewsets.ModelViewSet):
            tenant_create_fields = {
                'account': 'account',
                'store': 'store'
            }
    """
    
    tenant_create_fields = {}  # Override in ViewSet
    
    def perform_create(self, serializer):
        """Auto-assign tenant FKs and validate"""
        user = self.request.user

        # Check for unrestricted roles
        unrestricted_roles = getattr(self, 'tenant_unrestricted_roles', [])
        is_unrestricted = user.role in unrestricted_roles if unrestricted_roles else False

        if not is_unrestricted:
            ids = tenant_ids(user)
            from .utils import determine_scope
            user_scope = determine_scope(user)

            tenant_data = {}
            for scope_level, field_name in self.tenant_create_fields.items():
                if scope_level == 'account' and ids['account_id']:
                    # Import here to avoid circular dependency
                    from accounts.models import Account
                    tenant_data[field_name] = Account.objects.get(id=ids['account_id'])
                elif scope_level == 'store' and ids['store_id']:
                    from brands.models import Store
                    tenant_data[field_name] = Store.objects.get(id=ids['store_id'])
                elif scope_level == 'brand' and ids['brand_id']:
                    from brands.models import Brand
                    tenant_data[field_name] = Brand.objects.get(id=ids['brand_id'])

            validated_data = serializer.validated_data

            # Validate provided tenant FKs match user's tenant
            for scope_level, field_name in self.tenant_create_fields.items():
                if field_name in validated_data:
                    provided_obj = validated_data[field_name]
                    provided_id = provided_obj.id if hasattr(provided_obj, 'id') else provided_obj
                    expected_obj = tenant_data.get(field_name)
                    expected_id = expected_obj.id if expected_obj and hasattr(expected_obj, 'id') else expected_obj

                    if expected_id and provided_id != expected_id:
                        raise PermissionDenied(f"Cannot create resource for another tenant's {scope_level}")

            # Also validate store FK for account-level users
            if user_scope == 'account' and 'store' in validated_data:
                from brands.models import Store
                provided_store = validated_data['store']
                store_id = provided_store.id if hasattr(provided_store, 'id') else provided_store
                try:
                    store = Store.objects.get(id=store_id)
                    if store.account_id != ids['account_id']:
                        raise PermissionDenied("Cannot create resource for another tenant's store")
                except Store.DoesNotExist:
                    raise PermissionDenied("Invalid store")

            serializer.save(**tenant_data)
        else:
            # Unrestricted users don't need validation
            serializer.save()
