"""
Django management command to import micro-check templates from CSV.

Usage:
    python manage.py import_templates --csv /path/to/templates.csv
"""
import csv
from django.core.management.base import BaseCommand, CommandError
from micro_checks.models import MicroCheckTemplate
from inspections.models import Finding


class Command(BaseCommand):
    help = 'Import micro-check templates from CSV file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            required=True,
            help='Path to CSV file with templates'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview import without saving to database'
        )

    def handle(self, *args, **options):
        csv_path = options['csv']
        dry_run = options.get('dry_run', False)

        # Category mapping (CSV -> Model)
        category_map = {
            'PPE': 'PPE',
            'SAFETY': 'SAFETY',
            'CLEANLINESS': 'CLEANLINESS',
            'EQUIPMENT': 'EQUIPMENT',
            'FOOD_SAFETY': 'FOOD_SAFETY',
            'FOOD_QUALITY': 'FOOD_QUALITY',
            'OPERATIONAL': 'OPERATIONAL',
            'MENU_BOARD': 'MENU_BOARD',
            'UNIFORM': 'UNIFORM',
            'STAFF_BEHAVIOR': 'STAFF_BEHAVIOR',
            'OTHER': 'OTHER',
        }

        # Severity mapping (CSV -> Model)
        severity_map = {
            'Critical': 'CRITICAL',
            'High': 'HIGH',
            'Medium': 'MEDIUM',
            'Low': 'LOW',
        }

        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                created_count = 0
                skipped_count = 0
                
                for row_num, row in enumerate(reader, start=2):  # Start at 2 (1 is header)
                    try:
                        # Extract and validate fields
                        template_id = row.get('template_id', '').strip()
                        title = row.get('title', '').strip()
                        category_csv = row.get('category', '').strip()
                        severity_csv = row.get('severity', '').strip()
                        description = row.get('description', '').strip()
                        success_criteria = row.get('success_criteria', '').strip()
                        photo_required_str = row.get('photo_required', 'False').strip()
                        expected_time = row.get('expected_time_sec', '30').strip()
                        ai_prompt = row.get('ai_validation_prompt', '').strip()

                        # Validate required fields
                        if not title:
                            self.stdout.write(self.style.WARNING(
                                f"Row {row_num}: Skipping - missing title"
                            ))
                            skipped_count += 1
                            continue

                        # Map category
                        category = category_map.get(category_csv)
                        if not category:
                            self.stdout.write(self.style.WARNING(
                                f"Row {row_num}: Skipping '{title}' - invalid category '{category_csv}'"
                            ))
                            skipped_count += 1
                            continue

                        # Map severity
                        severity = severity_map.get(severity_csv, 'MEDIUM')

                        # Parse boolean
                        photo_required = photo_required_str.lower() in ('true', 't', 'yes', 'y', '1')

                        # Parse time
                        try:
                            expected_completion_seconds = int(expected_time)
                        except ValueError:
                            expected_completion_seconds = 30

                        # Check if template already exists (by title and category)
                        existing = MicroCheckTemplate.objects.filter(
                            title=title,
                            category=category,
                            brand__isnull=True  # Only check global templates
                        ).first()

                        if existing:
                            self.stdout.write(self.style.WARNING(
                                f"Row {row_num}: Template '{title}' ({category}) already exists - skipping"
                            ))
                            skipped_count += 1
                            continue

                        # Create template
                        if not dry_run:
                            MicroCheckTemplate.objects.create(
                                title=title,
                                category=category,
                                severity=severity,
                                description=description or f"Check {title.lower()}",
                                success_criteria=success_criteria or "Standards met",
                                version=1,
                                parent_template=None,
                                default_photo_required=photo_required,
                                default_video_required=False,
                                expected_completion_seconds=expected_completion_seconds,
                                ai_validation_enabled=bool(ai_prompt and ai_prompt.upper() != 'N/A'),
                                ai_validation_prompt=ai_prompt if ai_prompt.upper() != 'N/A' else '',
                                brand=None,  # Global template
                                is_local=False,
                                include_in_rotation=True,
                                rotation_priority=60 if severity in ['CRITICAL', 'HIGH'] else 50,
                                is_active=True,
                                created_by=None,
                            )
                        
                        created_count += 1
                        self.stdout.write(self.style.SUCCESS(
                            f"Row {row_num}: {'[DRY RUN] Would create' if dry_run else 'Created'} '{title}' ({category}, {severity})"
                        ))

                    except Exception as e:
                        self.stdout.write(self.style.ERROR(
                            f"Row {row_num}: Error processing row - {str(e)}"
                        ))
                        skipped_count += 1

                # Summary
                self.stdout.write(self.style.SUCCESS('\n' + '='*60))
                if dry_run:
                    self.stdout.write(self.style.SUCCESS(
                        f"DRY RUN COMPLETE: Would create {created_count} templates, skipped {skipped_count}"
                    ))
                else:
                    self.stdout.write(self.style.SUCCESS(
                        f"IMPORT COMPLETE: Created {created_count} templates, skipped {skipped_count}"
                    ))
                self.stdout.write(self.style.SUCCESS('='*60 + '\n'))

        except FileNotFoundError:
            raise CommandError(f"CSV file not found: {csv_path}")
        except Exception as e:
            raise CommandError(f"Error reading CSV: {str(e)}")
