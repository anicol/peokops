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
    SevenShiftsSyncLog
)
from .serializers import (
    SevenShiftsConfigSerializer, SevenShiftsEmployeeSerializer,
    SevenShiftsShiftSerializer, SevenShiftsSyncLogSerializer,
    SevenShiftsConfigureRequestSerializer, SevenShiftsSyncRequestSerializer
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
            "enforce_shift_schedule": true
        }
        """
        if not request.user.account:
            return Response(
                {'error': 'User not associated with an account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SevenShiftsConfigureRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data['access_token']

        # Test the connection first
        client = SevenShiftsClient(access_token)
        if not client.test_connection():
            return Response(
                {'error': 'Invalid 7shifts credentials or connection failed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Encrypt the token
        encrypted_token = SevenShiftsClient.encrypt_token(access_token)

        # Create or update configuration
        config, created = SevenShiftsConfig.objects.update_or_create(
            account=request.user.account,
            defaults={
                'access_token_encrypted': encrypted_token,
                'company_id': serializer.validated_data['company_id'],
                'is_active': True,
                'sync_employees_enabled': serializer.validated_data.get('sync_employees_enabled', True),
                'sync_shifts_enabled': serializer.validated_data.get('sync_shifts_enabled', True),
                'enforce_shift_schedule': serializer.validated_data.get('enforce_shift_schedule', True),
                'created_by': request.user
            }
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

        client = SevenShiftsClient(access_token)
        is_valid = client.test_connection()

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
                {'success': False, 'error': 'Connection failed'},
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
