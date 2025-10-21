"""
Signals for automatic subscription management
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.apps import apps

logger = logging.getLogger(__name__)


def get_user_store_count(user):
    """Get the count of unique stores for a user"""
    MicroCheckRun = apps.get_model('micro_checks', 'MicroCheckRun')

    # Count unique stores from micro-check runs
    store_ids = MicroCheckRun.objects.filter(
        created_by=user
    ).values_list('store_id', flat=True).distinct()

    # Filter out None values
    return len([s for s in store_ids if s is not None])


def update_user_subscription_store_count(user):
    """Update the user's subscription store count based on actual usage"""
    from .models import Subscription

    # Get active subscription
    subscription = Subscription.objects.filter(
        user=user,
        status__in=[Subscription.Status.ACTIVE, Subscription.Status.TRIALING]
    ).first()

    if not subscription:
        logger.info(f"No active subscription found for user {user.email}")
        return

    # Get actual store count
    actual_count = get_user_store_count(user)

    if actual_count == 0:
        logger.info(f"User {user.email} has no stores yet, skipping subscription update")
        return

    # Update subscription if count changed
    if actual_count != subscription.store_count:
        logger.info(f"Updating subscription for {user.email} from {subscription.store_count} to {actual_count} stores")
        try:
            subscription.update_store_count(actual_count)
        except Exception as e:
            logger.error(f"Failed to update subscription for {user.email}: {str(e)}")


@receiver(post_save, sender='brands.Store')
def handle_store_created(sender, instance, created, **kwargs):
    """When a new store is created, update subscriptions for users who use it"""
    if not created:
        return

    logger.info(f"New store created: {instance.name} (ID: {instance.id})")

    # After a store is created, we need to wait for it to be used in a micro-check run
    # The signal on MicroCheckRun will handle the subscription update


@receiver(post_save, sender='micro_checks.MicroCheckRun')
def handle_micro_check_run_created(sender, instance, created, **kwargs):
    """When a micro-check run is created, update the user's subscription if needed"""
    if not created:
        return

    user = instance.created_by
    if not user:
        return

    logger.info(f"MicroCheckRun created for store {instance.store_id} by user {user.email}")

    # Update subscription store count
    update_user_subscription_store_count(user)


@receiver(post_delete, sender='brands.Store')
def handle_store_deleted(sender, instance, **kwargs):
    """When a store is deleted, update subscriptions for affected users"""
    logger.info(f"Store deleted: {instance.name} (ID: {instance.id})")

    # Find users who had runs with this store
    MicroCheckRun = apps.get_model('micro_checks', 'MicroCheckRun')
    user_ids = MicroCheckRun.objects.filter(
        store_id=instance.id
    ).values_list('created_by_id', flat=True).distinct()

    # Update each user's subscription
    from accounts.models import User
    for user_id in user_ids:
        try:
            user = User.objects.get(id=user_id)
            update_user_subscription_store_count(user)
        except User.DoesNotExist:
            logger.warning(f"User {user_id} not found")
