"""
Test Google Places API for fetching reviews

Usage:
    docker-compose exec api python manage.py test_google_places_api "Business Name" "City, State"

Example:
    docker-compose exec api python manage.py test_google_places_api "Winking Lizard" "Cleveland, OH"
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from marketing.management.commands.research_google_reviews import Command as AnalyzerCommand


class Command(BaseCommand):
    help = 'Test Google Places API for fetching reviews'

    def add_arguments(self, parser):
        parser.add_argument('business_name', type=str, help='Business name to search for')
        parser.add_argument('location', type=str, help='Location (e.g., "Cleveland, OH")')
        parser.add_argument(
            '--max-reviews',
            type=int,
            default=20,
            help='Maximum number of reviews to fetch (default: 20)'
        )

    def handle(self, *args, **options):
        business_name = options['business_name']
        location = options['location']
        max_reviews = options['max_reviews']

        # Get API key from settings
        api_key = getattr(settings, 'GOOGLE_PLACES_API_KEY', None)

        if not api_key:
            self.stdout.write(self.style.ERROR('❌ GOOGLE_PLACES_API_KEY not configured in settings'))
            return

        self.stdout.write(self.style.SUCCESS(f'✓ API Key found: {api_key[:10]}...'))
        self.stdout.write(f'\nSearching for: {business_name}')
        self.stdout.write(f'Location: {location}')
        self.stdout.write(f'Max reviews: {max_reviews}')
        self.stdout.write('-' * 80)

        # Create analyzer and fetch reviews
        analyzer = AnalyzerCommand()
        analyzer.stdout = self.stdout

        try:
            reviews = analyzer.fetch_reviews_google_places(
                business_name=business_name,
                location=location,
                api_key=api_key,
                max_reviews=max_reviews
            )

            if reviews:
                self.stdout.write('\n' + '=' * 80)
                self.stdout.write(self.style.SUCCESS(f'✓ Successfully fetched {len(reviews)} reviews!'))
                self.stdout.write('=' * 80)

                # Display sample reviews
                self.stdout.write('\nSample reviews:')
                for i, review in enumerate(reviews[:3], 1):
                    self.stdout.write(f'\n--- Review {i} ---')
                    self.stdout.write(f'Rating: {review.get("rating", "N/A")} stars')
                    self.stdout.write(f'Author: {review.get("author_name", "Anonymous")}')
                    self.stdout.write(f'Date: {review.get("relative_time_description", "N/A")}')
                    text = review.get('text', '')
                    preview = text[:200] + '...' if len(text) > 200 else text
                    self.stdout.write(f'Text: {preview}')

                self.stdout.write('\n' + '=' * 80)
                self.stdout.write(self.style.SUCCESS('✓ Test completed successfully!'))
            else:
                self.stdout.write(self.style.ERROR('❌ No reviews returned'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
