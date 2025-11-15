from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging
import re

logger = logging.getLogger(__name__)


def extract_review_date_range(reviews):
    """
    Extract oldest and newest review dates from review data.
    Returns (oldest_date, newest_date) as timezone-aware datetimes.
    """
    if not reviews:
        return None, None

    now = timezone.now()
    dates = []

    for review in reviews:
        # Try to get timestamp first (from Google Places API)
        timestamp = review.get('timestamp')
        if timestamp and isinstance(timestamp, int) and timestamp > 0:
            # Convert Unix timestamp to datetime
            review_date = timezone.datetime.fromtimestamp(timestamp, tz=timezone.get_current_timezone())
            dates.append(review_date)
        else:
            # Parse relative time text (from web scraping)
            time_text = review.get('time', '')
            review_date = parse_relative_time(time_text, now)
            if review_date:
                dates.append(review_date)

    if not dates:
        return None, None

    return min(dates), max(dates)


def parse_relative_time(time_text, reference_time):
    """
    Parse relative time strings like "2 months ago", "3 weeks ago" into datetime.
    Returns timezone-aware datetime or None if parsing fails.
    """
    if not time_text or not isinstance(time_text, str):
        return None

    time_text = time_text.lower().strip()

    # Patterns: "X days/weeks/months/years ago"
    patterns = [
        (r'(\d+)\s*day', 'days'),
        (r'(\d+)\s*week', 'weeks'),
        (r'(\d+)\s*month', 'months'),
        (r'(\d+)\s*year', 'years'),
        (r'a\s+day', 'days'),  # "a day ago"
        (r'a\s+week', 'weeks'),  # "a week ago"
        (r'a\s+month', 'months'),  # "a month ago"
        (r'a\s+year', 'years'),  # "a year ago"
    ]

    for pattern, unit in patterns:
        match = re.search(pattern, time_text)
        if match:
            # Extract number (default to 1 for "a week/month/year")
            try:
                number = int(match.group(1))
            except (IndexError, ValueError):
                number = 1

            # Calculate timedelta
            if unit == 'days':
                delta = timedelta(days=number)
            elif unit == 'weeks':
                delta = timedelta(weeks=number)
            elif unit == 'months':
                delta = timedelta(days=number * 30)  # Approximate
            elif unit == 'years':
                delta = timedelta(days=number * 365)  # Approximate
            else:
                continue

            return reference_time - delta

    return None


