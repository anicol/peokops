from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
import logging

from accounts.models import Account
from .models import (
    SevenShiftsConfig, SevenShiftsEmployee, SevenShiftsShift,
    SevenShiftsSyncLog, SevenShiftsLocationMapping
)
from .serializers import (
    SevenShiftsConfigSerializer, SevenShiftsEmployeeSerializer,
    SevenShiftsShiftSerializer, SevenShiftsSyncLogSerializer,
    SevenShiftsConfigureRequestSerializer, SevenShiftsSyncRequestSerializer,
    SevenShiftsLocationMappingSerializer, SevenShiftsLocationSerializer
)
from .seven_shifts_client import SevenShiftsClient
from .sync_service import SevenShiftsSyncService


logger = logging.getLogger(__name__)


class SevenShiftsIntegrationViewSet(viewsets.GenericViewSet):
    """
    ViewSet for managing 7shifts integration per account.

    Provides endpoints for:
    - Configuring integration
    - Testing connection
    - Syncing data (employees, shifts)
    - Viewing sync status
    - Disconnecting integration
    """

    permission_classes = [IsAuthenticated]
    serializer_class = SevenShiftsConfigSerializer

    def get_queryset(self):
        """Filter configurations by user's account"""
        if self.request.user.account:
            return SevenShiftsConfig.objects.filter(account=self.request.user.account)
        return SevenShiftsConfig.objects.none()

    @action(detail=False, methods=['get'], url_path='status')
    def get_status(self, request):
        """
        GET /api/integrations/7shifts/status

        Get current 7shifts integration status for user's account.
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = SevenShiftsConfig.objects.get(account=request.user.account)
            serializer = SevenShiftsConfigSerializer(config)

            # Add employee and shift counts
            data = serializer.data
            data['is_configured'] = True
            data['employee_count'] = SevenShiftsEmployee.objects.filter(
                account=request.user.account,
                is_active=True
            ).count()
            data['upcoming_shifts_count'] = SevenShiftsShift.objects.filter(
                account=request.user.account,
                start_time__gte=timezone.now()
            ).count()

            return Response(data)

        except SevenShiftsConfig.DoesNotExist:
            return Response({
                'is_configured': False,
                'message': '7shifts integration not configured'
            })

    @action(detail=False, methods=['post'], url_path='configure')
    def configure(self, request):
        """
        POST /api/integrations/7shifts/configure

        Configure 7shifts integration for user's account.

        Body:
        {
            "access_token": "7shifts_api_token",
            "company_id": "company_123",
            "sync_employees_enabled": true,
            "sync_shifts_enabled": true,
            "enforce_shift_schedule": true,
            "sync_role_names": ["Server", "Manager"]
        }
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SevenShiftsConfigureRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data.get('access_token')
        company_id = serializer.validated_data.get('company_id')

        # Prepare defaults for update_or_create
        defaults = {
            'company_id': company_id,
            'is_active': True,
            'sync_employees_enabled': serializer.validated_data.get('sync_employees_enabled', True),
            'sync_shifts_enabled': serializer.validated_data.get('sync_shifts_enabled', True),
            'enforce_shift_schedule': serializer.validated_data.get('enforce_shift_schedule', True),
            'sync_role_names': serializer.validated_data.get('sync_role_names', []),
            'create_users_without_email': serializer.validated_data.get('create_users_without_email', True),
        }

        # If access_token is provided, test connection and encrypt it
        if access_token:
            # Test the connection first
            client = SevenShiftsClient(access_token, company_id=company_id)
            is_valid, error_message = client.test_connection()
            if not is_valid:
                return Response(
                    {'error': error_message or 'Invalid 7shifts credentials or connection failed'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Encrypt the token
            encrypted_token = SevenShiftsClient.encrypt_token(access_token)
            defaults['access_token_encrypted'] = encrypted_token

        # Check if this is an update and access_token is required for create
        try:
            existing_config = SevenShiftsConfig.objects.get(account=request.user.account)
            # This is an update - access_token is optional
        except SevenShiftsConfig.DoesNotExist:
            # This is a create - access_token is required
            if not access_token:
                return Response(
                    {'error': 'access_token is required when creating a new configuration'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Set created_by only for new configs
        if not SevenShiftsConfig.objects.filter(account=request.user.account).exists():
            defaults['created_by'] = request.user

        # Create or update configuration
        config, created = SevenShiftsConfig.objects.update_or_create(
            account=request.user.account,
            defaults=defaults
        )

        # Trigger initial sync
        try:
            sync_service = SevenShiftsSyncService(config)
            sync_service.sync_all()
        except Exception as e:
            logger.error(f"Initial sync failed: {str(e)}")
            # Don't fail the configuration if sync fails

        response_serializer = SevenShiftsConfigSerializer(config)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], url_path='test-connection')
    def test_connection(self, request):
        """
        POST /api/integrations/7shifts/test-connection

        Test 7shifts API credentials.

        Body:
        {
            "access_token": "7shifts_api_token"
        }
        """
        access_token = request.data.get('access_token')
        if not access_token:
            return Response(
                {'error': 'access_token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company_id = request.data.get('company_id')
        client = SevenShiftsClient(access_token, company_id=company_id)
        is_valid, error_message = client.test_connection()

        if is_valid:
            try:
                company_info = client.get_company_info()
                return Response({
                    'success': True,
                    'message': 'Connection successful',
                    'company': company_info.get('data', {})
                })
            except Exception as e:
                return Response({
                    'success': True,
                    'message': 'Connection successful but could not fetch company info',
                    'error': str(e)
                })
        else:
            return Response(
                {'success': False, 'error': error_message or 'Connection failed'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='sync')
    def sync(self, request):
        """
        POST /api/integrations/7shifts/sync

        Manually trigger a sync operation.

        Body:
        {
            "sync_type": "employees" | "shifts" | "full"  (default: "full")
        }
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = SevenShiftsConfig.objects.get(account=request.user.account)
        except SevenShiftsConfig.DoesNotExist:
            return Response(
                {'error': '7shifts integration not configured'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SevenShiftsSyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sync_type = serializer.validated_data['sync_type']
        sync_service = SevenShiftsSyncService(config)

        try:
            if sync_type == 'employees':
                result = sync_service.sync_employees()
            elif sync_type == 'shifts':
                result = sync_service.sync_shifts()
            else:  # full
                result = sync_service.sync_all()

            return Response({
                'success': True,
                'message': f'{sync_type.capitalize()} sync completed',
                'result': result
            })

        except Exception as e:
            logger.error(f"Sync failed: {str(e)}")
            return Response(
                {'error': f'Sync failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['delete'], url_path='disconnect')
    def disconnect(self, request):
        """
        DELETE /api/integrations/7shifts/disconnect

        Disconnect 7shifts integration (soft delete - deactivate).
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = SevenShiftsConfig.objects.get(account=request.user.account)
            config.is_active = False
            config.save()

            return Response({
                'success': True,
                'message': '7shifts integration disconnected'
            })

        except SevenShiftsConfig.DoesNotExist:
            return Response(
                {'error': '7shifts integration not configured'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='employees')
    def list_employees(self, request):
        """
        GET /api/integrations/7shifts/employees

        List all synced employees from 7shifts.
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        employees = SevenShiftsEmployee.objects.filter(
            account=request.user.account
        ).order_by('last_name', 'first_name')

        # Optional filter by store
        store_id = request.query_params.get('store_id')
        if store_id:
            employees = employees.filter(store_id=store_id)

        # Optional filter by active status
        active_only = request.query_params.get('active_only', 'true').lower() == 'true'
        if active_only:
            employees = employees.filter(is_active=True)

        serializer = SevenShiftsEmployeeSerializer(employees, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='shifts')
    def list_shifts(self, request):
        """
        GET /api/integrations/7shifts/shifts

        List shifts from 7shifts.

        Query params:
        - store_id: Filter by store
        - start_date: Filter shifts after this date (YYYY-MM-DD)
        - end_date: Filter shifts before this date (YYYY-MM-DD)
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        shifts = SevenShiftsShift.objects.filter(
            account=request.user.account
        ).select_related('employee', 'store')

        # Filter by store
        store_id = request.query_params.get('store_id')
        if store_id:
            shifts = shifts.filter(store_id=store_id)

        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if start_date:
            shifts = shifts.filter(start_time__gte=start_date)
        else:
            # Default to showing only upcoming shifts
            shifts = shifts.filter(start_time__gte=timezone.now())

        if end_date:
            shifts = shifts.filter(end_time__lte=end_date)

        shifts = shifts.order_by('start_time')[:100]  # Limit to 100 shifts

        serializer = SevenShiftsShiftSerializer(shifts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='sync-logs')
    def sync_logs(self, request):
        """
        GET /api/integrations/7shifts/sync-logs

        Get recent sync operation logs.
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        logs = SevenShiftsSyncLog.objects.filter(
            account=request.user.account
        ).order_by('-started_at')[:20]

        serializer = SevenShiftsSyncLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='locations')
    def list_locations(self, request):
        """
        GET /api/integrations/7shifts/locations

        List all 7shifts locations with their mapping status.
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = SevenShiftsConfig.objects.get(account=request.user.account)
        except SevenShiftsConfig.DoesNotExist:
            return Response(
                {'error': '7shifts integration not configured'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch locations from 7shifts
        try:
            access_token = SevenShiftsClient.decrypt_token(config.access_token_encrypted)
            client = SevenShiftsClient(access_token, company_id=config.company_id)
            locations = client.list_locations()
        except Exception as e:
            logger.error(f"Failed to fetch locations: {str(e)}")
            return Response(
                {'error': f'Failed to fetch locations from 7shifts: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Get existing mappings
        mappings = SevenShiftsLocationMapping.objects.filter(
            account=request.user.account
        ).select_related('store')
        mapping_dict = {m.seven_shifts_location_id: m for m in mappings}

        # Build response with mapping status
        locations_with_status = []
        for location in locations:
            location_id = str(location.get('id'))
            mapping = mapping_dict.get(location_id)

            locations_with_status.append({
                'id': location_id,
                'name': location.get('name'),
                'is_mapped': mapping is not None,
                'mapped_store_id': mapping.store.id if mapping else None,
                'mapped_store_name': mapping.store.name if mapping else None,
            })

        serializer = SevenShiftsLocationSerializer(locations_with_status, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='roles')
    def list_roles(self, request):
        """
        GET /api/integrations/7shifts/roles

        List all 7shifts roles from the company.
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = SevenShiftsConfig.objects.get(account=request.user.account)
        except SevenShiftsConfig.DoesNotExist:
            return Response(
                {'error': '7shifts integration not configured'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch roles from 7shifts
        try:
            access_token = SevenShiftsClient.decrypt_token(config.access_token_encrypted)
            client = SevenShiftsClient(access_token, company_id=config.company_id)
            roles = client.list_roles()
        except Exception as e:
            logger.error(f"Failed to fetch roles: {str(e)}")
            return Response(
                {'error': f'Failed to fetch roles from 7shifts: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Extract just id and name from roles
        roles_data = [
            {
                'id': str(role.get('id')),
                'name': role.get('name', role.get('title', 'Unknown'))
            }
            for role in roles
        ]

        return Response(roles_data)

    @action(detail=False, methods=['post'], url_path='locations/map')
    def map_location(self, request):
        """
        POST /api/integrations/7shifts/locations/map

        Create or update a location mapping.

        Body:
        {
            "seven_shifts_location_id": "12345",
            "seven_shifts_location_name": "Downtown",
            "store_id": "uuid"
        }
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        location_id = request.data.get('seven_shifts_location_id')
        location_name = request.data.get('seven_shifts_location_name')
        store_id = request.data.get('store_id')

        if not all([location_id, location_name, store_id]):
            return Response(
                {'error': 'seven_shifts_location_id, seven_shifts_location_name, and store_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify store belongs to user's account
        from brands.models import Store
        try:
            store = Store.objects.get(id=store_id, account=request.user.account)
        except Store.DoesNotExist:
            return Response(
                {'error': 'Store not found or does not belong to your account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or update mapping
        mapping, created = SevenShiftsLocationMapping.objects.update_or_create(
            account=request.user.account,
            seven_shifts_location_id=location_id,
            defaults={
                'seven_shifts_location_name': location_name,
                'store': store,
            }
        )

        # Set created_by only on new mappings
        if created and not mapping.created_by:
            mapping.created_by = request.user
            mapping.save()

        serializer = SevenShiftsLocationMappingSerializer(mapping)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=False, methods=['delete'], url_path='locations/(?P<location_id>[^/.]+)/unmap')
    def unmap_location(self, request, location_id=None):
        """
        DELETE /api/integrations/7shifts/locations/{location_id}/unmap

        Remove a location mapping.
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            mapping = SevenShiftsLocationMapping.objects.get(
                account=request.user.account,
                seven_shifts_location_id=location_id
            )
            mapping.delete()
            return Response(
                {'success': True, 'message': 'Location mapping removed'},
                status=status.HTTP_200_OK
            )
        except SevenShiftsLocationMapping.DoesNotExist:
            return Response(
                {'error': 'Location mapping not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================================================
# Google Reviews Integration ViewSet
# ============================================================================

class GoogleReviewsIntegrationViewSet(viewsets.GenericViewSet):
    """
    ViewSet for managing Google Reviews integration per account.

    Provides endpoints for:
    - OAuth connection flow
    - Viewing integration status
    - Syncing reviews
    - Managing locations
    - Viewing reviews
    - Disconnecting integration
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter configurations by user's account"""
        from .models import GoogleReviewsConfig
        if self.request.user.account:
            return GoogleReviewsConfig.objects.filter(account=self.request.user.account)
        return GoogleReviewsConfig.objects.none()

    @action(detail=False, methods=['get'], url_path='status')
    def get_status(self, request):
        """
        GET /api/integrations/google-reviews/status

        Get current Google Reviews integration status for user's account.
        """
        from .models import GoogleReviewsConfig, GoogleLocation, GoogleReview
        from .serializers import GoogleReviewsConfigSerializer

        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = GoogleReviewsConfig.objects.get(account=request.user.account)
            serializer = GoogleReviewsConfigSerializer(config)

            # Add location and review counts
            data = serializer.data
            data['is_configured'] = True
            data['location_count'] = GoogleLocation.objects.filter(
                account=request.user.account,
                is_active=True
            ).count()
            data['review_count'] = GoogleReview.objects.filter(
                account=request.user.account
            ).count()
            data['unread_review_count'] = GoogleReview.objects.filter(
                account=request.user.account,
                read_at__isnull=True
            ).count()

            return Response(data)

        except GoogleReviewsConfig.DoesNotExist:
            return Response({
                'is_configured': False,
                'message': 'Google Reviews integration not configured'
            })

    @action(detail=False, methods=['get'], url_path='oauth-url')
    def get_oauth_url(self, request):
        """
        GET /api/integrations/google-reviews/oauth-url

        Get the Google OAuth URL to start the connection process.
        """
        from .google_reviews_client import GoogleReviewsClient

        try:
            oauth_url = GoogleReviewsClient.get_oauth_authorization_url()
            return Response({
                'oauth_url': oauth_url,
                'message': 'Redirect user to this URL to authorize Google Business Profile access'
            })
        except Exception as e:
            logger.error(f"Failed to generate OAuth URL: {str(e)}")
            return Response(
                {'error': f'Failed to generate OAuth URL: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='oauth-callback')
    def oauth_callback(self, request):
        """
        POST /api/integrations/google-reviews/oauth-callback

        Handle OAuth callback and exchange code for tokens.

        Body:
        {
            "code": "oauth_authorization_code",
            "state": "optional_csrf_token"
        }
        """
        from .models import GoogleReviewsConfig
        from .serializers import GoogleReviewsOAuthRequestSerializer
        from .google_reviews_client import GoogleReviewsClient

        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = GoogleReviewsOAuthRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']

        try:
            # Exchange code for tokens
            token_data = GoogleReviewsClient.exchange_code_for_tokens(code)

            # Encrypt tokens
            encrypted_access_token = GoogleReviewsClient.encrypt_token(token_data['access_token'])
            encrypted_refresh_token = GoogleReviewsClient.encrypt_token(token_data['refresh_token'])

            # Calculate token expiration
            expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))

            # Create or update configuration
            config, created = GoogleReviewsConfig.objects.update_or_create(
                account=request.user.account,
                defaults={
                    'access_token_encrypted': encrypted_access_token,
                    'refresh_token_encrypted': encrypted_refresh_token,
                    'token_expires_at': expires_at,
                    'is_active': True,
                }
            )

            # Set created_by only on first creation
            if created:
                config.created_by = request.user
                config.save()

            # Trigger initial sync of locations
            try:
                from .google_reviews_sync import GoogleReviewsSyncService
                sync_service = GoogleReviewsSyncService(config)
                sync_service.sync_locations()
            except Exception as e:
                logger.error(f"Initial location sync failed: {str(e)}")
                # Don't fail the OAuth connection if sync fails

            return Response({
                'success': True,
                'message': 'Google Business Profile connected successfully',
                'config_id': str(config.id)
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"OAuth callback failed: {str(e)}")
            return Response(
                {'error': f'OAuth callback failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='sync')
    def sync(self, request):
        """
        POST /api/integrations/google-reviews/sync

        Manually trigger a sync operation.

        Body:
        {
            "location_id": "optional_location_uuid"  # If not provided, syncs all locations
        }
        """
        from .models import GoogleReviewsConfig
        from .serializers import GoogleReviewsSyncRequestSerializer
        from .google_reviews_sync import GoogleReviewsSyncService

        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = GoogleReviewsConfig.objects.get(account=request.user.account)
        except GoogleReviewsConfig.DoesNotExist:
            return Response(
                {'error': 'Google Reviews integration not configured'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = GoogleReviewsSyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        location_id = serializer.validated_data.get('location_id')
        sync_service = GoogleReviewsSyncService(config)

        try:
            if location_id:
                # Sync specific location
                result = sync_service.sync_reviews_for_location(location_id)
                message = f'Synced reviews for location {location_id}'
            else:
                # Sync all locations
                result = sync_service.sync_all_reviews()
                message = 'Synced all reviews'

            return Response({
                'success': True,
                'message': message,
                'result': result
            })

        except Exception as e:
            logger.error(f"Sync failed: {str(e)}")
            return Response(
                {'error': f'Sync failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['delete'], url_path='disconnect')
    def disconnect(self, request):
        """
        DELETE /api/integrations/google-reviews/disconnect

        Disconnect Google Reviews integration (soft delete - deactivate).
        """
        from .models import GoogleReviewsConfig

        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = GoogleReviewsConfig.objects.get(account=request.user.account)
            config.is_active = False
            config.save()

            return Response({
                'success': True,
                'message': 'Google Reviews integration disconnected'
            })

        except GoogleReviewsConfig.DoesNotExist:
            return Response(
                {'error': 'Google Reviews integration not configured'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='locations')
    def list_locations(self, request):
        """
        GET /api/integrations/google-reviews/locations

        List all Google Business locations for this account.
        """
        from .models import GoogleLocation
        from .serializers import GoogleLocationSerializer

        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        locations = GoogleLocation.objects.filter(
            account=request.user.account,
            is_active=True
        ).order_by('google_location_name')

        serializer = GoogleLocationSerializer(locations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='reviews')
    def list_reviews(self, request):
        """
        GET /api/integrations/google-reviews/reviews

        List reviews for the account.

        Query params:
        - location_id: Filter by location UUID
        - min_rating: Minimum rating (1-5)
        - max_rating: Maximum rating (1-5)
        - unread_only: Show only unread reviews (true/false)
        - limit: Number of reviews to return (default: 50)
        """
        from .models import GoogleReview
        from .serializers import GoogleReviewSerializer

        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reviews = GoogleReview.objects.filter(
            account=request.user.account
        ).order_by('-review_created_at')

        # Apply filters
        location_id = request.query_params.get('location_id')
        if location_id:
            reviews = reviews.filter(location_id=location_id)

        min_rating = request.query_params.get('min_rating')
        if min_rating:
            reviews = reviews.filter(rating__gte=int(min_rating))

        max_rating = request.query_params.get('max_rating')
        if max_rating:
            reviews = reviews.filter(rating__lte=int(max_rating))

        unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
        if unread_only:
            reviews = reviews.filter(read_at__isnull=True)

        # Limit results
        limit = int(request.query_params.get('limit', 50))
        reviews = reviews[:limit]

        serializer = GoogleReviewSerializer(reviews, many=True)
        return Response(serializer.data)
