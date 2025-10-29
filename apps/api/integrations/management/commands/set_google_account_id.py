"""
Management command to manually set Google Business account ID

Usage:
    python manage.py set_google_account_id <account_id>

This is useful when rate limits prevent automatic fetching during OAuth.
"""

from django.core.management.base import BaseCommand
from integrations.models import GoogleReviewsConfig


class Command(BaseCommand):
    help = 'Manually set Google Business account ID for a Google Reviews integration'

    def add_arguments(self, parser):
        parser.add_argument(
            'account_id',
            type=str,
            help='Google Business account ID (e.g., "accounts/12345" or just "12345")'
        )

    def handle(self, *args, **options):
        account_id = options['account_id']

        # Ensure format is "accounts/123456"
        if not account_id.startswith('accounts/'):
            account_id = f'accounts/{account_id}'

        # Get the first active config (assuming single tenant for now)
        configs = GoogleReviewsConfig.objects.filter(is_active=True)

        if not configs.exists():
            self.stdout.write(self.style.ERROR('No active Google Reviews configurations found'))
            return

        if configs.count() > 1:
            self.stdout.write(self.style.WARNING(f'Found {configs.count()} active configs. Updating all:'))
            for config in configs:
                self.stdout.write(f'  - {config.account.name}')

        # Update all active configs
        for config in configs:
            old_value = config.google_account_id or 'NOT SET'
            config.google_account_id = account_id
            config.save(update_fields=['google_account_id'])

            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Updated {config.account.name}: {old_value} → {account_id}'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Successfully set Google Business account ID to: {account_id}'
            )
        )
        self.stdout.write('You can now trigger a sync to fetch locations and reviews.')
