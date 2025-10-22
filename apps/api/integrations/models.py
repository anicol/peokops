import uuid
from django.db import models
from django.conf import settings


class SevenShiftsConfig(models.Model):
    """7shifts integration configuration per account (franchisee)

    Each franchisee account can have its own 7shifts integration,
    allowing them to sync employees and schedules independently.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.OneToOneField('accounts.Account', on_delete=models.CASCADE,
                                    related_name='seven_shifts_config',
                                    help_text="Franchisee account that owns this integration")

    # 7shifts API credentials
    access_token_encrypted = models.BinaryField(help_text="Encrypted 7shifts API access token")
    company_id = models.CharField(max_length=100, help_text="7shifts company ID")

    # Integration status
    is_active = models.BooleanField(default=True, help_text="Whether integration is enabled")
    last_sync_at = models.DateTimeField(null=True, blank=True, help_text="Last successful sync timestamp")

    # Sync configuration
    sync_employees_enabled = models.BooleanField(default=True,
                                                 help_text="Auto-sync employees from 7shifts")
    sync_shifts_enabled = models.BooleanField(default=True,
                                              help_text="Auto-sync shift schedules from 7shifts")

    # Only send micro-checks to employees on shift
    enforce_shift_schedule = models.BooleanField(default=True,
                                                 help_text="Only send checks when employee is on shift")

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
                                   related_name='created_seven_shifts_configs')

    class Meta:
        db_table = 'seven_shifts_configs'
        verbose_name = '7shifts Configuration'
        verbose_name_plural = '7shifts Configurations'

    def __str__(self):
        return f"7shifts Config for {self.account.name}"


class SevenShiftsEmployee(models.Model):
    """Cached employee data from 7shifts

    Synced periodically to match employees with PeakOps users
    and enable shift-based notification delivery.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='seven_shifts_employees',
                                help_text="Franchisee account")
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE, null=True, blank=True,
                             related_name='seven_shifts_employees',
                             help_text="Store this employee works at (mapped from location_id)")

    # 7shifts IDs
    seven_shifts_id = models.CharField(max_length=100, unique=True, db_index=True,
                                       help_text="7shifts user ID")
    seven_shifts_location_id = models.CharField(max_length=100, blank=True,
                                                help_text="7shifts location ID")

    # Employee info
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=20, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    # Status
    is_active = models.BooleanField(default=True, help_text="Employee is active in 7shifts")

    # Sync tracking
    synced_at = models.DateTimeField(auto_now=True, help_text="Last sync from 7shifts")

    class Meta:
        db_table = 'seven_shifts_employees'
        verbose_name = '7shifts Employee'
        verbose_name_plural = '7shifts Employees'
        indexes = [
            models.Index(fields=['account', 'is_active']),
            models.Index(fields=['store', 'is_active']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"


class SevenShiftsShift(models.Model):
    """Cached shift schedules from 7shifts

    Used to determine when employees are working so micro-checks
    are only sent during their shifts.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(SevenShiftsEmployee, on_delete=models.CASCADE,
                                 related_name='shifts', help_text="Employee assigned to this shift")
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='seven_shifts_shifts')
    store = models.ForeignKey('brands.Store', on_delete=models.CASCADE,
                             related_name='seven_shifts_shifts',
                             help_text="Store where shift takes place")

    # 7shifts shift data
    seven_shifts_shift_id = models.CharField(max_length=100, unique=True, db_index=True,
                                             help_text="7shifts shift ID")
    start_time = models.DateTimeField(db_index=True, help_text="Shift start time (UTC)")
    end_time = models.DateTimeField(db_index=True, help_text="Shift end time (UTC)")
    role = models.CharField(max_length=100, blank=True, help_text="Employee role for this shift")

    # Sync tracking
    synced_at = models.DateTimeField(auto_now=True, help_text="Last sync from 7shifts")

    class Meta:
        db_table = 'seven_shifts_shifts'
        verbose_name = '7shifts Shift'
        verbose_name_plural = '7shifts Shifts'
        indexes = [
            models.Index(fields=['store', 'start_time', 'end_time']),
            models.Index(fields=['employee', 'start_time']),
            models.Index(fields=['account', 'start_time']),
        ]
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.employee} @ {self.store.name} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"


class SevenShiftsSyncLog(models.Model):
    """Log of sync operations for debugging and monitoring"""

    class SyncType(models.TextChoices):
        EMPLOYEES = 'EMPLOYEES', 'Employees'
        SHIFTS = 'SHIFTS', 'Shifts'
        FULL = 'FULL', 'Full Sync'

    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        PARTIAL = 'PARTIAL', 'Partial Success'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE,
                                related_name='seven_shifts_sync_logs')
    sync_type = models.CharField(max_length=20, choices=SyncType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)

    # Sync results
    items_synced = models.IntegerField(default=0, help_text="Number of items successfully synced")
    errors_count = models.IntegerField(default=0, help_text="Number of errors encountered")
    error_details = models.JSONField(default=dict, blank=True,
                                    help_text="Details of any errors that occurred")

    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'seven_shifts_sync_logs'
        verbose_name = '7shifts Sync Log'
        verbose_name_plural = '7shifts Sync Logs'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['account', 'sync_type', '-started_at']),
        ]

    def __str__(self):
        return f"{self.sync_type} sync for {self.account.name} - {self.status}"