@shared_task(bind=True, max_retries=1)
def process_review_analysis(self, analysis_id):
    """
    Process review analysis in background
    1. Scrape Google Reviews
    2. Analyze for insights
    3. Generate micro-check suggestions
    4. Send email if email was captured
    """
    from .models import ReviewAnalysis
    from marketing.management.commands.scrape_google_reviews import Command as ScraperCommand
    from marketing.management.commands.research_google_reviews import Command as AnalyzerCommand
    
    try:
        analysis = ReviewAnalysis.objects.get(id=analysis_id)

        # Step 1: Initialize with engaging messages
        analysis.status = ReviewAnalysis.Status.PROCESSING

        # Cycle through fun messages to keep users engaged (like Claude's "thinking... pontificating...")
        progress_messages = [
            (f'🔍 Launching AI-powered analysis for {analysis.business_name}...', 5),
            ('🤔 Warming up the review analysis engines...', 8),
            ('👓 Putting on our reading glasses...', 10),
            (f'🗺️ Searching for "{analysis.business_name}" in {analysis.location}...', 12),
            ('🔮 Consulting the review oracle...', 14),
            ('🎯 Locking onto customer feedback signals...', 16),
            ('📡 Tuning into the voice of your customers...', 18),
        ]

        import time
        for message, percentage in progress_messages[:3]:  # Show first 3 messages quickly
            analysis.progress_message = message
            analysis.progress_percentage = percentage
            analysis.save()
            time.sleep(0.8)  # Brief pause for visual effect

        # Step 2: Start scraping
        scraper = ScraperCommand()
        scraper.stdout = MockStdout()

        logger.info(f"Starting scrape for {analysis.business_name}")

        # Continue with remaining pre-scrape messages
        for message, percentage in progress_messages[3:]:
            analysis.progress_message = message
            analysis.progress_percentage = percentage
            analysis.save()
            time.sleep(0.6)

        # Define progress callback to update analysis status
        # Use threading to avoid async context issues with Playwright
        import threading
        def update_progress(message, percentage):
            def _update():
                try:
                    # Re-fetch analysis to avoid stale object issues
                    fresh_analysis = ReviewAnalysis.objects.get(id=analysis_id)
                    fresh_analysis.progress_message = message
                    fresh_analysis.progress_percentage = percentage
                    fresh_analysis.save()
                except Exception as e:
                    logger.error(f"Error updating progress: {e}")

            # Run the update in a separate thread to avoid async context issues
            thread = threading.Thread(target=_update)
            thread.start()

        # FAST RESULTS APPROACH: Show API results first (<60s), then enhance with scraping
        # This gives us: fast initial results + comprehensive data from scraping

        place_id = None
        api_reviews = None
        business_info_from_api = None

        # Step 1: ALWAYS try Google Places API first (fast initial results)
        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_scrapes = ReviewAnalysis.objects.filter(
            created_at__gte=one_hour_ago,
            status__in=[ReviewAnalysis.Status.PROCESSING, ReviewAnalysis.Status.COMPLETED]
        ).count()

        skip_web_scraping = recent_scrapes > 10
        if skip_web_scraping:
            logger.info(f"Rate limit reached ({recent_scrapes} scrapes in past hour). Will use API-only mode.")
        else:
            logger.info(f"Rate limit OK ({recent_scrapes}/10 scrapes in past hour). Using fast results mode (API first, then scraping).")

        try:
            from django.conf import settings
            api_key = getattr(settings, 'GOOGLE_PLACES_API_KEY', None)

            if api_key:
                logger.info("Using Google Places API to find business and get initial reviews...")
                analysis.progress_message = '🔍 Finding your business...'
                analysis.progress_percentage = 15
                analysis.save()

                analyzer = AnalyzerCommand()
                analyzer.stdout = MockStdout()

                api_result = analyzer.fetch_reviews_google_places(
                    business_name=analysis.business_name,
                    location=analysis.location,
                    api_key=api_key,
                    max_reviews=5  # Just 5 for fast results
                )

                if api_result:
                    place_id = api_result.get('place_id')
                    api_reviews = api_result.get('reviews', [])
                    business_info_from_api = api_result.get('business_info', {})
                    logger.info(f"✓ Found business via API. Place ID: {place_id}, {len(api_reviews)} initial reviews")

                    # SHOW FAST RESULTS: Save initial analysis with API reviews immediately
                    if api_reviews and business_info_from_api:
                        logger.info(f"Showing fast results with {len(api_reviews)} reviews...")
                        analysis.progress_message = f'✅ Found {business_info_from_api.get("name")}! Analyzing initial reviews...'
                        analysis.progress_percentage = 25
                        analysis.google_rating = business_info_from_api.get('rating', 0)
                        analysis.google_address = business_info_from_api.get('address', '')
                        analysis.total_reviews_found = business_info_from_api.get('total_reviews', 0)
                        analysis.reviews_analyzed = len(api_reviews)

                        # Save initial scraped data with API reviews
                        oldest_date, newest_date = extract_review_date_range(api_reviews)
                        analysis.oldest_review_date = oldest_date
                        analysis.newest_review_date = newest_date
                        analysis.scraped_data = {
                            'business_name': business_info_from_api.get('name', analysis.business_name),
                            'location': business_info_from_api.get('address', analysis.location),
                            'business_info': business_info_from_api,
                            'reviews': api_reviews,
                            'source': 'google_places_api_initial',
                            'place_id': place_id,
                            'is_partial': True  # Flag to indicate more reviews coming
                        }
                        analysis.save()
                        logger.info("✓ Initial results saved, user can see them now")
                else:
                    logger.warning("Google Places API did not find the business")
            else:
                logger.info("GOOGLE_PLACES_API_KEY not configured, skipping API lookup")
        except Exception as api_error:
            logger.error(f"Google Places API error: {str(api_error)}", exc_info=True)

        # Step 2: Continue with web scraping to get more reviews (if not rate limited)
        scraped_reviews = []

        if not skip_web_scraping and place_id:
            try:
                # Try web scraping (with place_id for direct navigation)
                logger.info(f"Starting web scraping to get more reviews (user already seeing {len(api_reviews) if api_reviews else 0} initial reviews)...")
                analysis.progress_message = f'🌐 Loading more reviews from Google Maps...'
                analysis.progress_percentage = 30
                analysis.save()

                scraped_data = scraper.scrape_reviews(
                    business_name=analysis.business_name,
                    location=analysis.location,
                    max_reviews=200,  # Try for 200 more reviews
                    headless=True,
                    progress_callback=update_progress,
                    place_id=place_id  # Use place_id from API for direct navigation
                )

                if scraped_data and scraped_data.get('reviews'):
                    scraped_reviews = scraped_data.get('reviews', [])
                    logger.info(f"✓ Web scraping successful: {len(scraped_reviews)} additional reviews")
                else:
                    logger.warning("Web scraping returned no additional reviews")

            except Exception as e:
                logger.error(f"Scraping exception for {analysis_id}: {str(e)}", exc_info=True)

        # Step 3: Merge API and scraped reviews (avoiding duplicates)
        final_reviews = []
        if api_reviews:
            final_reviews.extend(api_reviews)
            logger.info(f"Starting with {len(api_reviews)} API reviews")

        if scraped_reviews:
            # Deduplicate by comparing author + text + rating (simple deduplication)
            existing_review_keys = {
                (r.get('author', ''), r.get('text', '')[:100], r.get('rating', 0))
                for r in final_reviews
            }

            added_count = 0
            for review in scraped_reviews:
                review_key = (review.get('author', ''), review.get('text', '')[:100], review.get('rating', 0))
                if review_key not in existing_review_keys:
                    final_reviews.append(review)
                    existing_review_keys.add(review_key)
                    added_count += 1

            logger.info(f"Added {added_count} unique reviews from scraping ({len(scraped_reviews) - added_count} duplicates filtered)")

        # Determine final data source
        if not final_reviews:
            logger.error("No reviews available from any source")
            scraped_data = None
        else:
            # Build final scraped_data with merged reviews
            scraped_data = {
                'business_name': business_info_from_api.get('name', analysis.business_name) if business_info_from_api else analysis.business_name,
                'location': business_info_from_api.get('address', analysis.location) if business_info_from_api else analysis.location,
                'business_info': business_info_from_api or {},
                'reviews': final_reviews,
                'source': f'api_and_scraping_{len(final_reviews)}reviews' if scraped_reviews else 'google_places_api_only',
                'place_id': place_id,
                'is_partial': False  # Now complete
            }
            logger.info(f"✓ Final dataset: {len(final_reviews)} total reviews ({len(api_reviews or [])} from API, {len(scraped_reviews)} from scraping)")

        # If both methods failed, mark as failed
        if not scraped_data:
            logger.error(f"All methods failed for {analysis.business_name} in {analysis.location}")
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = f'Unable to access Google Maps data for "{analysis.business_name}". This could be due to rate limiting or the business not being found. Please try again in a few minutes or verify the business name.'
            analysis.save()
            return

        if not scraped_data.get('reviews'):
            logger.warning(f"Found business but no reviews: {scraped_data.get('business_info', {})}")
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = f'Found business but no reviews were available. The business may not have any public reviews yet.'
            analysis.save()
            return

        # Step 3: Reviews found
        review_count = len(scraped_data['reviews'])
        business_info = scraped_data.get('business_info', {})
        total_reviews = business_info.get('total_reviews', 0)
        rating = business_info.get('rating', 0)

        # Extract review date range
        oldest_date, newest_date = extract_review_date_range(scraped_data['reviews'])

        # Truncate progress message to 200 chars to fit database field
        business_display_name = business_info.get("name", analysis.business_name)
        progress_msg = f'✅ Found {business_display_name}! Overall rating: {rating} ⭐ ({total_reviews:,} total reviews). Successfully loaded {review_count} recent reviews for analysis.'
        analysis.progress_message = progress_msg[:200]
        analysis.progress_percentage = 30
        analysis.scraped_data = scraped_data
        analysis.google_rating = rating
        analysis.google_address = business_info.get('address', '')
        analysis.total_reviews_found = total_reviews
        analysis.reviews_analyzed = review_count
        analysis.oldest_review_date = oldest_date
        analysis.newest_review_date = newest_date
        analysis.save()

        # Step 4: Reading reviews
        analysis.progress_message = f'📖 Reading through {review_count} customer reviews to understand their experiences...'[:200]
        analysis.progress_percentage = 45
        analysis.save()

        # Step 5: Analyzing sentiment
        analysis.progress_message = f'🎯 Analyzing customer sentiment across all {review_count} reviews and identifying recurring patterns...'[:200]
        analysis.progress_percentage = 60
        analysis.save()

        # Analyze reviews
        analyzer = AnalyzerCommand()
        reviews_formatted = scraped_data.get('reviews', [])

        insights = analyzer.analyze_reviews(reviews_formatted)

        # Step 6: Identifying issues
        analysis.progress_message = f'🔎 Identified key themes from customer feedback. Now pinpointing specific operational issues...'[:200]
        analysis.progress_percentage = 75
        analysis.insights = insights
        analysis.save()

        # Step 7: Generate recommendations
        analysis.progress_message = '💡 Generating personalized micro-check recommendations based on customer feedback patterns...'[:200]
        analysis.progress_percentage = 90
        analysis.save()

        micro_check_suggestions = analyzer.generate_microcheck_suggestions(insights)
        analysis.micro_check_suggestions = micro_check_suggestions
        analysis.save()

        # Step 8: Complete
        analysis.status = ReviewAnalysis.Status.COMPLETED
        num_issues = len(analysis.key_issues) if analysis.key_issues else 0
        num_suggestions = len(micro_check_suggestions) if micro_check_suggestions else 0
        analysis.progress_message = f'🎉 Analysis complete! Identified {num_issues} key operational areas and generated {num_suggestions} targeted micro-check recommendations.'[:200]
        analysis.progress_percentage = 100
        analysis.completed_at = timezone.now()
        analysis.save()

        logger.info(f"Analysis completed for {analysis_id}")

        # Update GoogleLocation with the scraped rating data if this analysis is linked to a store
        if analysis.place_id:
            from integrations.models import GoogleLocation
            try:
                google_location = GoogleLocation.objects.filter(place_id=analysis.place_id).first()
                if google_location:
                    google_location.average_rating = analysis.google_rating
                    google_location.total_review_count = analysis.total_reviews_found or analysis.reviews_analyzed or 0
                    google_location.synced_at = timezone.now()
                    google_location.save()
                    logger.info(f"Updated GoogleLocation {google_location.id} with rating {analysis.google_rating}")
            except Exception as e:
                logger.error(f"Failed to update GoogleLocation: {str(e)}")

        # Send email if email was captured
        if analysis.contact_email:
            send_analysis_email.delay(analysis_id)
        
    except Exception as e:
        logger.error(f"Error processing analysis {analysis_id}: {str(e)}", exc_info=True)
        try:
            analysis = ReviewAnalysis.objects.get(id=analysis_id)
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = f"Processing error: {str(e)}"
            analysis.save()
        except:
            pass
        raise


