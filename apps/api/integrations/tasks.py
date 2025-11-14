"""
Celery tasks for 7shifts integration

Automated syncing of employees and shifts from 7shifts to keep local data fresh.
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

from .models import SevenShiftsConfig
from .sync_service import SevenShiftsSyncService

logger = logging.getLogger(__name__)


@shared_task(name='integrations.sync_all_seven_shifts_accounts')
def sync_all_seven_shifts_accounts():
    """
    Sync all active 7shifts accounts.

    Run daily via Celery Beat to keep employee and shift data fresh.
    """
    logger.info("Starting sync for all 7shifts accounts")

    # Get all active 7shifts configurations
    configs = SevenShiftsConfig.objects.filter(is_active=True)

    total_synced = 0
    total_failed = 0

    for config in configs:
        try:
            logger.info(f"Syncing 7shifts for account: {config.account.name}")

            sync_service = SevenShiftsSyncService(config)
            result = sync_service.sync_all()

            total_synced += 1
            logger.info(f"Successfully synced account {config.account.name}: {result}")

        except Exception as e:
            total_failed += 1
            logger.error(f"Failed to sync account {config.account.name}: {str(e)}")

    logger.info(f"7shifts sync completed. Success: {total_synced}, Failed: {total_failed}")

    return {
        'total_accounts': configs.count(),
        'synced': total_synced,
        'failed': total_failed
    }


@shared_task(name='integrations.sync_seven_shifts_employees')
def sync_seven_shifts_employees():
    """
    Sync employees only for all active 7shifts accounts.

    Run daily to keep employee roster fresh.
    """
    logger.info("Starting employee sync for all 7shifts accounts")

    configs = SevenShiftsConfig.objects.filter(
        is_active=True,
        sync_employees_enabled=True
    )

    total_synced = 0
    total_employees = 0
    total_failed = 0

    for config in configs:
        try:
            logger.info(f"Syncing employees for account: {config.account.name}")

            sync_service = SevenShiftsSyncService(config)
            result = sync_service.sync_employees()

            total_synced += 1
            total_employees += result.get('employees_synced', 0)
            logger.info(f"Synced {result.get('employees_synced', 0)} employees for {config.account.name}")

        except Exception as e:
            total_failed += 1
            logger.error(f"Failed to sync employees for {config.account.name}: {str(e)}")

    logger.info(f"Employee sync completed. Accounts: {total_synced}, Total employees: {total_employees}, Failed: {total_failed}")

    return {
        'accounts_synced': total_synced,
        'total_employees': total_employees,
        'failed': total_failed
    }


@shared_task(name='integrations.sync_seven_shifts_shifts')
def sync_seven_shifts_shifts(days_ahead: int = 14):
    """
    Sync shift schedules for all active 7shifts accounts.

    Run twice daily to keep shift schedules fresh.

    Args:
        days_ahead: Number of days to sync ahead (default: 14)
    """
    logger.info(f"Starting shift sync for all 7shifts accounts ({days_ahead} days ahead)")

    configs = SevenShiftsConfig.objects.filter(
        is_active=True,
        sync_shifts_enabled=True
    )

    total_synced = 0
    total_shifts = 0
    total_failed = 0

    for config in configs:
        try:
            logger.info(f"Syncing shifts for account: {config.account.name}")

            sync_service = SevenShiftsSyncService(config)
            result = sync_service.sync_shifts(days_ahead=days_ahead)

            total_synced += 1
            total_shifts += result.get('shifts_synced', 0)
            logger.info(f"Synced {result.get('shifts_synced', 0)} shifts for {config.account.name}")

        except Exception as e:
            total_failed += 1
            logger.error(f"Failed to sync shifts for {config.account.name}: {str(e)}")

    logger.info(f"Shift sync completed. Accounts: {total_synced}, Total shifts: {total_shifts}, Failed: {total_failed}")

    return {
        'accounts_synced': total_synced,
        'total_shifts': total_shifts,
        'failed': total_failed
    }


@shared_task(name='integrations.sync_seven_shifts_account')
def sync_seven_shifts_account(account_id: int):
    """
    Sync a specific 7shifts account (employees and shifts).

    Used for manual sync triggers from the UI.

    Args:
        account_id: ID of the account to sync
    """
    try:
        config = SevenShiftsConfig.objects.get(account_id=account_id, is_active=True)
    except SevenShiftsConfig.DoesNotExist:
        logger.error(f"No active 7shifts config found for account {account_id}")
        return {'error': 'No active 7shifts configuration found'}

    logger.info(f"Syncing 7shifts for account: {config.account.name}")

    try:
        sync_service = SevenShiftsSyncService(config)
        result = sync_service.sync_all()

        logger.info(f"Successfully synced account {config.account.name}: {result}")
        return result

    except Exception as e:
        logger.error(f"Failed to sync account {config.account.name}: {str(e)}")
        raise


@shared_task(name='integrations.cleanup_old_shifts')
def cleanup_old_shifts(days_to_keep: int = 30):
    """
    Clean up old shift records to prevent database bloat.

    Run weekly to delete shifts older than X days.

    Args:
        days_to_keep: Number of days to keep (default: 30)
    """
    from .models import SevenShiftsShift

    cutoff_date = timezone.now() - timedelta(days=days_to_keep)

    logger.info(f"Cleaning up shifts older than {cutoff_date}")

    deleted_count, _ = SevenShiftsShift.objects.filter(
        end_time__lt=cutoff_date
    ).delete()

    logger.info(f"Deleted {deleted_count} old shift records")

    return {
        'deleted_count': deleted_count,
        'cutoff_date': cutoff_date.isoformat()
    }


@shared_task(name='integrations.cleanup_old_sync_logs')
def cleanup_old_sync_logs(days_to_keep: int = 90):
    """
    Clean up old sync logs to prevent database bloat.

    Run monthly to delete logs older than X days.

    Args:
        days_to_keep: Number of days to keep (default: 90)
    """
    from .models import SevenShiftsSyncLog

    cutoff_date = timezone.now() - timedelta(days=days_to_keep)

    logger.info(f"Cleaning up sync logs older than {cutoff_date}")

    deleted_count, _ = SevenShiftsSyncLog.objects.filter(
        started_at__lt=cutoff_date
    ).delete()

    logger.info(f"Deleted {deleted_count} old sync log records")

    return {
        'deleted_count': deleted_count,
        'cutoff_date': cutoff_date.isoformat()
    }


# ==================== Google Reviews Integration Tasks ====================


@shared_task(name='integrations.sync_all_google_reviews')
def sync_all_google_reviews():
    """
    Sync reviews for all active Google Reviews integrations.

    Run daily via Celery Beat to keep review data fresh.
    """
    from .models import GoogleReviewsConfig
    from .google_reviews_sync import GoogleReviewsSyncService

    logger.info("Starting sync for all Google Reviews accounts")

    # Get all active Google Reviews configurations
    configs = GoogleReviewsConfig.objects.filter(is_active=True)

    total_synced = 0
    total_reviews = 0
    total_failed = 0

    for config in configs:
        try:
            logger.info(f"Syncing Google Reviews for account: {config.account.name}")

            sync_service = GoogleReviewsSyncService(config)
            result = sync_service.sync_all()

            total_synced += 1
            total_reviews += result.get('reviews_synced', 0)
            logger.info(f"Successfully synced {result.get('reviews_synced', 0)} reviews for {config.account.name}")

        except Exception as e:
            total_failed += 1
            logger.error(f"Failed to sync Google Reviews for {config.account.name}: {str(e)}")

    logger.info(f"Google Reviews sync completed. Success: {total_synced}, Total reviews: {total_reviews}, Failed: {total_failed}")

    return {
        'total_accounts': configs.count(),
        'synced': total_synced,
        'total_reviews': total_reviews,
        'failed': total_failed
    }


@shared_task(name='integrations.analyze_pending_reviews')
def analyze_pending_reviews(batch_size: int = 50):
    """
    Analyze pending reviews using AI.

    Run every few hours to process new reviews that haven't been analyzed yet.

    Args:
        batch_size: Number of reviews to analyze per run (default: 50)
    """
    from .models import GoogleReview, GoogleReviewAnalysis, GoogleReviewsConfig
    from ai_services.bedrock_service import BedrockRecommendationService
    from django.utils import timezone
    from datetime import datetime

    logger.info(f"Starting AI analysis for pending reviews (batch size: {batch_size})")

    # Get reviews that need analysis
    pending_reviews = GoogleReview.objects.filter(
        needs_analysis=True
    ).select_related('location', 'account').order_by('review_created_at')[:batch_size]

    if not pending_reviews.exists():
        logger.info("No pending reviews to analyze")
        return {
            'analyzed': 0,
            'failed': 0
        }

    bedrock_service = BedrockRecommendationService()
    analyzed_count = 0
    failed_count = 0

    for review in pending_reviews:
        # Check if account has AI analysis enabled (via min_rating_for_analysis)
        try:
            config = review.account.google_reviews_config
            if review.rating > config.min_rating_for_analysis:
                # Skip high-rated reviews if config says so
                review.needs_analysis = False
                review.analyzed_at = timezone.now()
                review.save(update_fields=['needs_analysis', 'analyzed_at'])
                continue
        except GoogleReviewsConfig.DoesNotExist:
            logger.warning(f"No config found for account {review.account.name}, skipping review {review.id}")
            continue

        try:
            start_time = datetime.now()

            # Analyze the review
            analysis_result = bedrock_service.analyze_review(
                review_text=review.review_text,
                rating=review.rating
            )

            # Calculate processing time
            processing_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)

            # Create or update analysis
            GoogleReviewAnalysis.objects.update_or_create(
                review=review,
                defaults={
                    'topics': analysis_result['topics'],
                    'sentiment_score': analysis_result['sentiment_score'],
                    'actionable_issues': analysis_result['actionable_issues'],
                    'suggested_category': analysis_result['suggested_category'],
                    'confidence': analysis_result.get('confidence', 0.5),
                    'model_used': 'claude-3-haiku' if bedrock_service.enabled else 'fallback',
                    'processing_time_ms': processing_time_ms
                }
            )

            # Mark review as analyzed
            review.needs_analysis = False
            review.analyzed_at = timezone.now()
            review.save(update_fields=['needs_analysis', 'analyzed_at'])

            analyzed_count += 1
            logger.info(f"Analyzed review {review.id}: {analysis_result['suggested_category']}")

        except Exception as e:
            failed_count += 1
            logger.error(f"Failed to analyze review {review.id}: {str(e)}")

    logger.info(f"Review analysis completed. Analyzed: {analyzed_count}, Failed: {failed_count}")

    return {
        'analyzed': analyzed_count,
        'failed': failed_count
    }


@shared_task(name='integrations.sync_google_reviews_account')
def sync_google_reviews_account(account_id: int):
    """
    Sync Google Reviews for a specific account.

    Used for manual sync triggers from the UI.

    Args:
        account_id: ID of the account to sync
    """
    from .models import GoogleReviewsConfig
    from .google_reviews_sync import GoogleReviewsSyncService

    try:
        config = GoogleReviewsConfig.objects.get(account_id=account_id, is_active=True)
    except GoogleReviewsConfig.DoesNotExist:
        logger.error(f"No active Google Reviews config found for account {account_id}")
        return {'error': 'No active Google Reviews configuration found'}

    logger.info(f"Syncing Google Reviews for account: {config.account.name}")

    try:
        sync_service = GoogleReviewsSyncService(config)
        result = sync_service.sync_all()

        logger.info(f"Successfully synced Google Reviews for {config.account.name}: {result}")
        return result

    except Exception as e:
        logger.error(f"Failed to sync Google Reviews for {config.account.name}: {str(e)}")
        raise


@shared_task(name='integrations.cleanup_old_reviews')
def cleanup_old_reviews(days_to_keep: int = 90):
    """
    Clean up old review records to prevent database bloat.

    Run monthly to archive reviews older than X days.

    Args:
        days_to_keep: Number of days to keep (default: 90)
    """
    from .models import GoogleReview

    cutoff_date = timezone.now() - timedelta(days=days_to_keep)

    logger.info(f"Cleaning up reviews older than {cutoff_date}")

    deleted_count, _ = GoogleReview.objects.filter(
        review_created_at__lt=cutoff_date
    ).delete()

    logger.info(f"Deleted {deleted_count} old review records")

    return {
        'deleted_count': deleted_count,
        'cutoff_date': cutoff_date.isoformat()
    }


@shared_task(name='integrations.generate_micro_checks_from_reviews')
def generate_micro_checks_from_reviews(days_back: int = 7):
    """
    Generate micro-checks from review patterns for all active accounts.

    Run weekly to create micro-checks based on recurring customer feedback.

    Args:
        days_back: Number of days to analyze (default: 7)
    """
    from .models import GoogleReviewsConfig
    from .review_micro_check_generator import ReviewMicroCheckGenerator

    logger.info("Starting micro-check generation from reviews")

    # Get all active configs with auto-generation enabled
    configs = GoogleReviewsConfig.objects.filter(
        is_active=True,
        auto_generate_checks=True
    )

    if not configs.exists():
        logger.info("No accounts with auto-generation enabled")
        return {
            'accounts_processed': 0,
            'total_checks_generated': 0
        }

    generator = ReviewMicroCheckGenerator()
    total_checks = 0
    accounts_processed = 0

    for config in configs:
        try:
            logger.info(f"Generating micro-checks for account: {config.account.name}")

            result = generator.generate_checks_for_account(
                account_id=config.account.id,
                days_back=days_back
            )

            checks_generated = result.get('generated_count', 0)
            total_checks += checks_generated
            accounts_processed += 1

            logger.info(f"Generated {checks_generated} checks for {config.account.name}")

        except Exception as e:
            logger.error(f"Failed to generate checks for {config.account.name}: {str(e)}")
            continue

    logger.info(f"Micro-check generation completed. Accounts: {accounts_processed}, Total checks: {total_checks}")

    return {
        'accounts_processed': accounts_processed,
        'total_checks_generated': total_checks
    }


def process_google_reviews_for_location(location, max_reviews=300, source='scraped'):
    """
    Shared function to scrape Google reviews and create GoogleReview records.

    This function is used by both:
    1. Marketing workflow (process_review_analysis) - for prospects/trials
    2. Direct linking workflow (scrape_google_reviews) - for customer linking

    Args:
        location: GoogleLocation instance
        max_reviews: Maximum number of reviews to scrape (default: 300)
        source: Source of the reviews ('scraped' or 'oauth')

    Returns:
        dict with results: {
            'success': bool,
            'reviews_created': int,
            'total_reviews_found': int,
            'recommendations': list (micro-check suggestions)
        }
    """
    from .models import GoogleReview
    from marketing.management.commands.scrape_google_reviews import Command as ScrapeCommand
    from marketing.management.commands.research_google_reviews import Command as AnalysisCommand
    from datetime import datetime
    import hashlib

    logger.info(f"Processing reviews for {location.google_location_name}")

    # Scrape reviews using Playwright
    scraper = ScrapeCommand()
    reviews_data = scraper.scrape_reviews(
        business_name=location.google_location_name,
        location=location.address or '',
        place_id=location.place_id,
        max_reviews=max_reviews,
        headless=True,
        progress_callback=None
    )

    if not reviews_data or not reviews_data.get('reviews'):
        logger.warning(f"No reviews found for {location.google_location_name}")
        return {
            'success': True,
            'reviews_created': 0,
            'total_reviews_found': 0,
            'recommendations': []
        }

    # Extract business info
    business_info = reviews_data.get('business_info', {})
    rating = business_info.get('rating')
    total_reviews = business_info.get('total_reviews', 0)

    # Update GoogleLocation with rating and review count
    if rating:
        location.average_rating = float(rating)
    location.total_review_count = total_reviews
    location.save(update_fields=['average_rating', 'total_review_count'])

    logger.info(f"Updated location rating: {rating}, total: {total_reviews}")

    # Create GoogleReview records
    reviews_created = 0
    for review in reviews_data.get('reviews', []):
        try:
            # Parse review date
            review_date_str = review.get('date', '')
            review_date = None
            if review_date_str:
                try:
                    # Try common date formats
                    for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y']:
                        try:
                            review_date = datetime.strptime(review_date_str, fmt)
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass

            if not review_date:
                review_date = timezone.now()

            # Create unique google_review_id from text hash
            review_text = review.get('text', '')
            reviewer_name = review.get('author', 'Anonymous')
            rating_val = review.get('rating', 5)

            unique_str = f"{location.google_location_id}:{reviewer_name}:{review_date_str}:{review_text[:100]}"
            google_review_id = hashlib.md5(unique_str.encode()).hexdigest()

            # Create or update review
            google_review, created = GoogleReview.objects.update_or_create(
                google_review_id=google_review_id,
                defaults={
                    'location': location,
                    'account': location.account,
                    'reviewer_name': reviewer_name,
                    'rating': rating_val,
                    'review_text': review_text,
                    'review_reply': review.get('owner_response', ''),
                    'review_created_at': review_date,
                    'source': source,
                    'is_verified': (source == 'oauth'),
                    'needs_analysis': True  # Queue for AI analysis
                }
            )

            if created:
                reviews_created += 1

        except Exception as e:
            logger.error(f"Failed to create GoogleReview: {str(e)}")
            continue

    logger.info(f"Created {reviews_created} GoogleReview records for {location.google_location_name}")

    # Create or update ReviewAnalysis for this store
    if location.store:
        from insights.models import ReviewAnalysis
        try:
            total_reviews_for_store = GoogleReview.objects.filter(location=location).count()

            analysis, created = ReviewAnalysis.objects.update_or_create(
                store=location.store,
                defaults={
                    'place_id': location.place_id or '',
                    'reviews_analyzed': total_reviews_for_store,
                    'status': ReviewAnalysis.Status.COMPLETED,
                }
            )
            action = "Created" if created else "Updated"
            logger.info(f"{action} ReviewAnalysis for store {location.store.name} with {total_reviews_for_store} reviews")
        except Exception as e:
            logger.error(f"Failed to create/update ReviewAnalysis: {str(e)}")

    # Generate micro-check recommendations
    try:
        analyzer = AnalysisCommand()
        reviews_formatted = reviews_data.get('reviews', [])
        insights = analyzer.analyze_reviews(reviews_formatted)
        recommendations = analyzer.generate_microcheck_suggestions(insights)
        logger.info(f"Generated {len(recommendations)} micro-check recommendations")
    except Exception as e:
        logger.error(f"Failed to generate recommendations: {str(e)}")
        recommendations = []

    return {
        'success': True,
        'reviews_created': reviews_created,
        'total_reviews_found': total_reviews,
        'recommendations': recommendations
    }


@shared_task(name='integrations.scrape_google_reviews')
def scrape_google_reviews(google_location_id):
    """
    Scrape Google reviews for a newly created GoogleLocation and populate GoogleReview records.

    This task is triggered when a store is manually linked with a Google location.
    It uses the shared review processing function.

    Args:
        google_location_id: UUID of the GoogleLocation to scrape reviews for
    """
    from .models import GoogleLocation

    logger.info(f"Starting review scrape for GoogleLocation {google_location_id}")

    try:
        location = GoogleLocation.objects.select_related('store', 'account').get(id=google_location_id)
    except GoogleLocation.DoesNotExist:
        logger.error(f"GoogleLocation {google_location_id} not found")
        return {'error': 'GoogleLocation not found'}

    try:
        result = process_google_reviews_for_location(location, max_reviews=300, source='scraped')
        result['location_id'] = str(location.id)
        return result

    except Exception as e:
        logger.error(f"Failed to scrape reviews for location {google_location_id}: {str(e)}")
        return {'error': str(e)}
