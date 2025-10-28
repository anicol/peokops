"""
Onboarding views for trial user micro-check onboarding flow.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from .models import User
from brands.models import Brand


@extend_schema(
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'role': {
                    'type': 'string',
                    'enum': ['GM', 'OWNER', 'ADMIN'],
                    'description': 'User role selection from onboarding'
                },
                'industry': {
                    'type': 'string',
                    'enum': ['RESTAURANT', 'RETAIL', 'HOSPITALITY', 'OTHER'],
                    'description': 'Brand industry vertical'
                },
                'subtype': {
                    'type': 'string',
                    'enum': ['QSR', 'FAST_CASUAL', 'CASUAL_DINING', 'FINE_DINING', 'CAFE', 'BAR_PUB', 'FOOD_TRUCK', 'CATERING', 'BAKERY', 'GROCERY', 'CONVENIENCE', 'FASHION', 'HOTEL', 'OTHER_SUBTYPE'],
                    'description': 'Industry subtype (e.g., QSR, Fine Dining for restaurants)'
                },
                'store_count_range': {
                    'type': 'string',
                    'enum': ['1-2', '3-10', '10+', 'CORPORATE'],
                    'description': 'Number of locations'
                },
                'focus_areas': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'description': 'Array of focus areas (e.g., food_safety, cleanliness, customer_experience)'
                }
            },
            'required': ['role', 'industry', 'store_count_range', 'focus_areas']
        }
    },
    responses={
        200: {
            'type': 'object',
            'properties': {
                'message': {'type': 'string'},
                'user': {
                    'type': 'object',
                    'properties': {
                        'id': {'type': 'integer'},
                        'role': {'type': 'string'},
                        'onboarding_completed_at': {'type': 'string', 'format': 'date-time'}
                    }
                },
                'brand': {
                    'type': 'object',
                    'properties': {
                        'id': {'type': 'integer'},
                        'industry': {'type': 'string'},
                        'subtype': {'type': 'string'},
                        'store_count_range': {'type': 'string'},
                        'focus_areas': {'type': 'array', 'items': {'type': 'string'}},
                        'onboarding_completed_at': {'type': 'string', 'format': 'date-time'}
                    }
                }
            }
        },
        400: {'description': 'Invalid input data'},
        404: {'description': 'User has no associated brand'}
    },
    description="Complete trial onboarding and update user role and brand profile"
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_onboarding(request):
    """
    Complete trial user onboarding flow.

    Updates:
    - User role from TRIAL_ADMIN to selected role (GM/OWNER/ADMIN)
    - User onboarding_completed_at timestamp
    - Brand industry, store_count_range, focus_areas
    - Brand onboarding_completed_at timestamp
    """
    user = request.user

    # Validate request data
    role = request.data.get('role')
    industry = request.data.get('industry')
    subtype = request.data.get('subtype')
    store_count_range = request.data.get('store_count_range')
    focus_areas = request.data.get('focus_areas', [])

    # Validate required fields
    if not all([role, industry, store_count_range]):
        return Response(
            {'error': 'Missing required fields: role, industry, store_count_range'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate role choice
    valid_roles = [User.Role.GM, User.Role.OWNER, User.Role.ADMIN]
    if role not in valid_roles:
        return Response(
            {'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate industry choice
    valid_industries = [choice[0] for choice in Brand.Industry.choices]
    if industry not in valid_industries:
        return Response(
            {'error': f'Invalid industry. Must be one of: {", ".join(valid_industries)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate subtype choice (optional but must be valid if provided)
    if subtype:
        valid_subtypes = [choice[0] for choice in Brand.Subtype.choices]
        if subtype not in valid_subtypes:
            return Response(
                {'error': f'Invalid subtype. Must be one of: {", ".join(valid_subtypes)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Validate store_count_range is provided (flexible format)
    if not store_count_range:
        return Response(
            {'error': 'store_count_range is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get user's brand (trial users should have store.brand)
    if not user.store or not user.store.brand:
        return Response(
            {'error': 'User has no associated brand. Please contact support.'},
            status=status.HTTP_404_NOT_FOUND
        )

    brand = user.store.brand

    # Update user role and onboarding completion
    user.role = role
    user.onboarding_completed_at = timezone.now()
    user.save()

    # Update brand profile
    brand.industry = industry
    brand.subtype = subtype
    brand.store_count_range = store_count_range
    brand.focus_areas = focus_areas if isinstance(focus_areas, list) else []
    brand.onboarding_completed_at = timezone.now()
    brand.save()

    return Response({
        'message': 'Onboarding completed successfully',
        'user': {
            'id': user.id,
            'role': user.role,
            'onboarding_completed_at': user.onboarding_completed_at
        },
        'brand': {
            'id': brand.id,
            'industry': brand.industry,
            'subtype': brand.subtype,
            'store_count_range': brand.store_count_range,
            'focus_areas': brand.focus_areas,
            'onboarding_completed_at': brand.onboarding_completed_at
        }
    }, status=status.HTTP_200_OK)