@shared_task
def send_analysis_email(analysis_id):
    """Send email with analysis results"""
    from .models import ReviewAnalysis
    from django.core.mail import send_mail
    from django.conf import settings
    from django.template.loader import render_to_string
    
    try:
        analysis = ReviewAnalysis.objects.get(id=analysis_id)
        
        if not analysis.contact_email:
            return
        
        # Prepare email content
        context = {
            'analysis': analysis,
            'business_name': analysis.business_name,
            'google_rating': analysis.google_rating,
            'reviews_analyzed': analysis.reviews_analyzed,
            'key_issues': analysis.key_issues,
            'sentiment': analysis.sentiment_summary,
            'view_url': analysis.get_public_url(),
        }
        
        subject = f"Your Review Analysis for {analysis.business_name} is Ready!"
        
        # Plain text version
        key_issues = analysis.key_issues or []
        num_issues = len(key_issues)
        num_suggestions = len(analysis.micro_check_suggestions or [])

        # Build top issues section
        top_issues_text = ''
        if key_issues:
            top_issues_text = '🔍 Top Issues from Customer Reviews:\n'
            top_issues_text += chr(10).join([f"{i+1}. {issue['theme']}: {issue['mentions']} mentions" for i, issue in enumerate(key_issues[:3])])
            top_issues_text += '\n\n'

        message = f"""
Hi{' ' + analysis.contact_name if analysis.contact_name else ''},

Your Google Reviews analysis for {analysis.business_name} is complete!

📊 Overview:
- Google Rating: {analysis.google_rating or 'N/A'} stars
- Reviews Analyzed: {analysis.reviews_analyzed or 0}
- Key Issues Found: {num_issues}

{top_issues_text}💡 We've generated {num_suggestions} targeted micro-check recommendations to address these issues.

View your full analysis here:
{analysis.get_public_url()}

Ready to turn these insights into action? Start your free trial:
{settings.FRONTEND_URL}/trial-signup?analysis={analysis.id}

Best regards,
The PeakOps Team
        """
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[analysis.contact_email],
            fail_silently=False,
        )
        
        analysis.email_sent_at = timezone.now()
        analysis.save(update_fields=['email_sent_at'])
        
        logger.info(f"Email sent to {analysis.contact_email} for analysis {analysis_id}")
        
    except Exception as e:
        logger.error(f"Error sending email for analysis {analysis_id}: {str(e)}")


