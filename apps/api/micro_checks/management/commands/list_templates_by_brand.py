"""
Management command to list brands with BRAND-level micro-check templates
and their associated stores.

This helps identify which brands have templates that need to be moved to
store level, and shows the available stores to move them to.

Usage:
    # List all brands with BRAND-level templates
    python manage.py list_templates_by_brand

    # Filter by source
    python manage.py list_templates_by_brand --source=google_reviews

    # Show only brands with trial accounts
    python manage.py list_templates_by_brand --trial-only
"""
from django.core.management.base import BaseCommand
from micro_checks.models import MicroCheckTemplate
from brands.models import Brand, Store
from django.db.models import Count, Q


class Command(BaseCommand):
    help = 'List brands with BRAND-level micro-check templates and their stores'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            help='Filter by template source (e.g., "google_reviews")',
        )
        parser.add_argument(
            '--trial-only',
            action='store_true',
            help='Show only trial brands',
        )

    def handle(self, *args, **options):
        source = options.get('source')
        trial_only = options.get('trial_only')

        # Build query for BRAND-level templates
        query = Q(level=MicroCheckTemplate.TemplateLevel.BRAND)

        if source:
            query &= Q(source=source)

        # Get brands with BRAND-level templates
        brand_ids = MicroCheckTemplate.objects.filter(query).values_list('brand_id', flat=True).distinct()

        brands = Brand.objects.filter(id__in=brand_ids).prefetch_related('stores', 'accounts')

        if trial_only:
            brands = brands.filter(is_trial=True)

        if not brands.exists():
            self.stdout.write(self.style.WARNING('No brands found with BRAND-level templates'))
            return

        self.stdout.write(self.style.SUCCESS(f'\nFound {brands.count()} brand(s) with BRAND-level templates:\n'))

        for brand in brands:
            # Count templates for this brand
            template_query = Q(brand=brand, level=MicroCheckTemplate.TemplateLevel.BRAND)
            if source:
                template_query &= Q(source=source)

            template_count = MicroCheckTemplate.objects.filter(template_query).count()

            trial_badge = ' [TRIAL]' if hasattr(brand, 'is_trial') and brand.is_trial else ''
            self.stdout.write(f'{"="*80}')
            self.stdout.write(f'Brand: {brand.name}{trial_badge}')
            self.stdout.write(f'Brand ID: {brand.id}')
            self.stdout.write(f'Templates: {template_count} BRAND-level template(s)')

            # Show accounts
            accounts = brand.accounts.all()
            if accounts.exists():
                self.stdout.write(f'\nAccounts ({accounts.count()}):')
                for account in accounts:
                    self.stdout.write(f'  - {account.name} (ID: {account.id})')

            # Show stores
            stores = brand.stores.filter(is_active=True)
            if stores.exists():
                self.stdout.write(f'\nStores ({stores.count()}):')
                for store in stores:
                    account_info = f' [Account: {store.account.name}]' if store.account else ' [No Account]'
                    self.stdout.write(f'  - {store.name} (ID: {store.id}){account_info}')
                    self.stdout.write(f'    Location: {store.city}, {store.state}')
            else:
                self.stdout.write(self.style.WARNING('\n  No active stores found!'))

            # Show sample templates
            sample_templates = MicroCheckTemplate.objects.filter(template_query).select_related('brand')[:3]
            if sample_templates.exists():
                self.stdout.write(f'\nSample Templates:')
                for template in sample_templates:
                    self.stdout.write(f'  - [{template.id}] {template.title}')
                    self.stdout.write(f'    Source: {template.source or "N/A"}, Created: {template.created_at.strftime("%Y-%m-%d")}')

            # Show suggested command
            if stores.exists():
                first_store = stores.first()
                self.stdout.write(self.style.SUCCESS(f'\n📋 Command to move templates:'))
                cmd = f'python manage.py move_templates_to_store --brand-id={brand.id} --store-id={first_store.id}'
                if source:
                    cmd += f' --source={source}'
                cmd += ' --dry-run'
                self.stdout.write(f'  {cmd}')

            self.stdout.write('')  # Empty line

        self.stdout.write(self.style.SUCCESS(f'\n✓ Total: {brands.count()} brand(s) listed'))
