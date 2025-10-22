"""
Celery tasks for 7shifts integration

Automated syncing of employees and shifts from 7shifts to keep local data fresh.
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

from .models import SevenShiftsConfig
from .sync_service import SevenShiftsSyncService

logger = logging.getLogger(__name__)


@shared_task(name='integrations.sync_all_seven_shifts_accounts')
def sync_all_seven_shifts_accounts():
    """
    Sync all active 7shifts accounts.

    Run daily via Celery Beat to keep employee and shift data fresh.
    """
    logger.info("Starting sync for all 7shifts accounts")

    # Get all active 7shifts configurations
    configs = SevenShiftsConfig.objects.filter(is_active=True)

    total_synced = 0
    total_failed = 0

    for config in configs:
        try:
            logger.info(f"Syncing 7shifts for account: {config.account.name}")

            sync_service = SevenShiftsSyncService(config)
            result = sync_service.sync_all()

            total_synced += 1
            logger.info(f"Successfully synced account {config.account.name}: {result}")

        except Exception as e:
            total_failed += 1
            logger.error(f"Failed to sync account {config.account.name}: {str(e)}")

    logger.info(f"7shifts sync completed. Success: {total_synced}, Failed: {total_failed}")

    return {
        'total_accounts': configs.count(),
        'synced': total_synced,
        'failed': total_failed
    }


@shared_task(name='integrations.sync_seven_shifts_employees')
def sync_seven_shifts_employees():
    """
    Sync employees only for all active 7shifts accounts.

    Run daily to keep employee roster fresh.
    """
    logger.info("Starting employee sync for all 7shifts accounts")

    configs = SevenShiftsConfig.objects.filter(
        is_active=True,
        sync_employees_enabled=True
    )

    total_synced = 0
    total_employees = 0
    total_failed = 0

    for config in configs:
        try:
            logger.info(f"Syncing employees for account: {config.account.name}")

            sync_service = SevenShiftsSyncService(config)
            result = sync_service.sync_employees()

            total_synced += 1
            total_employees += result.get('employees_synced', 0)
            logger.info(f"Synced {result.get('employees_synced', 0)} employees for {config.account.name}")

        except Exception as e:
            total_failed += 1
            logger.error(f"Failed to sync employees for {config.account.name}: {str(e)}")

    logger.info(f"Employee sync completed. Accounts: {total_synced}, Total employees: {total_employees}, Failed: {total_failed}")

    return {
        'accounts_synced': total_synced,
        'total_employees': total_employees,
        'failed': total_failed
    }


@shared_task(name='integrations.sync_seven_shifts_shifts')
def sync_seven_shifts_shifts(days_ahead: int = 14):
    """
    Sync shift schedules for all active 7shifts accounts.

    Run twice daily to keep shift schedules fresh.

    Args:
        days_ahead: Number of days to sync ahead (default: 14)
    """
    logger.info(f"Starting shift sync for all 7shifts accounts ({days_ahead} days ahead)")

    configs = SevenShiftsConfig.objects.filter(
        is_active=True,
        sync_shifts_enabled=True
    )

    total_synced = 0
    total_shifts = 0
    total_failed = 0

    for config in configs:
        try:
            logger.info(f"Syncing shifts for account: {config.account.name}")

            sync_service = SevenShiftsSyncService(config)
            result = sync_service.sync_shifts(days_ahead=days_ahead)

            total_synced += 1
            total_shifts += result.get('shifts_synced', 0)
            logger.info(f"Synced {result.get('shifts_synced', 0)} shifts for {config.account.name}")

        except Exception as e:
            total_failed += 1
            logger.error(f"Failed to sync shifts for {config.account.name}: {str(e)}")

    logger.info(f"Shift sync completed. Accounts: {total_synced}, Total shifts: {total_shifts}, Failed: {total_failed}")

    return {
        'accounts_synced': total_synced,
        'total_shifts': total_shifts,
        'failed': total_failed
    }


@shared_task(name='integrations.sync_seven_shifts_account')
def sync_seven_shifts_account(account_id: int):
    """
    Sync a specific 7shifts account (employees and shifts).

    Used for manual sync triggers from the UI.

    Args:
        account_id: ID of the account to sync
    """
    try:
        config = SevenShiftsConfig.objects.get(account_id=account_id, is_active=True)
    except SevenShiftsConfig.DoesNotExist:
        logger.error(f"No active 7shifts config found for account {account_id}")
        return {'error': 'No active 7shifts configuration found'}

    logger.info(f"Syncing 7shifts for account: {config.account.name}")

    try:
        sync_service = SevenShiftsSyncService(config)
        result = sync_service.sync_all()

        logger.info(f"Successfully synced account {config.account.name}: {result}")
        return result

    except Exception as e:
        logger.error(f"Failed to sync account {config.account.name}: {str(e)}")
        raise


@shared_task(name='integrations.cleanup_old_shifts')
def cleanup_old_shifts(days_to_keep: int = 30):
    """
    Clean up old shift records to prevent database bloat.

    Run weekly to delete shifts older than X days.

    Args:
        days_to_keep: Number of days to keep (default: 30)
    """
    from .models import SevenShiftsShift

    cutoff_date = timezone.now() - timedelta(days=days_to_keep)

    logger.info(f"Cleaning up shifts older than {cutoff_date}")

    deleted_count, _ = SevenShiftsShift.objects.filter(
        end_time__lt=cutoff_date
    ).delete()

    logger.info(f"Deleted {deleted_count} old shift records")

    return {
        'deleted_count': deleted_count,
        'cutoff_date': cutoff_date.isoformat()
    }


@shared_task(name='integrations.cleanup_old_sync_logs')
def cleanup_old_sync_logs(days_to_keep: int = 90):
    """
    Clean up old sync logs to prevent database bloat.

    Run monthly to delete logs older than X days.

    Args:
        days_to_keep: Number of days to keep (default: 90)
    """
    from .models import SevenShiftsSyncLog

    cutoff_date = timezone.now() - timedelta(days=days_to_keep)

    logger.info(f"Cleaning up sync logs older than {cutoff_date}")

    deleted_count, _ = SevenShiftsSyncLog.objects.filter(
        started_at__lt=cutoff_date
    ).delete()

    logger.info(f"Deleted {deleted_count} old sync log records")

    return {
        'deleted_count': deleted_count,
        'cutoff_date': cutoff_date.isoformat()
    }
