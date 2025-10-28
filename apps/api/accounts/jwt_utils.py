"""
Custom JWT utilities for handling impersonation in tokens
"""
from rest_framework_simplejwt.tokens import RefreshToken
from typing import Optional
from .models import User, ImpersonationSession


def get_tokens_for_impersonation(super_admin: User, target_user: User, impersonation_session: ImpersonationSession):
    """
    Generate JWT tokens with impersonation claims.

    The tokens will authenticate as the target_user, but include claims
    identifying the original super_admin for audit trails.

    Args:
        super_admin: The super admin performing the impersonation
        target_user: The user being impersonated
        impersonation_session: The ImpersonationSession record

    Returns:
        dict: {
            'access': str,  # Access token
            'refresh': str  # Refresh token
        }
    """
    # Generate tokens for the target user
    refresh = RefreshToken.for_user(target_user)

    # Add custom claims for impersonation
    refresh['impersonated_user_id'] = target_user.id
    refresh['original_user_id'] = super_admin.id
    refresh['impersonation_session_id'] = impersonation_session.id
    refresh['is_impersonating'] = True

    # Also add to access token
    access_token = refresh.access_token
    access_token['impersonated_user_id'] = target_user.id
    access_token['original_user_id'] = super_admin.id
    access_token['impersonation_session_id'] = impersonation_session.id
    access_token['is_impersonating'] = True

    return {
        'access': str(access_token),
        'refresh': str(refresh),
    }


def get_impersonation_context_from_request(request) -> Optional[dict]:
    """
    Extract impersonation context from request.

    Checks the JWT token in the request for impersonation claims.

    Args:
        request: Django request object with user.auth info

    Returns:
        dict or None: {
            'is_impersonating': bool,
            'original_user_id': int,
            'impersonated_user_id': int,
            'impersonation_session_id': int
        } or None if not impersonating
    """
    if not hasattr(request, 'auth') or not request.auth:
        return None

    # Check if token has impersonation claims
    is_impersonating = request.auth.get('is_impersonating', False)

    if not is_impersonating:
        return None

    return {
        'is_impersonating': True,
        'original_user_id': request.auth.get('original_user_id'),
        'impersonated_user_id': request.auth.get('impersonated_user_id'),
        'impersonation_session_id': request.auth.get('impersonation_session_id'),
    }