@shared_task(bind=True)
def aggregate_store_review_analysis(self, analysis_id):
    """
    Aggregate individual GoogleReviewAnalysis records into store-level ReviewAnalysis insights.

    This is for INTERNAL store analysis (from synced GoogleReviews),
    NOT for external marketing analysis (from web scraping).

    Args:
        analysis_id: UUID of the ReviewAnalysis record to populate
    """
    from .models import ReviewAnalysis
    from integrations.models import GoogleReview, GoogleReviewAnalysis
    from collections import Counter
    import statistics

    try:
        analysis = ReviewAnalysis.objects.get(id=analysis_id)

        # Ensure this is a store-based analysis
        if not analysis.store:
            logger.error(f"Analysis {analysis_id} has no store - cannot aggregate")
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = "Analysis not linked to a store"
            analysis.save()
            return

        store = analysis.store
        if not hasattr(store, 'google_location') or not store.google_location:
            logger.error(f"Store {store.id} has no Google location")
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = "Store has no linked Google location"
            analysis.save()
            return

        location = store.google_location

        # Update status
        analysis.status = ReviewAnalysis.Status.PROCESSING
        analysis.progress_message = f'Analyzing {location.google_location_name} reviews...'
        analysis.progress_percentage = 10
        analysis.save()

        # Get all reviews for this location with their analyses
        reviews_with_analysis = GoogleReview.objects.filter(
            location=location
        ).select_related('analysis').order_by('-review_created_at')

        total_reviews = reviews_with_analysis.count()

        if total_reviews == 0:
            logger.warning(f"No reviews found for location {location.id}")
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = "No reviews found for this location"
            analysis.save()
            return

        logger.info(f"Aggregating {total_reviews} reviews for store {store.name}")

        # Progress update
        analysis.progress_message = f'Processing {total_reviews} customer reviews...'
        analysis.progress_percentage = 30
        analysis.google_rating = location.average_rating
        analysis.google_address = location.address
        analysis.total_reviews_found = location.total_review_count or total_reviews
        analysis.reviews_analyzed = total_reviews
        analysis.save()

        # Format reviews for AI analysis (same format as marketing flow)
        formatted_reviews = []
        for review in reviews_with_analysis:
            formatted_reviews.append({
                'author': review.reviewer_name,
                'rating': review.rating,
                'text': review.review_text,
                'timestamp': int(review.review_created_at.timestamp()),
                'time': review.review_created_at.strftime('%Y-%m-%d')
            })

        # Progress update
        analysis.progress_message = 'Analyzing reviews with AI...'
        analysis.progress_percentage = 40
        analysis.save()

        # Use the SAME AI analyzer as marketing flow
        from marketing.management.commands.research_google_reviews import Command as AnalyzerCommand
        analyzer = AnalyzerCommand()
        analyzer.stdout = MockStdout()

        logger.info(f"Running AI analysis on {len(formatted_reviews)} reviews for store {store.name}")

        # This gives us AI-powered insights (same quality as marketing)
        insights = analyzer.analyze_reviews(formatted_reviews)

        # Extract date range
        dates = [r.review_created_at for r in reviews_with_analysis]
        oldest_date = min(dates) if dates else None
        newest_date = max(dates) if dates else None

        analysis.oldest_review_date = oldest_date
        analysis.newest_review_date = newest_date

        # Progress update
        analysis.progress_message = 'Generating micro-check recommendations...'
        analysis.progress_percentage = 80
        analysis.save()

        # This gives us AI-generated micro-checks (same quality as marketing)
        micro_check_suggestions = analyzer.generate_microcheck_suggestions(insights)

        # Save results
        # Note: sentiment_summary is a computed property, no need to set it directly
        analysis.insights = insights
        analysis.micro_check_suggestions = micro_check_suggestions
        analysis.status = ReviewAnalysis.Status.COMPLETED
        analysis.progress_message = f'Analysis complete! Analyzed {total_reviews} reviews.'
        analysis.progress_percentage = 100
        analysis.completed_at = timezone.now()
        analysis.save()

        logger.info(f"Successfully aggregated analysis for store {store.name} (analysis_id={analysis_id})")

    except Exception as e:
        logger.error(f"Error aggregating store review analysis {analysis_id}: {str(e)}", exc_info=True)
        try:
            analysis = ReviewAnalysis.objects.get(id=analysis_id)
            analysis.status = ReviewAnalysis.Status.FAILED
            analysis.error_message = f"Aggregation error: {str(e)}"
            analysis.save()
        except:
            pass
        raise


class MockStdout:
    """Mock stdout for management command"""
    def write(self, msg, **kwargs):
        pass

    def style(self):
        return self

    def SUCCESS(self, msg):
        return msg

    def ERROR(self, msg):
        return msg

    def WARNING(self, msg):
        return msg
