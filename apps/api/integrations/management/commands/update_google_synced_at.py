"""
Management command to update synced_at for GoogleLocations that have been scraped
but don't have a synced_at timestamp.

This is a one-time fix for locations that were scraped before the synced_at field
was being updated in the scraping process.

Usage:
    python manage.py update_google_synced_at
    python manage.py update_google_synced_at --dry-run  # Preview changes without applying
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from integrations.models import GoogleLocation


class Command(BaseCommand):
    help = 'Update synced_at for GoogleLocations that have reviews but no synced_at timestamp'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without applying them',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Find all GoogleLocations with reviews but no synced_at
        locations_needing_update = GoogleLocation.objects.filter(
            synced_at__isnull=True,
            total_review_count__gt=0
        ).select_related('store', 'account')

        count = locations_needing_update.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No locations need updating!'))
            return

        self.stdout.write(f'\nFound {count} location(s) with reviews but no synced_at:\n')

        for loc in locations_needing_update:
            account_name = loc.account.name if loc.account else 'None'
            store_name = loc.store.name if loc.store else 'None'
            store_id = loc.store.id if loc.store else 'None'

            self.stdout.write(
                f'  - {loc.google_location_name} ({store_name})\n'
                f'    Account: {account_name}\n'
                f'    Store ID: {store_id}\n'
                f'    Reviews: {loc.total_review_count}, Rating: {loc.average_rating}\n'
            )

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] No changes made. Run without --dry-run to apply changes.'))
            return

        # Update all locations
        now = timezone.now()
        updated_count = 0

        for loc in locations_needing_update:
            loc.synced_at = now
            loc.save(update_fields=['synced_at'])
            updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Successfully updated synced_at for {updated_count} location(s)')
        )
