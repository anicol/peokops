"""
Management command to move brand-level micro-check templates to store level.

This is useful for migrating templates that were created at the BRAND level
but should actually be at the STORE level (e.g., for trial accounts).

Usage:
    # Preview changes (dry run)
    python manage.py move_templates_to_store --brand-id=123 --store-id=456 --dry-run

    # Move all brand-level templates with source='google_reviews' to a store
    python manage.py move_templates_to_store --brand-id=123 --store-id=456 --source=google_reviews

    # Move specific template by ID
    python manage.py move_templates_to_store --template-id=<uuid> --store-id=456

    # Move all brand-level templates for a brand to a specific store
    python manage.py move_templates_to_store --brand-id=123 --store-id=456
"""
from django.core.management.base import BaseCommand, CommandError
from micro_checks.models import MicroCheckTemplate
from brands.models import Brand, Store


class Command(BaseCommand):
    help = 'Move brand-level micro-check templates to store level'

    def add_arguments(self, parser):
        parser.add_argument(
            '--brand-id',
            type=int,
            help='Brand ID to filter templates',
        )
        parser.add_argument(
            '--store-id',
            type=int,
            required=True,
            help='Store ID to move templates to (required)',
        )
        parser.add_argument(
            '--template-id',
            type=str,
            help='Specific template UUID to move',
        )
        parser.add_argument(
            '--source',
            type=str,
            help='Filter by template source (e.g., "google_reviews")',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without applying them',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        store_id = options['store_id']
        brand_id = options.get('brand_id')
        template_id = options.get('template_id')
        source = options.get('source')

        # Validate store exists
        try:
            store = Store.objects.select_related('brand', 'account').get(id=store_id)
        except Store.DoesNotExist:
            raise CommandError(f'Store with ID {store_id} does not exist')

        self.stdout.write(f'\nTarget Store: {store.name} (ID: {store.id})')
        self.stdout.write(f'  Brand: {store.brand.name} (ID: {store.brand.id})')
        self.stdout.write(f'  Account: {store.account.name if store.account else "None"} (ID: {store.account.id if store.account else "None"})\n')

        # Build query for templates to move
        if template_id:
            # Move specific template
            templates = MicroCheckTemplate.objects.filter(id=template_id)
            if not templates.exists():
                raise CommandError(f'Template with ID {template_id} does not exist')
        else:
            # Move templates matching criteria
            if not brand_id:
                raise CommandError('Either --template-id or --brand-id must be provided')

            # Start with brand filter
            templates = MicroCheckTemplate.objects.filter(brand_id=brand_id)

            # Verify brand matches store's brand
            if store.brand.id != brand_id:
                raise CommandError(f'Store belongs to brand {store.brand.id}, not brand {brand_id}')

            # Filter by level (only BRAND level templates)
            templates = templates.filter(level=MicroCheckTemplate.TemplateLevel.BRAND)

            # Optional: filter by source
            if source:
                templates = templates.filter(source=source)

        templates = templates.select_related('brand')
        count = templates.count()

        if count == 0:
            self.stdout.write(self.style.WARNING('No templates found matching criteria'))
            return

        self.stdout.write(f'Found {count} template(s) to move:\n')

        # Display templates
        for template in templates:
            self.stdout.write(
                f'  - [{template.id}] {template.title}\n'
                f'    Current: BRAND level (brand={template.brand.name})\n'
                f'    Source: {template.source or "N/A"}\n'
                f'    Created: {template.created_at.strftime("%Y-%m-%d")}\n'
            )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\n[DRY RUN] Would move {count} template(s) to:\n'
                    f'  Level: STORE\n'
                    f'  Store: {store.name} (ID: {store.id})\n'
                    f'  Account: {store.account.name if store.account else "None"}\n'
                    f'\nRun without --dry-run to apply changes.'
                )
            )
            return

        # Apply changes
        updated_count = 0
        for template in templates:
            template.level = MicroCheckTemplate.TemplateLevel.STORE
            template.store = store
            template.account = store.account
            template.save(update_fields=['level', 'store', 'account'])
            updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Successfully moved {updated_count} template(s) to:\n'
                f'  Level: STORE\n'
                f'  Store: {store.name} (ID: {store.id})\n'
                f'  Account: {store.account.name if store.account else "None"}'
            )
        )
