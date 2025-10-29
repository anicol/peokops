"""
Google Reviews sync service

Handles syncing of Google Business Profile locations and reviews.
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings

from .models import (
    GoogleReviewsConfig,
    GoogleLocation,
    GoogleReview,
    ReviewSyncLog
)
from .google_reviews_client import (
    GoogleReviewsClient,
    parse_google_location,
    parse_google_review
)

logger = logging.getLogger(__name__)


class GoogleReviewsSyncService:
    """Service for syncing Google Reviews data"""

    def __init__(self, config: GoogleReviewsConfig):
        """
        Initialize sync service with a Google Reviews configuration.

        Args:
            config: GoogleReviewsConfig instance
        """
        self.config = config
        self.account = config.account

        # Decrypt tokens using the proper method
        access_token = GoogleReviewsClient.decrypt_token(config.access_token_encrypted)
        refresh_token = GoogleReviewsClient.decrypt_token(config.refresh_token_encrypted)

        # Initialize API client
        self.client = GoogleReviewsClient(access_token, refresh_token)

        # Check if token needs refresh
        if config.token_expires_at <= timezone.now():
            self._refresh_token()

    def _refresh_token(self):
        """Refresh the OAuth access token"""
        try:
            client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
            client_secret = getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', '')

            if not client_id or not client_secret:
                logger.error("Google OAuth credentials not configured in settings")
                return

            token_data = self.client.refresh_access_token(client_id, client_secret)

            # Encrypt and save new token using the proper method
            encrypted_access_token = GoogleReviewsClient.encrypt_token(token_data['access_token']).encode()

            self.config.access_token_encrypted = encrypted_access_token
            self.config.token_expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
            self.config.save(update_fields=['access_token_encrypted', 'token_expires_at'])

            logger.info(f"Refreshed access token for account {self.account.name}")

        except Exception as e:
            logger.error(f"Failed to refresh access token: {e}")
            raise

    def sync_all(self):
        """
        Sync both locations and reviews.

        Returns:
            dict with sync results
        """
        sync_log = ReviewSyncLog.objects.create(
            account=self.account,
            sync_type=ReviewSyncLog.SyncType.FULL,
            status=ReviewSyncLog.Status.SUCCESS
        )

        start_time = timezone.now()
        total_locations = 0
        total_reviews = 0
        errors = []

        try:
            # Sync locations first
            locations_result = self.sync_locations()
            total_locations = locations_result['locations_synced']

            # Sync reviews for each location
            reviews_result = self.sync_reviews()
            total_reviews = reviews_result['reviews_synced']

            # Update sync log
            sync_log.items_synced = total_locations + total_reviews
            sync_log.status = ReviewSyncLog.Status.SUCCESS
            sync_log.completed_at = timezone.now()
            sync_log.duration_seconds = (timezone.now() - start_time).total_seconds()
            sync_log.save()

            # Update config last sync time
            self.config.last_sync_at = timezone.now()
            self.config.save(update_fields=['last_sync_at'])

            logger.info(f"Full sync completed for {self.account.name}: {total_locations} locations, {total_reviews} reviews")

            return {
                'locations_synced': total_locations,
                'reviews_synced': total_reviews,
                'errors': errors
            }

        except Exception as e:
            sync_log.status = ReviewSyncLog.Status.FAILED
            sync_log.errors_count = 1
            sync_log.error_details = {'error': str(e)}
            sync_log.completed_at = timezone.now()
            sync_log.duration_seconds = (timezone.now() - start_time).total_seconds()
            sync_log.save()

            logger.error(f"Full sync failed for {self.account.name}: {e}")
            raise

    def sync_locations(self):
        """
        Sync locations from Google Business Profile.

        Returns:
            dict with locations_synced count
        """
        logger.info(f"Syncing locations for account {self.account.name}")

        try:
            # Get locations from Google
            google_locations = self.client.list_locations(
                account_name=f"accounts/{self.config.google_account_id}"
            )

            synced_count = 0

            for location_data in google_locations:
                try:
                    parsed_location = parse_google_location(location_data)

                    # Create or update location
                    location, created = GoogleLocation.objects.update_or_create(
                        google_location_id=parsed_location['google_location_id'],
                        defaults={
                            'account': self.account,
                            'google_location_name': parsed_location['google_location_name'],
                            'address': parsed_location['address'],
                            'is_active': parsed_location['is_active'],
                            'synced_at': timezone.now()
                        }
                    )

                    synced_count += 1
                    action = "Created" if created else "Updated"
                    logger.info(f"{action} location: {location.google_location_name}")

                except Exception as e:
                    logger.error(f"Failed to sync location {location_data.get('name', 'unknown')}: {e}")
                    continue

            logger.info(f"Synced {synced_count} locations for {self.account.name}")

            return {
                'locations_synced': synced_count
            }

        except Exception as e:
            logger.error(f"Failed to sync locations for {self.account.name}: {e}")
            raise

    def sync_reviews(self, days_back: int = 90):
        """
        Sync reviews for all locations.

        Args:
            days_back: How many days of reviews to fetch (default: 90)

        Returns:
            dict with reviews_synced count
        """
        logger.info(f"Syncing reviews for account {self.account.name}")

        locations = GoogleLocation.objects.filter(
            account=self.account,
            is_active=True
        )

        total_reviews = 0

        for location in locations:
            try:
                # Get reviews from Google
                google_reviews = self.client.list_reviews(
                    location_name=f"accounts/{self.config.google_account_id}/locations/{location.google_location_id}"
                )

                for review_data in google_reviews:
                    try:
                        parsed_review = parse_google_review(review_data)

                        # Only sync recent reviews (within days_back)
                        if (timezone.now() - parsed_review['review_created_at']).days > days_back:
                            continue

                        # Check if a scraped version exists (deduplication)
                        # Try to find by exact google_review_id or by content match
                        existing_scraped = GoogleReview.objects.filter(
                            account=self.account,
                            location=location,
                            source='scraped',
                            reviewer_name=parsed_review['reviewer_name'],
                            rating=parsed_review['rating'],
                            review_text__icontains=parsed_review['review_text'][:50]  # Match first 50 chars
                        ).first()

                        # Create or update review
                        review, created = GoogleReview.objects.update_or_create(
                            google_review_id=parsed_review['google_review_id'],
                            defaults={
                                'location': location,
                                'account': self.account,
                                'reviewer_name': parsed_review['reviewer_name'],
                                'rating': parsed_review['rating'],
                                'review_text': parsed_review['review_text'],
                                'review_reply': parsed_review['review_reply'],
                                'review_created_at': parsed_review['review_created_at'],
                                # Mark as OAuth source (verified) - upgrades scraped reviews
                                'source': 'oauth',
                                'is_verified': True,
                                # Mark as needing analysis if newly created or text changed
                                'needs_analysis': created or (
                                    not created and
                                    review.review_text != parsed_review['review_text']
                                )
                            }
                        )

                        # If we upgraded a scraped review, log it
                        if not created and existing_scraped:
                            logger.info(f"Upgraded scraped review to verified: {review.google_review_id}")

                        total_reviews += 1
                        if created:
                            logger.info(f"New review for {location.google_location_name}: {review.rating}★")

                    except Exception as e:
                        logger.error(f"Failed to sync review: {e}")
                        continue

                # Update location stats
                location_reviews = GoogleReview.objects.filter(location=location)
                if location_reviews.exists():
                    avg_rating = sum(r.rating for r in location_reviews) / location_reviews.count()
                    location.average_rating = round(avg_rating, 2)
                    location.total_review_count = location_reviews.count()
                    location.save(update_fields=['average_rating', 'total_review_count'])

            except Exception as e:
                logger.error(f"Failed to sync reviews for location {location.google_location_name}: {e}")
                continue

        logger.info(f"Synced {total_reviews} reviews for {self.account.name}")

        return {
            'reviews_synced': total_reviews
        }
