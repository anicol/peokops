"""
Django management command to reanalyze Google reviews for a location.

Usage:
    python manage.py reanalyze_google_reviews --store-code STRXX123
    python manage.py reanalyze_google_reviews --store-id <uuid>
    python manage.py reanalyze_google_reviews --place-id ChIJ...
    python manage.py reanalyze_google_reviews --store-code STRXX123 --force
    python manage.py reanalyze_google_reviews --store-code STRXX123 --batch-size 50
"""

from django.core.management.base import BaseCommand, CommandError
from brands.models import Store
from integrations.models import GoogleLocation, GoogleReview
from integrations.review_analysis_helper import analyze_google_review
from ai_services.bedrock_service import BedrockRecommendationService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Reanalyze Google reviews for a specific location'

    def add_arguments(self, parser):
        # Location identification (mutually exclusive)
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument(
            '--store-code',
            type=str,
            help='Store code (e.g., STRXX123)'
        )
        group.add_argument(
            '--store-id',
            type=str,
            help='Store UUID'
        )
        group.add_argument(
            '--place-id',
            type=str,
            help='Google Place ID'
        )

        # Optional arguments
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reanalysis of all reviews, even if already analyzed'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=None,
            help='Maximum number of reviews to analyze (default: all)'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed progress for each review'
        )

    def handle(self, *args, **options):
        # Get the location
        location = self._get_location(options)

        self.stdout.write(self.style.SUCCESS(f'\n📍 Location: {location.google_location_name}'))
        if location.store:
            self.stdout.write(f'   Store: {location.store.name} ({location.store.code})')
        self.stdout.write(f'   Place ID: {location.place_id}')
        self.stdout.write(f'   Average Rating: {location.average_rating or "N/A"}')
        self.stdout.write(f'   Total Reviews: {location.total_review_count}\n')

        # Get reviews to analyze
        reviews = self._get_reviews(location, options)
        total_reviews = reviews.count()

        if total_reviews == 0:
            self.stdout.write(self.style.WARNING('No reviews found to analyze.'))
            return

        self.stdout.write(f'Found {total_reviews} review(s) to analyze\n')

        # Confirm if forcing reanalysis
        if options['force']:
            self.stdout.write(self.style.WARNING(
                '⚠️  FORCE mode enabled - will reanalyze all reviews (including already analyzed ones)\n'
            ))

        # Initialize AI service
        bedrock_service = BedrockRecommendationService()
        if not bedrock_service.enabled:
            self.stdout.write(self.style.WARNING(
                '⚠️  Bedrock service not enabled - will use fallback analysis\n'
            ))

        # Analyze reviews
        analyzed_count = 0
        failed_count = 0
        total_time = 0
        topics_summary = {}
        sentiment_scores = []

        for i, review in enumerate(reviews, 1):
            if options['verbose']:
                self.stdout.write(f'\n[{i}/{total_reviews}] Analyzing review {review.google_review_id[:16]}...')
                self.stdout.write(f'  Rating: {review.rating}/5')
                self.stdout.write(f'  Text: {review.review_text[:100]}...' if len(review.review_text) > 100 else f'  Text: {review.review_text}')

            # Use the reusable helper function
            result = analyze_google_review(review, bedrock_service)

            if result['success']:
                analyzed_count += 1
                total_time += result['processing_time_ms']

                # Track statistics
                analysis_result = result['analysis_result']
                sentiment_scores.append(analysis_result['sentiment_score'])

                # Aggregate topics
                for topic in analysis_result['topics']:
                    topics_summary[topic] = topics_summary.get(topic, 0) + 1

                if options['verbose']:
                    self.stdout.write(self.style.SUCCESS(
                        f'  ✓ Analyzed - Sentiment: {analysis_result["sentiment_score"]:.2f}, '
                        f'Topics: {", ".join(analysis_result["topics"][:3])}, '
                        f'Time: {result["processing_time_ms"]}ms'
                    ))
                else:
                    # Show progress indicator
                    if i % 10 == 0:
                        self.stdout.write(f'Progress: {i}/{total_reviews} reviews analyzed...', ending='\r')
            else:
                failed_count += 1
                if options['verbose']:
                    self.stdout.write(self.style.ERROR(f'  ✗ Failed: {result["error"]}'))

        # Print summary
        self.stdout.write('\n')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('📊 Analysis Complete'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'✓ Successfully analyzed: {analyzed_count} reviews')
        if failed_count > 0:
            self.stdout.write(self.style.ERROR(f'✗ Failed: {failed_count} reviews'))

        if analyzed_count > 0:
            avg_sentiment = sum(sentiment_scores) / len(sentiment_scores)
            avg_time = total_time / analyzed_count

            self.stdout.write(f'\n📈 Statistics:')
            self.stdout.write(f'   Average sentiment: {avg_sentiment:.2f} (-1.0 to 1.0)')
            self.stdout.write(f'   Average processing time: {avg_time:.0f}ms per review')
            self.stdout.write(f'   Total time: {total_time/1000:.1f}s')

            # Show top topics
            if topics_summary:
                self.stdout.write(f'\n🏷️  Top Topics:')
                sorted_topics = sorted(topics_summary.items(), key=lambda x: x[1], reverse=True)[:10]
                for topic, count in sorted_topics:
                    percentage = (count / analyzed_count) * 100
                    self.stdout.write(f'   • {topic}: {count} ({percentage:.1f}%)')

        self.stdout.write(self.style.SUCCESS('\n✅ Done!\n'))

    def _get_location(self, options):
        """Get GoogleLocation based on provided identifier"""
        try:
            if options['store_code']:
                store = Store.objects.get(code=options['store_code'])
                if not hasattr(store, 'google_location') or not store.google_location:
                    raise CommandError(
                        f'Store {options["store_code"]} does not have a linked Google location. '
                        f'Please link a Google location first.'
                    )
                return store.google_location

            elif options['store_id']:
                store = Store.objects.get(id=options['store_id'])
                if not hasattr(store, 'google_location') or not store.google_location:
                    raise CommandError(
                        f'Store {options["store_id"]} does not have a linked Google location. '
                        f'Please link a Google location first.'
                    )
                return store.google_location

            elif options['place_id']:
                return GoogleLocation.objects.get(place_id=options['place_id'])

        except Store.DoesNotExist:
            raise CommandError(f'Store not found')
        except GoogleLocation.DoesNotExist:
            raise CommandError(f'Google location not found')

    def _get_reviews(self, location, options):
        """Get reviews to analyze based on options"""
        reviews = GoogleReview.objects.filter(location=location)

        if options['force']:
            # Force reanalysis - mark all reviews as needing analysis
            updated = reviews.update(needs_analysis=True, analyzed_at=None)
            self.stdout.write(f'Marked {updated} review(s) for reanalysis')
        else:
            # Only analyze reviews that need it
            reviews = reviews.filter(needs_analysis=True)

        # Apply batch size limit
        if options['batch_size']:
            reviews = reviews[:options['batch_size']]

        # Order by date (newest first)
        reviews = reviews.order_by('-review_created_at')

        return reviews
