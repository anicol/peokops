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
                needs_analysis=True
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
            logger.info(f"Token exchange successful. Keys in response: {list(token_data.keys())}")

            # Encrypt tokens (returns str, convert to bytes for BinaryField)
            encrypted_access_token = GoogleReviewsClient.encrypt_token(token_data['access_token']).encode()
            encrypted_refresh_token = GoogleReviewsClient.encrypt_token(token_data['refresh_token']).encode()

            # Calculate token expiration
            expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))

            # Fetch Google Business account ID
            google_account_id = ''
            try:
                temp_client = GoogleReviewsClient(
                    token_data['access_token'],
                    token_data.get('refresh_token', '')
                )
                accounts = temp_client.list_accounts()
                if accounts and len(accounts) > 0:
                    # Use the first account (users typically have one business account)
                    # Account name format: "accounts/12345"
                    google_account_id = accounts[0].get('name', '')
                    logger.info(f"Found Google Business account: {google_account_id}")
                else:
                    logger.warning("No Google Business accounts found for this user")
            except Exception as e:
                logger.error(f"Failed to fetch Google Business accounts: {e}")
                # Continue anyway - user might not have set up their business profile yet

            # Create or update configuration
            config, created = GoogleReviewsConfig.objects.update_or_create(
                account=request.user.account,
                defaults={
                    'access_token_encrypted': encrypted_access_token,
                    'refresh_token_encrypted': encrypted_refresh_token,
                    'token_expires_at': expires_at,
                    'google_account_id': google_account_id,
                    'is_active': True,
                }
            )

            # Set created_by only on first creation
            if created:
                config.created_by = request.user
                config.save()

            # Note: We don't automatically sync on OAuth callback to avoid blocking
            # User can manually trigger sync after connecting
            message = 'Google Business Profile connected successfully'
            if not google_account_id:
                message += '. Click "Sync Now" to fetch your locations and reviews.'

            return Response({
                'success': True,
                'message': message,
                'config_id': str(config.id),
                'has_business_account': bool(google_account_id)
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
                # Sync specific location - for now, sync all and filter later
                # TODO: Add sync_reviews_for_location method to optimize single location sync
                result = sync_service.sync_reviews()
                message = f'Synced reviews for location {location_id}'
            else:
                # Sync all locations and reviews
                result = sync_service.sync_all()
                message = 'Synced all locations and reviews'

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
            reviews = reviews.filter(needs_analysis=True)

        # Limit results
        limit = int(request.query_params.get('limit', 50))
        reviews = reviews[:limit]

        serializer = GoogleReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='search-business')
    def search_google_business(self, request):
        """
        POST /api/integrations/google-reviews/search-business

        Search for a business on Google Maps by name and return basic info.

        Body:
        {
            "business_name": "Marco's Pizza Cleveland",
            "location": "Cleveland, OH"  (optional, improves accuracy)
        }

        Returns:
        {
            "business_name": str,
            "place_url": str,
            "average_rating": float,
            "total_reviews": int,
            "address": str,
            "place_id": str (optional)
        }
        """
        from marketing.management.commands.scrape_google_reviews import Command as ScraperCommand
        import logging

        logger = logging.getLogger(__name__)

        business_name = request.data.get('business_name')
        location = request.data.get('location', '')

        if not business_name:
            return Response(
                {'error': 'business_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Use scraper to get basic business info
            scraper = ScraperCommand()
            search_query = f"{business_name} {location}".strip()

            logger.info(f"Searching for business: {search_query}")

            # Call scraper's method to get business info (not full review scrape)
            # This will use Playwright to load Google Maps and extract business data
            result = scraper.get_business_info(search_query)

            if result and result.get('business_name'):
                return Response({
                    'business_name': result.get('business_name'),
                    'place_url': result.get('place_url', ''),
                    'average_rating': result.get('rating'),
                    'total_reviews': result.get('total_reviews', 0),
                    'address': result.get('address', ''),
                    'place_id': result.get('place_id', '')
                })
            else:
                return Response(
                    {'error': 'Business not found. Please check the name and try again.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        except Exception as e:
            logger.error(f"Business search failed: {str(e)}")
            return Response(
                {'error': f'Search failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='link-location')
    def link_google_location(self, request):
        """
        POST /api/integrations/google-reviews/link-location

        Link a Google location to a store and trigger review scraping.

        Body:
        {
            "store_id": "uuid",
            "business_name": "Marco's Pizza",
            "place_url": "https://www.google.com/maps/...",
            "place_id": "ChIJ..." (optional)
        }

        Returns:
        {
            "success": true,
            "message": "Location linked and review scraping started",
            "location_id": "uuid",
            "scraping_task_id": "celery_task_id"
        }
        """
        from integrations.models import GoogleLocation
        from brands.models import Store
        from insights.tasks import process_review_analysis
        from marketing.management.commands.scrape_google_reviews import Command as ScraperCommand
        import logging
        import uuid

        logger = logging.getLogger(__name__)

        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        store_id = request.data.get('store_id')
        business_name = request.data.get('business_name')
        place_url = request.data.get('place_url')
        place_id = request.data.get('place_id', '')

        logger.info(f"Link location request - store_id: {store_id}, type: {type(store_id)}, user: {request.user.email}, account: {request.user.account}")

        if not all([store_id, business_name, place_url]):
            return Response(
                {'error': 'store_id, business_name, and place_url are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify store belongs to user's account
        try:
            store = Store.objects.get(id=store_id, account=request.user.account)
            logger.info(f"Found store: {store.id} - {store.name}, account: {store.account}")
        except Store.DoesNotExist:
            # Debug: check if store exists at all
            try:
                store_check = Store.objects.get(id=store_id)
                logger.error(f"Store {store_id} exists but has account {store_check.account} (user has {request.user.account})")
            except Store.DoesNotExist:
                logger.error(f"Store {store_id} does not exist at all")

            return Response(
                {'error': 'Store not found or does not belong to your account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if store already has a linked Google location (OneToOne relationship)
        if hasattr(store, 'google_location') and store.google_location:
            return Response(
                {'error': f'Store already linked to Google location: {store.google_location.google_location_name}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Extract address from request data (from GooglePlacesAutocomplete)
            address = request.data.get('address', '')

            # Create GoogleLocation and link to Store
            # We'll fetch rating and review count during the scraping process
            location = GoogleLocation.objects.create(
                account=request.user.account,
                store=store,  # OneToOne link
                google_location_id=place_id or f'manual_{uuid.uuid4()}',
                google_location_name=business_name,
                address=address,
                average_rating=None,  # Will be populated during scraping
                total_review_count=0,  # Will be populated during scraping
                is_active=True,
                synced_at=timezone.now()
            )

            logger.info(f"Linked Google location {business_name} to store {store.name}")

            # Trigger Celery task to scrape reviews for this location
            # This will populate GoogleReview records (not ReviewAnalysis)
            from integrations.tasks import scrape_google_reviews

            # Queue scraping task
            task = scrape_google_reviews.delay(str(location.id))

            logger.info(f"Queued scraping task {task.id} for location {location.id}")

            return Response({
                'success': True,
                'message': 'Google location linked successfully. Review scraping started in background.',
                'location_id': str(location.id),
                'scraping_task_id': task.id
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Failed to link Google location: {str(e)}")
            return Response(
                {'error': f'Failed to link location: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='reviews/(?P<review_id>[^/.]+)/reply')
    def create_reply(self, request, review_id=None):
        """
        Create or update a reply to a review.

        POST /api/integrations/google-reviews/reviews/{review_id}/reply/

        Body:
        {
            "response_text": "Thank you for your feedback!",
            "save_as_draft": false,
            "was_ai_suggested": false,
            "ai_suggestion_tone": "professional"
        }
        """
        from .models import GoogleReview, ReviewResponse
        from .serializers import CreateReplyRequestSerializer, ReviewResponseSerializer

        # Get the review
        try:
            review = GoogleReview.objects.select_related('location', 'account').get(id=review_id)
        except GoogleReview.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

        # Validate request data
        serializer = CreateReplyRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Create or update response
        response_obj, created = ReviewResponse.objects.update_or_create(
            review=review,
            defaults={
                'response_text': data['response_text'],
                'created_by': request.user,
                'status': ReviewResponse.Status.DRAFT if data['save_as_draft'] else ReviewResponse.Status.PUBLISHED,
                'published_at': None if data['save_as_draft'] else timezone.now(),
                'was_ai_suggested': data.get('was_ai_suggested', False),
                'ai_suggestion_tone': data.get('ai_suggestion_tone'),
            }
        )

        # If publishing immediately, try to post to Google (for OAuth reviews)
        if not data['save_as_draft'] and review.source == 'oauth':
            # TODO: Implement Google API reply posting
            # For now, just mark as published
            logger.info(f"Would publish reply to Google for review {review_id}")

        response_serializer = ReviewResponseSerializer(response_obj)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='reviews/(?P<review_id>[^/.]+)/suggest-reply')
    def suggest_reply(self, request, review_id=None):
        """
        Generate AI-suggested reply for a review.

        POST /api/integrations/google-reviews/reviews/{review_id}/suggest-reply/

        Body:
        {
            "tone": "professional"  // or "friendly", "apologetic"
        }
        """
        from .models import GoogleReview
        from .serializers import SuggestReplyRequestSerializer
        from ai_services.bedrock_service import BedrockRecommendationService

        # Get the review
        try:
            review = GoogleReview.objects.get(id=review_id)
        except GoogleReview.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

        # Validate request data
        serializer = SuggestReplyRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tone = serializer.validated_data['tone']

        # Generate AI suggestion
        bedrock_service = BedrockRecommendationService()

        try:
            # Craft prompt based on tone
            tone_instructions = {
                'professional': 'Use a professional and courteous tone. Be respectful and businesslike.',
                'friendly': 'Use a warm and friendly tone. Be personable and approachable.',
                'apologetic': 'Use an apologetic and empathetic tone. Acknowledge concerns and express genuine regret for any issues.'
            }

            prompt = f"""Generate a response to this Google review.

Review Rating: {review.rating}/5 stars
Reviewer: {review.reviewer_name}
Review Text: {review.review_text}

{tone_instructions.get(tone, tone_instructions['professional'])}

The response should:
- Be 2-4 sentences long
- Address specific points mentioned in the review
- Thank the reviewer for their feedback
- {f'Apologize for any issues if appropriate' if tone == 'apologetic' or review.rating <= 3 else 'Express appreciation for positive feedback'}
- Include a call to action if appropriate (e.g., "Please visit us again")

Generate ONLY the response text, no additional commentary."""

            # Use Bedrock to generate suggestion
            import boto3
            import json

            if bedrock_service.enabled:
                try:
                    bedrock_runtime = boto3.client(
                        service_name='bedrock-runtime',
                        region_name=bedrock_service.region
                    )

                    request_body = json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 500,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": 0.7,
                    })

                    response = bedrock_runtime.invoke_model(
                        modelId=bedrock_service.model_id,
                        body=request_body
                    )

                    response_body = json.loads(response['body'].read())
                    suggested_text = response_body['content'][0]['text'].strip()

                    return Response({
                        'suggested_response': suggested_text,
                        'tone': tone,
                        'review_rating': review.rating,
                    }, status=status.HTTP_200_OK)

                except Exception as e:
                    logger.error(f"Bedrock API error: {str(e)}")
                    # Fall through to fallback

            # Fallback: Template-based suggestions
            if review.rating <= 2:
                suggestions = {
                    'professional': f"Thank you for sharing your feedback, {review.reviewer_name}. We sincerely apologize for not meeting your expectations. Your concerns are important to us, and we would appreciate the opportunity to make this right. Please contact us directly so we can address your experience.",
                    'friendly': f"Hi {review.reviewer_name}, thank you for taking the time to share your thoughts. We're really sorry to hear about your experience - that's definitely not the standard we aim for! We'd love to chat with you directly to make things right. Please reach out to us!",
                    'apologetic': f"Dear {review.reviewer_name}, we are truly sorry for your disappointing experience. This is not reflective of our usual standards, and we take full responsibility. We would very much like to speak with you personally to address your concerns and ensure this doesn't happen again. Please contact us at your earliest convenience."
                }
            elif review.rating == 3:
                suggestions = {
                    'professional': f"Thank you for your feedback, {review.reviewer_name}. We appreciate you taking the time to share your experience. We're always working to improve, and your input helps us do that. We hope to serve you better in the future.",
                    'friendly': f"Thanks for the feedback, {review.reviewer_name}! We're glad you stopped by, and we appreciate your honest thoughts. We're always looking to improve, and we'd love to have another chance to give you a great experience. Hope to see you again soon!",
                    'apologetic': f"Thank you for your review, {review.reviewer_name}. We're sorry we didn't quite hit the mark this time. Your feedback is valuable to us, and we're committed to doing better. We hope you'll give us another opportunity to provide you with a better experience."
                }
            else:
                suggestions = {
                    'professional': f"Thank you for your kind words, {review.reviewer_name}. We're delighted to hear you had a positive experience with us. Your feedback means a lot to our team. We look forward to serving you again soon.",
                    'friendly': f"Wow, thank you so much for the great review, {review.reviewer_name}! We're so happy you enjoyed your visit! Your kind words really make our day. Can't wait to see you again soon!",
                    'apologetic': f"Thank you so much for your positive feedback, {review.reviewer_name}. We're thrilled you had a good experience! We appreciate your support and look forward to welcoming you back."
                }

            suggested_text = suggestions.get(tone, suggestions['professional'])

            return Response({
                'suggested_response': suggested_text,
                'tone': tone,
                'review_rating': review.rating,
                'note': 'Generated using fallback templates (AI service unavailable)'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to generate reply suggestion: {str(e)}")
            return Response(
                {'error': 'Failed to generate suggestion'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='response-metrics')
    def response_metrics(self, request):
        """
        Get response rate and response time metrics.

        GET /api/integrations/google-reviews/response-metrics/
        """
        from .models import GoogleReview, ReviewResponse
        from django.db.models import Count, Avg, Q, F, ExpressionWrapper, fields
        from datetime import timedelta

        account = request.user.account

        # Total reviews
        total_reviews = GoogleReview.objects.filter(account=account).count()

        # Reviews with responses
        reviews_with_responses = GoogleReview.objects.filter(
            account=account,
            response__isnull=False
        ).count()

        # Response rate
        response_rate = (reviews_with_responses / total_reviews * 100) if total_reviews > 0 else 0

        # Average response time (for published responses)
        # Calculate time between review creation and response publication
        responses_with_time = ReviewResponse.objects.filter(
            review__account=account,
            status=ReviewResponse.Status.PUBLISHED,
            published_at__isnull=False
        ).annotate(
            response_time=ExpressionWrapper(
                F('published_at') - F('review__review_created_at'),
                output_field=fields.DurationField()
            )
        )

        avg_response_time = responses_with_time.aggregate(
            avg_time=Avg('response_time')
        )['avg_time']

        # Convert to hours
        avg_response_hours = None
        if avg_response_time:
            avg_response_hours = avg_response_time.total_seconds() / 3600

        # Response rate by rating
        response_by_rating = {}
        for rating in range(1, 6):
            total = GoogleReview.objects.filter(account=account, rating=rating).count()
            with_response = GoogleReview.objects.filter(
                account=account,
                rating=rating,
                response__isnull=False
            ).count()
            response_by_rating[rating] = {
                'total': total,
                'with_response': with_response,
                'rate': (with_response / total * 100) if total > 0 else 0
            }

        # Recent activity (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_responses = ReviewResponse.objects.filter(
            review__account=account,
            created_at__gte=thirty_days_ago
        ).count()

        return Response({
            'total_reviews': total_reviews,
            'reviews_with_responses': reviews_with_responses,
            'response_rate': round(response_rate, 1),
            'avg_response_time_hours': round(avg_response_hours, 1) if avg_response_hours else None,
            'response_by_rating': response_by_rating,
            'recent_responses_30d': recent_responses,
        }, status=status.HTTP_200_OK)

    # ========================================================================
    # Phase 3: Review Insights & Trending Issues Endpoints
    # ========================================================================

    @action(detail=False, methods=['get'], url_path='insights')
    def insights_summary(self, request):
        """Get comprehensive insights summary for account"""
        account = request.user.account
        location_id = request.query_params.get('location_id')
        
        from .insights_service import ReviewInsightsService
        service = ReviewInsightsService()
        
        insights = service.get_insights_summary(
            account_id=account.id,
            location_id=location_id
        )
        
        return Response(insights, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='insights/topics')
    def topic_trends(self, request):
        """Get topic trends for account"""
        account = request.user.account
        location_id = request.query_params.get('location_id')
        
        from .models import TopicTrend
        from .serializers import TopicTrendSerializer
        
        trends_query = TopicTrend.objects.filter(
            account=account,
            is_active=True
        )
        
        if location_id:
            trends_query = trends_query.filter(location_id=location_id)
        
        # Filter by trend direction
        direction_filter = request.query_params.get('direction')
        if direction_filter:
            trends_query = trends_query.filter(trend_direction=direction_filter.upper())
        
        # Filter by sentiment
        sentiment_filter = request.query_params.get('sentiment')
        if sentiment_filter:
            trends_query = trends_query.filter(overall_sentiment=sentiment_filter.upper())
        
        # Filter by category
        category_filter = request.query_params.get('category')
        if category_filter:
            trends_query = trends_query.filter(category=category_filter)
        
        # Order by mentions (most popular first)
        trends = trends_query.order_by('-current_mentions')
        
        serializer = TopicTrendSerializer(trends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='insights/topic/(?P<topic_name>[^/.]+)')
    def topic_detail(self, request, topic_name=None):
        """Get detailed timeline for a specific topic"""
        account = request.user.account
        location_id = request.query_params.get('location_id')
        
        from .models import ReviewTopicSnapshot
        from .serializers import ReviewTopicSnapshotSerializer
        
        # Get snapshots for this topic over time
        snapshots_query = ReviewTopicSnapshot.objects.filter(
            account=account,
            topic=topic_name,
            window_type='weekly'
        )
        
        if location_id:
            snapshots_query = snapshots_query.filter(location_id=location_id)
        
        snapshots = snapshots_query.order_by('-snapshot_date')[:12]  # Last 12 weeks
        
        serializer = ReviewTopicSnapshotSerializer(snapshots, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='insights/generate')
    def generate_insights(self, request):
        """Manually trigger insights generation for account"""
        account = request.user.account
        
        from .insights_service import ReviewInsightsService
        service = ReviewInsightsService()
        
        try:
            # Generate snapshots
            snapshots = service.generate_topic_snapshots(
                account_id=account.id,
                window_type='weekly'
            )
            
            # Calculate trends
            trends = service.calculate_trends(account_id=account.id)
            
            return Response({
                'message': 'Insights generated successfully',
                'snapshots_created': len(snapshots),
                'trends_calculated': len(trends)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.exception('Failed to generate insights')
            return Response({
                'error': f'Failed to generate insights: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
