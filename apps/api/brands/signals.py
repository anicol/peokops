"""
Signal handlers for Brand model.

Auto-seeds Quick Check templates when brands are created.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Brand


@receiver(post_save, sender=Brand)
def seed_templates_on_brand_creation(sender, instance, created, **kwargs):
    """
    Auto-seed default Quick Check templates when a new brand is created.

    This ensures all brands (trial and non-trial) get the standard library
    of 15 coaching templates immediately, providing an out-of-the-box experience.

    Note: Trial brands already seed templates in create_trial_brand(), but this
    signal ensures non-trial brands created through admin panel also get templates.
    """
    if created and not instance.is_trial:
        from micro_checks.utils import seed_default_templates
        # Try to determine who created the brand (may not be available in admin)
        created_by = getattr(instance, '_created_by', None)
        seed_default_templates(instance, created_by=created_by)
