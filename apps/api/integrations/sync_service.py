"""
7shifts Sync Service

Handles synchronization of employees and shifts from 7shifts to local database.
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction

from brands.models import Store
from .models import (
    SevenShiftsConfig, SevenShiftsEmployee, SevenShiftsShift,
    SevenShiftsSyncLog
)
from .seven_shifts_client import SevenShiftsClient


logger = logging.getLogger(__name__)


class SevenShiftsSyncService:
    """Service for syncing 7shifts data to local database"""

    def __init__(self, config: SevenShiftsConfig):
        """
        Initialize sync service with a 7shifts configuration.

        Args:
            config: SevenShiftsConfig instance
        """
        self.config = config
        self.account = config.account

        # Decrypt token and create client
        access_token = SevenShiftsClient.decrypt_token(config.access_token_encrypted)
        self.client = SevenShiftsClient(access_token)

    def sync_all(self) -> dict:
        """
        Sync both employees and shifts.

        Returns:
            dict with sync results
        """
        results = {}

        if self.config.sync_employees_enabled:
            results['employees'] = self.sync_employees()

        if self.config.sync_shifts_enabled:
            results['shifts'] = self.sync_shifts()

        return results

    def sync_employees(self) -> dict:
        """
        Sync employees from 7shifts.

        Returns:
            dict with sync statistics
        """
        sync_log = SevenShiftsSyncLog.objects.create(
            account=self.account,
            sync_type=SevenShiftsSyncLog.SyncType.EMPLOYEES,
            status=SevenShiftsSyncLog.Status.SUCCESS  # Will update if fails
        )

        start_time = timezone.now()
        employees_synced = 0
        errors = []

        try:
            # Fetch all users from 7shifts
            users = self.client.list_users(active_only=False)

            # Also fetch locations to map employees to stores
            locations = self.client.list_locations()
            location_map = self._build_location_to_store_map(locations)

            for user in users:
                try:
                    self._sync_employee(user, location_map)
                    employees_synced += 1
                except Exception as e:
                    error_msg = f"Failed to sync employee {user.get('id')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

            # Update config last sync time
            self.config.last_sync_at = timezone.now()
            self.config.save()

            # Update sync log
            sync_log.items_synced = employees_synced
            sync_log.errors_count = len(errors)
            sync_log.error_details = {'errors': errors} if errors else {}
            sync_log.status = (SevenShiftsSyncLog.Status.PARTIAL
                             if errors else SevenShiftsSyncLog.Status.SUCCESS)
            sync_log.completed_at = timezone.now()
            sync_log.duration_seconds = (timezone.now() - start_time).total_seconds()
            sync_log.save()

            return {
                'employees_synced': employees_synced,
                'errors_count': len(errors),
                'errors': errors[:5]  # Return first 5 errors
            }

        except Exception as e:
            logger.error(f"Employee sync failed: {str(e)}")

            sync_log.status = SevenShiftsSyncLog.Status.FAILED
            sync_log.errors_count = 1
            sync_log.error_details = {'error': str(e)}
            sync_log.completed_at = timezone.now()
            sync_log.duration_seconds = (timezone.now() - start_time).total_seconds()
            sync_log.save()

            raise

    def sync_shifts(self, days_ahead: int = 14) -> dict:
        """
        Sync shifts from 7shifts for the next N days.

        Args:
            days_ahead: Number of days to sync ahead (default: 14)

        Returns:
            dict with sync statistics
        """
        sync_log = SevenShiftsSyncLog.objects.create(
            account=self.account,
            sync_type=SevenShiftsSyncLog.SyncType.SHIFTS,
            status=SevenShiftsSyncLog.Status.SUCCESS
        )

        start_time = timezone.now()
        shifts_synced = 0
        errors = []

        try:
            # Define date range
            start_date = timezone.now()
            end_date = start_date + timedelta(days=days_ahead)

            # Fetch shifts from 7shifts
            shifts = self.client.list_shifts(start_date, end_date)

            for shift in shifts:
                try:
                    self._sync_shift(shift)
                    shifts_synced += 1
                except Exception as e:
                    error_msg = f"Failed to sync shift {shift.get('id')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

            # Update config last sync time
            self.config.last_sync_at = timezone.now()
            self.config.save()

            # Update sync log
            sync_log.items_synced = shifts_synced
            sync_log.errors_count = len(errors)
            sync_log.error_details = {'errors': errors} if errors else {}
            sync_log.status = (SevenShiftsSyncLog.Status.PARTIAL
                             if errors else SevenShiftsSyncLog.Status.SUCCESS)
            sync_log.completed_at = timezone.now()
            sync_log.duration_seconds = (timezone.now() - start_time).total_seconds()
            sync_log.save()

            return {
                'shifts_synced': shifts_synced,
                'errors_count': len(errors),
                'errors': errors[:5]
            }

        except Exception as e:
            logger.error(f"Shift sync failed: {str(e)}")

            sync_log.status = SevenShiftsSyncLog.Status.FAILED
            sync_log.errors_count = 1
            sync_log.error_details = {'error': str(e)}
            sync_log.completed_at = timezone.now()
            sync_log.duration_seconds = (timezone.now() - start_time).total_seconds()
            sync_log.save()

            raise

    def _build_location_to_store_map(self, locations: list) -> dict:
        """
        Build mapping from 7shifts location IDs to PeakOps store IDs.

        This attempts to match locations by name or requires manual mapping.

        Args:
            locations: List of 7shifts locations

        Returns:
            dict mapping location_id -> store_id
        """
        location_map = {}

        for location in locations:
            location_id = str(location.get('id'))
            location_name = location.get('name', '')

            # Try to find matching store by name
            store = Store.objects.filter(
                account=self.account,
                name__iexact=location_name
            ).first()

            if store:
                location_map[location_id] = store.id
                logger.info(f"Mapped 7shifts location '{location_name}' to store {store.id}")
            else:
                logger.warning(f"No store match found for 7shifts location '{location_name}'")

        return location_map

    @transaction.atomic
    def _sync_employee(self, user_data: dict, location_map: dict):
        """
        Sync a single employee from 7shifts data.

        Args:
            user_data: User dict from 7shifts API
            location_map: Mapping of location_id to store_id
        """
        seven_shifts_id = str(user_data.get('id'))

        # Get location/store
        location_id = user_data.get('location_id')
        store_id = location_map.get(str(location_id)) if location_id else None

        # Extract employee data
        employee_data = {
            'account': self.account,
            'seven_shifts_id': seven_shifts_id,
            'seven_shifts_location_id': str(location_id) if location_id else '',
            'email': user_data.get('email', ''),
            'phone': user_data.get('phone', ''),
            'first_name': user_data.get('firstname', ''),
            'last_name': user_data.get('lastname', ''),
            'is_active': user_data.get('active', True),
        }

        # Add store if we found a mapping
        if store_id:
            employee_data['store_id'] = store_id

        # Create or update employee
        SevenShiftsEmployee.objects.update_or_create(
            seven_shifts_id=seven_shifts_id,
            defaults=employee_data
        )

    @transaction.atomic
    def _sync_shift(self, shift_data: dict):
        """
        Sync a single shift from 7shifts data.

        Args:
            shift_data: Shift dict from 7shifts API
        """
        seven_shifts_shift_id = str(shift_data.get('id'))

        # Get employee
        user_id = shift_data.get('user', {}).get('id')
        if not user_id:
            logger.warning(f"Shift {seven_shifts_shift_id} has no user_id, skipping")
            return

        try:
            employee = SevenShiftsEmployee.objects.get(
                seven_shifts_id=str(user_id),
                account=self.account
            )
        except SevenShiftsEmployee.DoesNotExist:
            logger.warning(f"Employee {user_id} not found, skipping shift {seven_shifts_shift_id}")
            return

        # Parse dates
        start_time = datetime.fromisoformat(shift_data['start'].replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(shift_data['end'].replace('Z', '+00:00'))

        # Get store from employee or location
        store = employee.store
        if not store:
            logger.warning(f"No store for employee {employee.id}, skipping shift")
            return

        # Create or update shift
        SevenShiftsShift.objects.update_or_create(
            seven_shifts_shift_id=seven_shifts_shift_id,
            defaults={
                'employee': employee,
                'account': self.account,
                'store': store,
                'start_time': start_time,
                'end_time': end_time,
                'role': shift_data.get('role', {}).get('name', ''),
            }
        )
