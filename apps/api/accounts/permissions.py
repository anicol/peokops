"""
Custom permission classes for PeakOps
"""
from rest_framework.permissions import BasePermission
from .models import User


class IsSuperAdmin(BasePermission):
    """
    Permission class that only allows super admins to access a view.

    Checks if the request user has the SUPER_ADMIN role.
    Note: This checks the ACTUAL user, not an impersonated user.
    """

    def has_permission(self, request, view):
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if this is an impersonation session
        if hasattr(request, 'impersonation_context') and request.impersonation_context:
            # For impersonation, check the ORIGINAL user's role
            from .jwt_utils import get_impersonation_context_from_request
            context = get_impersonation_context_from_request(request)
            if context:
                try:
                    original_user = User.objects.get(id=context['original_user_id'])
                    return original_user.role == User.Role.SUPER_ADMIN
                except User.DoesNotExist:
                    return False

        # Normal case: check current user's role
        return request.user.role == User.Role.SUPER_ADMIN


class CanImpersonate(BasePermission):
    """
    Permission class for impersonation endpoints.

    Only super admins can impersonate, and they cannot impersonate other super admins.
    """

    def has_permission(self, request, view):
        # Must be a super admin
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.role == User.Role.SUPER_ADMIN

    def has_object_permission(self, request, view, obj):
        """
        Check if the super admin can impersonate the specific user.

        Args:
            obj: The User instance being impersonated
        """
        # Must be a super admin
        if request.user.role != User.Role.SUPER_ADMIN:
            return False

        # Cannot impersonate other super admins
        if obj.role == User.Role.SUPER_ADMIN:
            return False

        # Cannot impersonate yourself
        if obj.id == request.user.id:
            return False

        return True
