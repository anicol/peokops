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

        # Step 1: Initialize
        analysis.status = ReviewAnalysis.Status.PROCESSING
        analysis.progress_message = f'🔍 Launching AI-powered analysis for {analysis.business_name}. Connecting to Google Maps...'
        analysis.progress_percentage = 5
        analysis.save()

        # Step 2: Start scraping
        scraper = ScraperCommand()
        scraper.stdout = MockStdout()

        logger.info(f"Starting scrape for {analysis.business_name}")

        analysis.progress_message = f'🗺️  Searching for "{analysis.business_name}" in {analysis.location}...'
        analysis.progress_percentage = 15
        analysis.save()

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

        try:
            # Add a small delay to avoid rate limiting from Google Maps
            import time
            time.sleep(2)

            scraped_data = scraper.scrape_reviews(
                business_name=analysis.business_name,
                location=analysis.location,
                max_reviews=200,  # Increased to 200 for better analysis
                headless=True,
                progress_callback=update_progress
            )

            logger.info(f"Scraper returned: {type(scraped_data)}")
            if scraped_data:
                logger.info(f"Business found: {scraped_data.get('business_info', {}).get('name', 'Unknown')}")
                logger.info(f"Reviews scraped: {len(scraped_data.get('reviews', []))}")

        except Exception as e:
            logger.error(f"Scraping exception for {analysis_id}: {str(e)}", exc_info=True)
            scraped_data = None  # Will try API fallback below

        # If web scraping failed, try Google Places API as fallback
        if not scraped_data or not scraped_data.get('reviews'):
            logger.info("Web scraping failed or returned no reviews, trying Google Places API fallback")
            analysis.progress_message = '🔄 Trying alternative method (Google Places API)...'
            analysis.progress_percentage = 20
            analysis.save()

            try:
                from django.conf import settings
                api_key = getattr(settings, 'GOOGLE_PLACES_API_KEY', None)

                if api_key:
                    analyzer = AnalyzerCommand()
                    analyzer.stdout = MockStdout()

                    reviews = analyzer.fetch_reviews_google_places(
                        business_name=analysis.business_name,
                        location=analysis.location,
                        api_key=api_key,
                        max_reviews=50
                    )

                    if reviews:
                        scraped_data = {
                            'business_name': analysis.business_name,
                            'location': analysis.location,
                            'business_info': {
                                'name': analysis.business_name,
                                'rating': reviews[0].get('rating', 0) if reviews else 0,
                                'total_reviews': len(reviews),
                                'address': analysis.location
                            },
                            'reviews': reviews,
                            'source': 'google_places_api'
                        }
                        logger.info(f"Google Places API fallback successful: {len(reviews)} reviews")
                else:
                    logger.warning("GOOGLE_PLACES_API_KEY not configured, cannot use fallback")
            except Exception as api_error:
                logger.error(f"Google Places API fallback also failed: {str(api_error)}")

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

        analysis.progress_message = f'✅ Found {business_info.get("name", analysis.business_name)}! Overall rating: {rating} ⭐ ({total_reviews:,} total reviews). Successfully loaded {review_count} recent reviews for analysis.'
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
        analysis.progress_message = f'📖 Reading through {review_count} customer reviews to understand their experiences...'
        analysis.progress_percentage = 45
        analysis.save()

        # Step 5: Analyzing sentiment
        analysis.progress_message = f'🎯 Analyzing customer sentiment across all {review_count} reviews and identifying recurring patterns...'
        analysis.progress_percentage = 60
        analysis.save()

        # Analyze reviews
        analyzer = AnalyzerCommand()
        reviews_formatted = scraped_data.get('reviews', [])

        insights = analyzer.analyze_reviews(reviews_formatted)

        # Step 6: Identifying issues
        analysis.progress_message = f'🔎 Identified key themes from customer feedback. Now pinpointing specific operational issues...'
        analysis.progress_percentage = 75
        analysis.insights = insights
        analysis.save()

        # Step 7: Generate recommendations
        analysis.progress_message = '💡 Generating personalized micro-check recommendations based on customer feedback patterns...'
        analysis.progress_percentage = 90
        analysis.save()

        micro_check_suggestions = analyzer.generate_microcheck_suggestions(insights)
        analysis.micro_check_suggestions = micro_check_suggestions
        analysis.save()

        # Step 8: Complete
        analysis.status = ReviewAnalysis.Status.COMPLETED
        num_issues = len(analysis.key_issues) if analysis.key_issues else 0
        num_suggestions = len(micro_check_suggestions) if micro_check_suggestions else 0
        analysis.progress_message = f'🎉 Analysis complete! Identified {num_issues} key operational areas and generated {num_suggestions} targeted micro-check recommendations.'
        analysis.progress_percentage = 100
        analysis.completed_at = timezone.now()
        analysis.save()
        
        logger.info(f"Analysis completed for {analysis_id}")
        
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
