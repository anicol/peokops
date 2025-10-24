"""
Shift Checker Service

Helper functions to check if employees are on shift before sending micro-checks.
"""

from typing import Optional, Dict
from datetime import datetime
from django.utils import timezone
import logging

from brands.models import Store
from .models import SevenShiftsConfig, SevenShiftsEmployee, SevenShiftsShift

logger = logging.getLogger(__name__)


class ShiftChecker:
    """Service for checking if employees are currently on shift"""

    @staticmethod
    def is_shift_enforcement_enabled(store: Store) -> bool:
        """
        Check if shift enforcement is enabled for a store's account.

        Args:
            store: Store instance

        Returns:
            True if shift enforcement is enabled and configured, False otherwise
        """
        if not store.account:
            return False

        try:
            config = SevenShiftsConfig.objects.get(
                account=store.account,
                is_active=True
            )
            return config.enforce_shift_schedule
        except SevenShiftsConfig.DoesNotExist:
            return False

    @staticmethod
    def get_employee_by_email(email: str, store: Store) -> Optional[SevenShiftsEmployee]:
        """
        Find a 7shifts employee record by email.

        Args:
            email: Employee email address
            store: Store instance

        Returns:
            SevenShiftsEmployee if found, None otherwise
        """
        if not store.account:
            return None

        try:
            return SevenShiftsEmployee.objects.get(
                account=store.account,
                email__iexact=email,
                is_active=True
            )
        except SevenShiftsEmployee.DoesNotExist:
            return None

    @staticmethod
    def is_employee_on_shift(employee: SevenShiftsEmployee,
                            check_time: Optional[datetime] = None) -> bool:
        """
        Check if an employee is currently on shift.

        Args:
            employee: SevenShiftsEmployee instance
            check_time: Time to check (defaults to now)

        Returns:
            True if employee has an active shift at check_time, False otherwise
        """
        if check_time is None:
            check_time = timezone.now()

        # Query for shifts that overlap with check_time
        active_shift = SevenShiftsShift.objects.filter(
            employee=employee,
            start_time__lte=check_time,
            end_time__gte=check_time
        ).first()

        return active_shift is not None

    @staticmethod
    def get_current_shift(employee: SevenShiftsEmployee,
                         check_time: Optional[datetime] = None) -> Optional[SevenShiftsShift]:
        """
        Get the employee's current shift if they are working.

        Args:
            employee: SevenShiftsEmployee instance
            check_time: Time to check (defaults to now)

        Returns:
            SevenShiftsShift if employee is on shift, None otherwise
        """
        if check_time is None:
            check_time = timezone.now()

        return SevenShiftsShift.objects.filter(
            employee=employee,
            start_time__lte=check_time,
            end_time__gte=check_time
        ).first()

    @staticmethod
    def should_send_micro_check(email: str, store: Store,
                               check_time: Optional[datetime] = None) -> Dict[str, any]:
        """
        Determine if a micro-check should be sent to an employee based on shift schedule.

        This is the main function to call before sending a micro-check.

        Args:
            email: Employee email address
            store: Store instance
            check_time: Time to check (defaults to now)

        Returns:
            Dictionary with:
                - should_send (bool): Whether to send the check
                - reason (str): Reason for the decision
                - employee (SevenShiftsEmployee or None): Employee record if found
                - shift (SevenShiftsShift or None): Current shift if on shift
        """
        if check_time is None:
            check_time = timezone.now()

        # Check if shift enforcement is enabled for this store
        if not ShiftChecker.is_shift_enforcement_enabled(store):
            return {
                'should_send': True,
                'reason': 'shift_enforcement_disabled',
                'employee': None,
                'shift': None
            }

        # Try to find employee in 7shifts data
        employee = ShiftChecker.get_employee_by_email(email, store)

        if not employee:
            # Employee not found in 7shifts - send anyway (they might not use 7shifts)
            logger.info(f"Employee {email} not found in 7shifts, sending check anyway")
            return {
                'should_send': True,
                'reason': 'employee_not_in_7shifts',
                'employee': None,
                'shift': None
            }

        # Check if employee is on shift
        current_shift = ShiftChecker.get_current_shift(employee, check_time)

        if current_shift:
            return {
                'should_send': True,
                'reason': 'employee_on_shift',
                'employee': employee,
                'shift': current_shift
            }
        else:
            logger.info(
                f"Employee {email} is not on shift at {check_time}, skipping micro-check"
            )
            return {
                'should_send': False,
                'reason': 'employee_not_on_shift',
                'employee': employee,
                'shift': None
            }

    @staticmethod
    def get_employees_on_shift_at_store(store: Store,
                                       check_time: Optional[datetime] = None) -> list:
        """
        Get all employees currently on shift at a store.

        Args:
            store: Store instance
            check_time: Time to check (defaults to now)

        Returns:
            List of dictionaries with employee and shift info
        """
        if check_time is None:
            check_time = timezone.now()

        if not store.account:
            return []

        # Get all active shifts at this store overlapping with check_time
        active_shifts = SevenShiftsShift.objects.filter(
            store=store,
            start_time__lte=check_time,
            end_time__gte=check_time
        ).select_related('employee')

        return [
            {
                'employee': shift.employee,
                'shift': shift,
                'email': shift.employee.email,
                'name': f"{shift.employee.first_name} {shift.employee.last_name}",
                'role': shift.role
            }
            for shift in active_shifts
        ]
