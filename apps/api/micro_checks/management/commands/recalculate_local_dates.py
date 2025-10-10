"""
Management command to recalculate local_completed_date for all responses.
This is useful after changing store timezones.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
import pytz
from micro_checks.models import MicroCheckResponse


class Command(BaseCommand):
    help = 'Recalculate local_completed_date for all micro-check responses based on store timezone'

    def add_arguments(self, parser):
        parser.add_argument(
            '--store-id',
            type=int,
            help='Only recalculate for a specific store',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        store_id = options.get('store_id')
        dry_run = options.get('dry_run', False)

        # Get responses to update
        responses = MicroCheckResponse.objects.select_related('run').all()

        if store_id:
            responses = responses.filter(store_id=store_id)
            self.stdout.write(f"Filtering to store {store_id}")

        total = responses.count()
        self.stdout.write(f"Found {total} responses to process")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No changes will be made"))

        updated = 0
        errors = 0

        for response in responses.iterator(chunk_size=100):
            try:
                # Get store timezone
                store_tz = response.run.store_timezone or 'UTC'
                tz = pytz.timezone(store_tz)

                # Convert completed_at to local timezone
                if response.completed_at.tzinfo:
                    local_dt = response.completed_at.astimezone(tz)
                else:
                    local_dt = timezone.now().astimezone(tz)

                old_date = response.local_completed_date
                new_date = local_dt.date()

                if old_date != new_date:
                    if not dry_run:
                        response.local_completed_date = new_date
                        response.save(update_fields=['local_completed_date'])

                    self.stdout.write(
                        f"Response {response.id}: {old_date} -> {new_date} (store TZ: {store_tz})"
                    )
                    updated += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error processing response {response.id}: {str(e)}")
                )
                errors += 1

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f"\nDRY RUN complete: {updated} responses would be updated")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"\nUpdated {updated} responses")
            )

        if errors > 0:
            self.stdout.write(
                self.style.WARNING(f"{errors} responses had errors")
            )
