"""
Yelp Fusion API client for syncing reviews

This client handles:
- API key authentication
- Business search by name and location
- Fetching reviews for each business (up to 3 per business)
- Error handling and rate limiting
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from django.conf import settings
from django.utils import timezone
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from cryptography.fernet import Fernet
import base64

logger = logging.getLogger(__name__)


class YelpFusionClient:
    """Client for interacting with Yelp Fusion API

    Uses a system-wide Yelp API key configured in Django settings.
    The API key allows querying public business and review data for any business on Yelp.
    """

    BASE_URL = "https://api.yelp.com/v3"

    def __init__(self, api_key: str = None):
        """Initialize client with Yelp API key

        Args:
            api_key: Yelp Fusion API key (optional, defaults to settings.YELP_API_KEY)
        """
        self.api_key = api_key or getattr(settings, 'YELP_API_KEY', None)
        if not self.api_key:
            raise ValueError('YELP_API_KEY not configured in Django settings')
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """Create requests session with retry logic"""
        session = requests.Session()

        # Configure retries for transient errors
        # Yelp API has rate limits, so be conservative
        retry_strategy = Retry(
            total=2,
            status_forcelist=[500, 502, 503, 504],  # Don't retry 429 rate limits
            allowed_methods=["HEAD", "GET", "OPTIONS"],
            backoff_factor=2
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)

        return session

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with authorization"""
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Accept': 'application/json'
        }

    def search_business(self, name: str, location: str) -> Optional[Dict[str, Any]]:
        """Search for a business by name and location

        Args:
            name: Business name (e.g., "Marco's Pizza")
            location: Location string (e.g., "Mt Pleasant, SC")

        Returns:
            Business data dict with id, name, location, rating, review_count
            Returns None if no exact match found
        """
        url = f"{self.BASE_URL}/businesses/search"
        params = {
            'term': name,
            'location': location,
            'limit': 10  # Get top 10 results to find best match
        }

        try:
            response = self.session.get(url, headers=self._get_headers(), params=params)
            response.raise_for_status()
            data = response.json()

            businesses = data.get('businesses', [])
            if not businesses:
                logger.warning(f"No Yelp businesses found for '{name}' in '{location}'")
                return None

            # Return the first business (usually the best match)
            # Yelp's search already sorts by relevance
            best_match = businesses[0]

            logger.info(f"Found Yelp business: {best_match.get('name')} (ID: {best_match.get('id')})")
            return best_match

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                logger.error("Yelp API authentication failed - check API key")
            elif e.response.status_code == 429:
                logger.error("Yelp API rate limit exceeded")
            else:
                logger.error(f"Yelp API error searching business: {e}")
            return None
        except Exception as e:
            logger.error(f"Error searching Yelp business: {e}")
            return None

    def get_business_reviews(self, business_id: str) -> List[Dict[str, Any]]:
        """Get reviews for a business

        Note: Yelp Fusion API returns up to 3 reviews per business (max 160 chars each).
        For more comprehensive review data, use the scraper as a fallback.

        Args:
            business_id: Yelp business ID (e.g., "marco-s-pizza-mount-pleasant-2")

        Returns:
            List of review dicts, each containing:
            - id: Yelp review ID
            - rating: 1-5 star rating
            - text: Review text (truncated to ~160 chars by Yelp)
            - time_created: ISO timestamp
            - user: {id, name, image_url}
        """
        url = f"{self.BASE_URL}/businesses/{business_id}/reviews"
        params = {
            'locale': 'en_US',
            'sort_by': 'yelp_sort'  # Yelp's default ranking
        }

        try:
            response = self.session.get(url, headers=self._get_headers(), params=params)
            response.raise_for_status()
            data = response.json()

            reviews = data.get('reviews', [])
            logger.info(f"Retrieved {len(reviews)} reviews from Yelp for business {business_id}")

            return reviews

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                logger.error("Yelp API authentication failed - check API key")
            elif e.response.status_code == 404:
                logger.error(f"Yelp business not found: {business_id}")
            elif e.response.status_code == 429:
                logger.error("Yelp API rate limit exceeded")
            else:
                logger.error(f"Yelp API error fetching reviews: {e}")
            return []
        except Exception as e:
            logger.error(f"Error fetching Yelp reviews: {e}")
            return []

    def get_business_details(self, business_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a business

        Args:
            business_id: Yelp business ID

        Returns:
            Business details dict with:
            - id, name, image_url, url
            - location: {address1, city, state, zip_code, country}
            - phone, display_phone
            - rating, review_count
            - categories: [{alias, title}]
            - hours: [{open: [{day, start, end}], is_open_now}]
        """
        url = f"{self.BASE_URL}/businesses/{business_id}"

        try:
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            data = response.json()

            logger.info(f"Retrieved Yelp business details for {business_id}")
            return data

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                logger.error("Yelp API authentication failed - check API key")
            elif e.response.status_code == 404:
                logger.error(f"Yelp business not found: {business_id}")
            elif e.response.status_code == 429:
                logger.error("Yelp API rate limit exceeded")
            else:
                logger.error(f"Yelp API error fetching business details: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching Yelp business details: {e}")
            return None

    def sync_business_and_reviews(
        self,
        business_name: str,
        location: str
    ) -> Optional[Dict[str, Any]]:
        """Search for business and get reviews in one operation

        Args:
            business_name: Business name to search for
            location: Location string (city, state)

        Returns:
            Dict with:
            - business: Business details
            - reviews: List of reviews
            Returns None if business not found
        """
        # Search for business
        business = self.search_business(business_name, location)
        if not business:
            return None

        business_id = business.get('id')
        if not business_id:
            logger.error("Business found but missing ID")
            return None

        # Get full business details
        business_details = self.get_business_details(business_id)
        if not business_details:
            logger.warning(f"Could not fetch details for business {business_id}")
            business_details = business  # Fallback to search result

        # Get reviews
        reviews = self.get_business_reviews(business_id)

        return {
            'business': business_details,
            'reviews': reviews
        }
