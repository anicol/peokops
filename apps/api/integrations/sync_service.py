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
        self.client = SevenShiftsClient(access_token, company_id=config.company_id)

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
        synced_employees = []
        failed_employees = []

        try:
            # Fetch all users from 7shifts
            users = self.client.list_users(active_only=False)
            logger.info(f"Fetched {len(users)} users from 7shifts")

            # Try to fetch locations to map employees to stores
            # If this fails, we'll still sync employees without location mapping
            location_map = {}
            locations_data = []
            try:
                locations = self.client.list_locations()
                logger.info(f"Fetched {len(locations)} locations from 7shifts")
                locations_data = locations  # Store raw location data
                location_map = self._build_location_to_store_map(locations)
            except Exception as e:
                logger.warning(f"Failed to fetch locations from 7shifts: {str(e)}")
                logger.warning("Continuing employee sync without location mapping")

            synced_seven_shifts_ids = []
            for user in users:
                try:
                    employee, employee_roles = self._sync_employee(user, location_map)
                    employees_synced += 1
                    synced_seven_shifts_ids.append(employee.seven_shifts_id)

                    # Find location name from locations_data
                    location_name = None
                    if employee.seven_shifts_location_id and locations_data:
                        for loc in locations_data:
                            if str(loc.get('id')) == employee.seven_shifts_location_id:
                                location_name = loc.get('name')
                                break

                    synced_employees.append({
                        'id': user.get('id'),
                        'name': f"{user.get('first_name', '')} {user.get('last_name', '')}",
                        'email': user.get('email', ''),
                        'location_id': employee.seven_shifts_location_id,
                        'location_name': location_name,
                        'store_id': str(employee.store_id) if employee.store else None,
                        'store_name': employee.store.name if employee.store else None,
                        'roles': employee_roles,  # Include roles for debugging
                        'data': user  # Store complete raw user data
                    })
                except Exception as e:
                    error_msg = f"Failed to sync employee {user.get('id')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    failed_employees.append({
                        'id': user.get('id'),
                        'name': f"{user.get('first_name', '')} {user.get('last_name', '')}",
                        'email': user.get('email', ''),
                        'error': str(e),
                        'data': user  # Store complete raw user data even on failure
                    })

            # Remove employees that are no longer in 7shifts or don't match role filter
            removed_count = self._remove_unsynced_employees(synced_seven_shifts_ids)

            # Update config last sync time
            self.config.last_sync_at = timezone.now()
            self.config.save()

            # Auto-map or create users for employees
            user_mapping_results = self.map_or_create_users()

            # Update sync log with comprehensive data
            sync_log.items_synced = employees_synced
            sync_log.errors_count = len(errors)
            sync_log.error_details = {
                'errors': errors,
                'synced_employees': synced_employees,
                'failed_employees': failed_employees,
                'locations': locations_data,
                'location_map': {loc_id: store_id for loc_id, store_id in location_map.items()},
                'user_mapping': user_mapping_results,
                'removed_count': removed_count,
                'summary': {
                    'total_fetched': len(users),
                    'successfully_synced': employees_synced,
                    'failed': len(failed_employees),
                    'removed': removed_count,
                    'locations_count': len(locations_data)
                }
            }
            sync_log.status = (SevenShiftsSyncLog.Status.PARTIAL
                             if errors else SevenShiftsSyncLog.Status.SUCCESS)
            sync_log.completed_at = timezone.now()
            sync_log.duration_seconds = (timezone.now() - start_time).total_seconds()
            sync_log.save()

            return {
                'employees_synced': employees_synced,
                'errors_count': len(errors),
                'errors': errors[:5],  # Return first 5 errors
                'user_mapping': user_mapping_results
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
        synced_shifts = []
        failed_shifts = []

        try:
            # Define date range
            start_date = timezone.now()
            end_date = start_date + timedelta(days=days_ahead)

            # Fetch shifts from 7shifts
            shifts = self.client.list_shifts(start_date, end_date)
            logger.info(f"Fetched {len(shifts)} shifts from 7shifts for {start_date.date()} to {end_date.date()}")

            for shift in shifts:
                try:
                    self._sync_shift(shift)
                    shifts_synced += 1
                    synced_shifts.append({
                        'id': shift.get('id'),
                        'user_id': shift.get('user', {}).get('id') or shift.get('user_id'),
                        'start': shift.get('start'),
                        'end': shift.get('end'),
                        'role': shift.get('role', {}).get('name', ''),
                        'data': shift  # Store complete raw shift data
                    })
                except Exception as e:
                    error_msg = f"Failed to sync shift {shift.get('id')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    failed_shifts.append({
                        'id': shift.get('id'),
                        'user_id': shift.get('user', {}).get('id') or shift.get('user_id'),
                        'error': str(e),
                        'data': shift  # Store complete raw shift data even on failure
                    })

            # Update config last sync time
            self.config.last_sync_at = timezone.now()
            self.config.save()

            # Update sync log with comprehensive data
            sync_log.items_synced = shifts_synced
            sync_log.errors_count = len(errors)
            sync_log.error_details = {
                'errors': errors,
                'synced_shifts': synced_shifts,
                'failed_shifts': failed_shifts,
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'summary': {
                    'total_fetched': len(shifts),
                    'successfully_synced': shifts_synced,
                    'failed': len(failed_shifts),
                    'days_ahead': days_ahead
                }
            }
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

    def map_or_create_users(self) -> dict:
        """
        Auto-map employees to existing users by email, or create new users.

        Looks for SevenShiftsEmployee records without a user mapping,
        tries to match by email to existing users, and creates new users
        for employees without a match.

        Returns:
            dict with mapping/creation statistics
        """
        from django.contrib.auth import get_user_model
        from django.db.models import Count
        User = get_user_model()

        # First, update employee stores from their shifts if they don't have one
        self._update_employee_stores_from_shifts()

        # Also sync store assignments to already-mapped users
        self._sync_stores_to_mapped_users()

        # Find all employees without a user mapping
        unmapped_employees = SevenShiftsEmployee.objects.filter(
            account=self.account,
            user__isnull=True
        )

        mapped_count = 0
        created_count = 0
        skipped_count = 0
        temp_email_count = 0
        mapped_details = []
        created_details = []
        skipped_details = []
        temp_email_details = []

        for employee in unmapped_employees:
            # Handle employees without email
            if not employee.email:
                # If config allows, create with temporary email
                if self.config.create_users_without_email:
                    # Generate temporary email: temp_7shifts_{seven_shifts_id}@{account_id}.temp.local
                    temp_email = f"temp_7shifts_{employee.seven_shifts_id}@{str(self.account.id)}.temp.local"

                    try:
                        # Create user with temporary email
                        username = f"7shifts_{employee.seven_shifts_id}"

                        # Determine role based on 7shifts roles
                        user_role = self._map_seven_shifts_role_to_peakops(employee.roles or [])

                        user = User.objects.create(
                            username=username,
                            email=temp_email,
                            first_name=employee.first_name,
                            last_name=employee.last_name,
                            phone=employee.phone,
                            account=self.account,
                            store=employee.store,
                            role=user_role,
                            is_active=employee.is_active
                        )
                        user.set_unusable_password()
                        user.save()

                        employee.user = user
                        employee.save()

                        created_count += 1
                        temp_email_count += 1
                        temp_email_details.append({
                            'employee_id': str(employee.id),
                            'employee_name': f"{employee.first_name} {employee.last_name}",
                            'user_id': str(user.id),
                            'username': username,
                            'temp_email': temp_email,
                            'phone': employee.phone or 'No phone',
                            'store': employee.store.name if employee.store else None
                        })
                        logger.info(f"Created user with temporary email for employee {employee.seven_shifts_id}")
                    except Exception as e:
                        skipped_count += 1
                        skipped_details.append({
                            'employee_id': str(employee.id),
                            'name': f"{employee.first_name} {employee.last_name}",
                            'reason': f'Failed to create with temp email: {str(e)}'
                        })
                        logger.error(f"Failed to create user with temp email for {employee.seven_shifts_id}: {str(e)}")
                    continue
                else:
                    skipped_count += 1
                    skipped_details.append({
                        'employee_id': str(employee.id),
                        'name': f"{employee.first_name} {employee.last_name}",
                        'reason': 'No email address (temp email creation disabled)'
                    })
                    continue

            try:
                # Try to find existing user by email in same account
                existing_user = User.objects.filter(
                    email=employee.email,
                    account=self.account
                ).first()

                if existing_user:
                    # Map to existing user
                    employee.user = existing_user
                    employee.save()
                    mapped_count += 1
                    mapped_details.append({
                        'employee_id': str(employee.id),
                        'employee_name': f"{employee.first_name} {employee.last_name}",
                        'user_id': str(existing_user.id),
                        'user_email': existing_user.email,
                        'user_name': existing_user.get_full_name()
                    })
                    logger.info(f"Mapped employee {employee.email} to existing user {existing_user.id}")
                else:
                    # Create new user
                    # Use email as username so they can login with their email
                    username = employee.email

                    # Determine role based on 7shifts roles
                    user_role = self._map_seven_shifts_role_to_peakops(employee.roles or [])

                    user = User.objects.create(
                        username=username,
                        email=employee.email,
                        first_name=employee.first_name,
                        last_name=employee.last_name,
                        phone=employee.phone,  # Sync phone number from 7shifts
                        account=self.account,
                        store=employee.store,  # Assign to same store as employee
                        role=user_role,
                        is_active=employee.is_active
                    )

                    # Set unusable password - user will need to reset via email
                    user.set_unusable_password()
                    user.save()

                    # Link employee to new user
                    employee.user = user
                    employee.save()

                    created_count += 1
                    created_details.append({
                        'employee_id': str(employee.id),
                        'employee_name': f"{employee.first_name} {employee.last_name}",
                        'user_id': str(user.id),
                        'username': user.username,
                        'email': user.email,
                        'store': employee.store.name if employee.store else None
                    })
                    logger.info(f"Created new user {user.username} for employee {employee.email}")

            except Exception as e:
                skipped_count += 1
                skipped_details.append({
                    'employee_id': str(employee.id),
                    'name': f"{employee.first_name} {employee.last_name}",
                    'email': employee.email,
                    'reason': str(e)
                })
                logger.error(f"Failed to map/create user for employee {employee.email}: {str(e)}")

        return {
            'total_unmapped': unmapped_employees.count(),
            'mapped': mapped_count,
            'created': created_count,
            'skipped': skipped_count,
            'temp_email_count': temp_email_count,
            'mapped_details': mapped_details,
            'created_details': created_details,
            'skipped_details': skipped_details,
            'temp_email_details': temp_email_details
        }

    def _update_employee_stores_from_shifts(self):
        """
        Update employee store assignments based on their shift history.

        For employees without a store, find their most common shift location
        and assign them to that store.
        """
        from django.db.models import Count

        # Get all employees without a store in this account
        employees_without_store = SevenShiftsEmployee.objects.filter(
            account=self.account,
            store__isnull=True
        )

        updated_count = 0
        for employee in employees_without_store:
            # Get shifts for this employee
            shifts = SevenShiftsShift.objects.filter(employee=employee)

            if not shifts.exists():
                continue

            # Find the most common store from shifts
            store_counts = shifts.values('store').annotate(
                count=Count('id')
            ).order_by('-count')

            if store_counts and store_counts[0]['store']:
                store_id = store_counts[0]['store']
                employee.store_id = store_id
                employee.save()
                updated_count += 1
                logger.info(f"Assigned store {store_id} to employee {employee.email} based on {store_counts[0]['count']} shifts")

        if updated_count > 0:
            logger.info(f"Updated {updated_count} employees with stores from their shift history")

    def _sync_stores_to_mapped_users(self):
        """
        Sync store and phone number from employees to their mapped users.

        Updates users to match their employee's store assignment and phone number.
        """
        # Get all employees with a user mapping
        mapped_employees = SevenShiftsEmployee.objects.filter(
            account=self.account,
            user__isnull=False
        ).select_related('user', 'store')

        updated_count = 0
        for employee in mapped_employees:
            needs_update = False

            # Update user store if it doesn't match employee store
            if employee.store and employee.user.store_id != employee.store_id:
                employee.user.store = employee.store
                needs_update = True
                logger.info(f"Updated user {employee.user.username} store to {employee.store.name}")

            # Update user phone if it doesn't match employee phone
            if employee.phone and employee.user.phone != employee.phone:
                employee.user.phone = employee.phone
                needs_update = True
                logger.info(f"Updated user {employee.user.username} phone to {employee.phone}")

            if needs_update:
                employee.user.save()
                updated_count += 1

        if updated_count > 0:
            logger.info(f"Synced {updated_count} user records from employees (store/phone)")

    def _map_seven_shifts_role_to_peakops(self, seven_shifts_roles: list) -> str:
        """
        Map 7shifts role names to PeakOps user roles.

        Args:
            seven_shifts_roles: List of 7shifts role names (e.g., ['Manager', 'Server'])

        Returns:
            PeakOps role string (User.Role value)
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Role mapping - prioritize management roles
        # Check roles in priority order (higher roles first)
        role_mapping = {
            # Management roles -> GM
            'manager': User.Role.GM,
            'general manager': User.Role.GM,
            'assistant manager': User.Role.GM,
            'shift manager': User.Role.GM,
            'shift lead': User.Role.GM,

            # All other roles -> EMPLOYEE (servers, cooks, hosts, bartenders, etc.)
        }

        # Check if any role matches management
        for seven_shifts_role in seven_shifts_roles:
            role_lower = seven_shifts_role.lower()
            if role_lower in role_mapping:
                return role_mapping[role_lower]

        # Default to EMPLOYEE for all other roles
        return User.Role.EMPLOYEE

    def _remove_unsynced_employees(self, synced_seven_shifts_ids: list) -> int:
        """
        Remove employees from database that were not synced in this run.

        This handles cases where:
        - Employee no longer exists in 7shifts
        - Employee's role no longer matches the role filter

        Args:
            synced_seven_shifts_ids: List of 7shifts IDs that were successfully synced

        Returns:
            Number of employees removed
        """
        # Find employees in our database that weren't in this sync
        employees_to_remove = SevenShiftsEmployee.objects.filter(
            account=self.account
        ).exclude(
            seven_shifts_id__in=synced_seven_shifts_ids
        )

        removed_count = employees_to_remove.count()

        if removed_count > 0:
            # Log which employees are being removed
            for employee in employees_to_remove:
                logger.info(
                    f"Removing employee {employee.first_name} {employee.last_name} "
                    f"({employee.email}) - no longer matches sync criteria"
                )

            # Delete the employees (CASCADE will handle related shifts)
            employees_to_remove.delete()
            logger.info(f"Removed {removed_count} employees that no longer match sync criteria")

        return removed_count

    def _build_location_to_store_map(self, locations: list) -> dict:
        """
        Build mapping from 7shifts location IDs to PeakOps store IDs.

        Checks for manual mappings first, then falls back to automatic name matching.

        Args:
            locations: List of 7shifts locations

        Returns:
            dict mapping location_id -> store_id
        """
        from .models import SevenShiftsLocationMapping

        location_map = {}

        # Get all manual mappings for this account
        manual_mappings = SevenShiftsLocationMapping.objects.filter(
            account=self.account
        ).select_related('store')
        manual_mapping_dict = {m.seven_shifts_location_id: m.store.id for m in manual_mappings}

        for location in locations:
            location_id = str(location.get('id'))
            location_name = location.get('name', '')

            # Check for manual mapping first
            if location_id in manual_mapping_dict:
                store_id = manual_mapping_dict[location_id]
                location_map[location_id] = store_id
                logger.info(f"Using manual mapping: 7shifts location '{location_name}' → store {store_id}")
                continue

            # Fall back to automatic name matching
            store = Store.objects.filter(
                account=self.account,
                name__iexact=location_name
            ).first()

            if store:
                location_map[location_id] = store.id
                logger.info(f"Auto-mapped 7shifts location '{location_name}' to store {store.id}")
            else:
                logger.warning(f"No store match found for 7shifts location '{location_name}'")

        return location_map

    @transaction.atomic
    def _sync_employee(self, user_data: dict, location_map: dict) -> tuple[SevenShiftsEmployee, list]:
        """
        Sync a single employee from 7shifts data.

        Args:
            user_data: User dict from 7shifts API
            location_map: Mapping of location_id to store_id

        Returns:
            Tuple of (SevenShiftsEmployee instance, list of role names)
        """
        seven_shifts_id = str(user_data.get('id'))

        # Fetch user assignments to get location/department/role data
        location_id = None
        user_roles = []
        try:
            assignments = self.client.get_user_assignments(seven_shifts_id)
            locations = assignments.get('locations', [])
            # Use the first location as primary (users can have multiple locations)
            if locations:
                location_id = str(locations[0].get('id'))
                logger.debug(f"User {seven_shifts_id} assigned to location {location_id}")

            # Extract role names from assignments
            roles = assignments.get('roles', [])
            user_roles = [role.get('name') for role in roles if role.get('name')]

        except Exception as e:
            logger.warning(f"Failed to fetch assignments for user {seven_shifts_id}: {str(e)}")

        # Check role filtering if configured
        if self.config.sync_role_names:  # If list is not empty
            if not user_roles:
                # Employee has no roles assigned, skip if role filtering is enabled
                raise Exception(f"Employee has no roles assigned and role filtering is enabled")

            # Check if any of the employee's roles match the configured sync list
            if not any(role in self.config.sync_role_names for role in user_roles):
                raise Exception(f"Employee roles {user_roles} not in configured sync list {self.config.sync_role_names}")

        # Map location to store
        store_id = location_map.get(str(location_id)) if location_id else None

        # Extract employee data
        employee_data = {
            'account': self.account,
            'seven_shifts_id': seven_shifts_id,
            'seven_shifts_location_id': str(location_id) if location_id else '',
            'email': user_data.get('email', ''),
            'phone': user_data.get('mobile_number', ''),
            'first_name': user_data.get('first_name', ''),
            'last_name': user_data.get('last_name', ''),
            'is_active': user_data.get('active', True),
            'roles': user_roles,  # Store 7shifts roles
        }

        # Add store if we found a mapping
        if store_id:
            employee_data['store_id'] = store_id

        # Create or update employee
        employee, created = SevenShiftsEmployee.objects.update_or_create(
            seven_shifts_id=seven_shifts_id,
            defaults=employee_data
        )

        return employee, user_roles

    @transaction.atomic
    def _sync_shift(self, shift_data: dict):
        """
        Sync a single shift from 7shifts data.

        Args:
            shift_data: Shift dict from 7shifts API
        """
        seven_shifts_shift_id = str(shift_data.get('id'))

        # Get employee - try both user.id (nested) and user_id (top-level)
        user_id = shift_data.get('user', {}).get('id') or shift_data.get('user_id')
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

        # Get store from shift location or employee
        store = employee.store
        if not store:
            # Try to get store from shift's location_id
            shift_location_id = str(shift_data.get('location_id', ''))
            if shift_location_id:
                from .models import SevenShiftsLocationMapping
                try:
                    mapping = SevenShiftsLocationMapping.objects.get(
                        account=self.account,
                        seven_shifts_location_id=shift_location_id
                    )
                    store = mapping.store
                except SevenShiftsLocationMapping.DoesNotExist:
                    logger.warning(f"No location mapping found for location {shift_location_id}, skipping shift")
                    return
            else:
                logger.warning(f"No store for employee {employee.id} and no location_id in shift, skipping")
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
