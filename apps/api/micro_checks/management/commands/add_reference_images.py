"""
Management command to download and add reference images to micro-check templates.

Usage:
    python manage.py add_reference_images
"""

import os
from urllib.request import urlopen
from urllib.error import URLError, HTTPError
from io import BytesIO
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from micro_checks.models import MicroCheckTemplate


class Command(BaseCommand):
    help = 'Download sample reference images and add them to micro-check templates'

    # Sample images from Unsplash (free to use)
    IMAGE_URLS = {
        'Hand Sink Stocked': 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=80',  # Hand washing station
        'Food Temperature Check': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',  # Thermometer
        'Food Storage Proper': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80',  # Food storage
        'Sanitizer Buckets Fresh': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80',  # Cleaning supplies
        'Floors Clean and Dry': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',  # Clean floor
        'Prep Surfaces Sanitized': 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80',  # Clean surface
        'Trash Containers Managed': 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80',  # Waste bins
        'Fire Extinguisher Accessible': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80',  # Fire safety equipment
        'Exit Paths Clear': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',  # Exit sign
        'Wet Floor Signs Used': 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800&q=80',  # Wet floor sign
        'Staff Wearing Gloves': 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800&q=80',  # Person with gloves
        'Hair Restraints Worn': 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&q=80',  # Chef with hat
        'Refrigeration Temperatures': 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80',  # Refrigerator
        'Equipment Clean and Functional': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',  # Kitchen equipment
        'Dishwasher Operating Correctly': 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&q=80',  # Dishwasher
        # Additional templates
        'Hair Restraints': 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&q=80',  # Chef with hair restraint
        'Hand Washing Station': 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=80',  # Hand washing
        'Temperature Logs': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',  # Clipboard/logs
        'Seating area comfortable and organized': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',  # Restaurant seating
        'Dining area tables wiped down': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',  # Dining tables
        'Equipment and appliances wiped down': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80',  # Kitchen appliances
    }

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))

        templates = MicroCheckTemplate.objects.all()
        updated_count = 0
        skipped_count = 0
        error_count = 0

        for template in templates:
            # Check if template already has an image
            if template.visual_reference_image:
                self.stdout.write(
                    self.style.WARNING(f'⏭️  Skipping "{template.title}" - already has image')
                )
                skipped_count += 1
                continue

            # Get image URL for this template
            image_url = self.IMAGE_URLS.get(template.title)
            if not image_url:
                self.stdout.write(
                    self.style.WARNING(f'⚠️  No image URL configured for "{template.title}"')
                )
                skipped_count += 1
                continue

            try:
                self.stdout.write(f'📥 Downloading image for "{template.title}"...')

                if not dry_run:
                    # Download image using urllib
                    with urlopen(image_url, timeout=10) as response:
                        image_data = response.read()

                    # Create filename from template title
                    filename = f"{template.title.lower().replace(' ', '-')}.jpg"

                    # Save to template's ImageField (will upload to S3 automatically)
                    template.visual_reference_image.save(
                        filename,
                        ContentFile(image_data),
                        save=True
                    )

                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Added image to "{template.title}"')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Would add image to "{template.title}"')
                    )

                updated_count += 1

            except (URLError, HTTPError) as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Failed to download image for "{template.title}": {str(e)}')
                )
                error_count += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error processing "{template.title}": {str(e)}')
                )
                error_count += 1

        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'✅ Updated: {updated_count}'))
        self.stdout.write(self.style.WARNING(f'⏭️  Skipped: {skipped_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'❌ Errors: {error_count}'))
        self.stdout.write('='*50)

        if dry_run:
            self.stdout.write(self.style.WARNING('\n💡 Run without --dry-run to apply changes'))
