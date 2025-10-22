from rest_framework import serializers
from .models import SevenShiftsConfig, SevenShiftsEmployee, SevenShiftsShift, SevenShiftsSyncLog


class SevenShiftsConfigSerializer(serializers.ModelSerializer):
    """Serializer for 7shifts configuration (hides encrypted token)"""

    access_token = serializers.CharField(write_only=True, required=False,
                                        help_text="7shifts API access token (write-only)")
    is_configured = serializers.SerializerMethodField()
    last_sync_status = serializers.SerializerMethodField()

    class Meta:
        model = SevenShiftsConfig
        fields = ('id', 'account', 'company_id', 'is_active', 'last_sync_at',
                 'sync_employees_enabled', 'sync_shifts_enabled', 'enforce_shift_schedule',
                 'created_at', 'updated_at', 'access_token', 'is_configured', 'last_sync_status')
        read_only_fields = ('id', 'created_at', 'updated_at', 'last_sync_at',
                           'is_configured', 'last_sync_status')

    def get_is_configured(self, obj):
        """Check if integration has valid credentials"""
        return bool(obj.access_token_encrypted)

    def get_last_sync_status(self, obj):
        """Get status of last sync operation"""
        last_log = obj.account.seven_shifts_sync_logs.first()  # Ordered by -started_at
        if not last_log:
            return None

        return {
            'sync_type': last_log.sync_type,
            'status': last_log.status,
            'items_synced': last_log.items_synced,
            'started_at': last_log.started_at,
            'completed_at': last_log.completed_at
        }


class SevenShiftsEmployeeSerializer(serializers.ModelSerializer):
    """Serializer for cached 7shifts employees"""

    store_name = serializers.CharField(source='store.name', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = SevenShiftsEmployee
        fields = ('id', 'account', 'store', 'store_name', 'seven_shifts_id',
                 'seven_shifts_location_id', 'email', 'phone', 'first_name',
                 'last_name', 'full_name', 'is_active', 'synced_at')
        read_only_fields = ('id', 'synced_at')

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class SevenShiftsShiftSerializer(serializers.ModelSerializer):
    """Serializer for cached 7shifts shifts"""

    employee_name = serializers.CharField(source='employee.first_name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)

    class Meta:
        model = SevenShiftsShift
        fields = ('id', 'employee', 'employee_name', 'employee_email', 'store',
                 'store_name', 'seven_shifts_shift_id', 'start_time', 'end_time',
                 'role', 'synced_at')
        read_only_fields = ('id', 'synced_at')


class SevenShiftsSyncLogSerializer(serializers.ModelSerializer):
    """Serializer for sync operation logs"""

    class Meta:
        model = SevenShiftsSyncLog
        fields = ('id', 'account', 'sync_type', 'status', 'items_synced',
                 'errors_count', 'error_details', 'started_at', 'completed_at',
                 'duration_seconds')
        read_only_fields = fields


class SevenShiftsConfigureRequestSerializer(serializers.Serializer):
    """Serializer for initial configuration request"""

    access_token = serializers.CharField(required=True, write_only=True,
                                        help_text="7shifts API access token")
    company_id = serializers.CharField(required=True,
                                      help_text="7shifts company ID")
    sync_employees_enabled = serializers.BooleanField(default=True)
    sync_shifts_enabled = serializers.BooleanField(default=True)
    enforce_shift_schedule = serializers.BooleanField(default=True)


class SevenShiftsSyncRequestSerializer(serializers.Serializer):
    """Serializer for manual sync request"""

    sync_type = serializers.ChoiceField(
        choices=['employees', 'shifts', 'full'],
        default='full',
        help_text="Type of data to sync"
    )
