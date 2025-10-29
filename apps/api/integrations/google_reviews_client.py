"""
Google Business Profile API client for syncing reviews

This client handles:
- OAuth2 authentication
- Fetching locations (business profiles)
- Fetching reviews for each location
- Token refresh and error handling
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from cryptography.fernet import Fernet
import base64

logger = logging.getLogger(__name__)


class GoogleReviewsClient:
    """Client for interacting with Google Business Profile API"""

    BASE_URL = "https://mybusinessbusinessinformation.googleapis.com/v1"
    REVIEW_URL = "https://mybusiness.googleapis.com/v4"

    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        """Initialize client with OAuth tokens

        Args:
            access_token: Google OAuth access token
            refresh_token: Google OAuth refresh token for token renewal
        """
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.session = self._create_session()

    @staticmethod
    def get_oauth_authorization_url() -> str:
        """Generate Google OAuth authorization URL

        Returns:
            OAuth authorization URL for user to visit
        """
        client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None)
        redirect_uri = getattr(settings, 'GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:3000/integrations/google-reviews')

        if not client_id:
            raise ValueError('GOOGLE_OAUTH_CLIENT_ID not configured in settings')

        # Scopes needed for Google Business Profile
        scopes = [
            'https://www.googleapis.com/auth/business.manage',
        ]
        scope_string = ' '.join(scopes)

        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': scope_string,
            'access_type': 'offline',  # Get refresh token
            'prompt': 'consent',  # Force consent to get refresh token
        }

        param_string = '&'.join([f'{k}={requests.utils.quote(v)}' for k, v in params.items()])
        return f'https://accounts.google.com/o/oauth2/v2/auth?{param_string}'

    @staticmethod
    def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
        """Exchange OAuth authorization code for access and refresh tokens

        Args:
            code: Authorization code from OAuth callback

        Returns:
            Dict with access_token, refresh_token, expires_in
        """
        client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None)
        client_secret = getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', None)
        redirect_uri = getattr(settings, 'GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:3000/integrations/google-reviews')

        if not client_id or not client_secret:
            raise ValueError('GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured')

        url = 'https://oauth2.googleapis.com/token'
        data = {
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        }

        response = requests.post(url, data=data)
        response.raise_for_status()

        return response.json()

    @staticmethod
    def encrypt_token(token: str) -> str:
        """Encrypt a token for database storage

        Args:
            token: Plain text token

        Returns:
            Encrypted token as base64 string (Fernet already returns base64-encoded)
        """
        secret_key = settings.SECRET_KEY.encode()
        # Ensure key is 32 bytes for Fernet
        key = base64.urlsafe_b64encode(secret_key[:32].ljust(32, b'0'))
        f = Fernet(key)
        # Fernet.encrypt() already returns a URL-safe base64-encoded token
        encrypted = f.encrypt(token.encode())
        return encrypted.decode()

    @staticmethod
    def decrypt_token(encrypted_token: bytes) -> str:
        """Decrypt a token from database

        Args:
            encrypted_token: Encrypted token as bytes/memoryview (from BinaryField)

        Returns:
            Decrypted plain text token
        """
        secret_key = settings.SECRET_KEY.encode()
        # Ensure key is 32 bytes for Fernet
        key = base64.urlsafe_b64encode(secret_key[:32].ljust(32, b'0'))
        f = Fernet(key)

        # Convert memoryview to bytes if needed (Django BinaryField returns memoryview)
        if isinstance(encrypted_token, memoryview):
            encrypted_token = bytes(encrypted_token)

        # Convert bytes to string for Fernet (Fernet expects base64 string as bytes)
        if isinstance(encrypted_token, bytes):
            encrypted_token_str = encrypted_token.decode()
        else:
            encrypted_token_str = encrypted_token

        # Decrypt (Fernet expects string encoded as bytes)
        decrypted = f.decrypt(encrypted_token_str.encode())
        return decrypted.decode()

    def _create_session(self) -> requests.Session:
        """Create requests session with retry logic"""
        session = requests.Session()

        # Configure retries for transient errors
        retry_strategy = Retry(
            total=3,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS"],
            backoff_factor=1
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)

        return session

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with authorization"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

    def refresh_access_token(self, client_id: str, client_secret: str) -> Dict[str, Any]:
        """Refresh access token using refresh token

        Args:
            client_id: Google OAuth client ID
            client_secret: Google OAuth client secret

        Returns:
            Dict with new access_token and expires_in

        Raises:
            Exception if refresh fails
        """
        if not self.refresh_token:
            raise ValueError("No refresh token available")

        url = "https://oauth2.googleapis.com/token"
        data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'refresh_token': self.refresh_token,
            'grant_type': 'refresh_token'
        }

        response = requests.post(url, data=data)
        response.raise_for_status()

        token_data = response.json()
        self.access_token = token_data['access_token']

        return {
            'access_token': token_data['access_token'],
            'expires_in': token_data.get('expires_in', 3600)
        }

    def list_accounts(self) -> List[Dict[str, Any]]:
        """List all Google Business Profile accounts

        Returns:
            List of account dictionaries with 'name' and 'accountName'
        """
        url = f"{self.BASE_URL}/accounts"

        try:
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            data = response.json()

            return data.get('accounts', [])

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to list accounts: {e}")
            raise

    def list_locations(self, account_name: str) -> List[Dict[str, Any]]:
        """List all locations for a Google Business Profile account

        Args:
            account_name: Account name (e.g., 'accounts/12345')

        Returns:
            List of location dictionaries with name, title, address, etc.
        """
        url = f"{self.BASE_URL}/{account_name}/locations"
        params = {
            'readMask': 'name,title,storefrontAddress,locationState'
        }

        locations = []
        page_token = None

        try:
            while True:
                if page_token:
                    params['pageToken'] = page_token

                response = self.session.get(url, headers=self._get_headers(), params=params)
                response.raise_for_status()
                data = response.json()

                locations.extend(data.get('locations', []))

                page_token = data.get('nextPageToken')
                if not page_token:
                    break

            return locations

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to list locations for {account_name}: {e}")
            raise

    def list_reviews(self, location_name: str, page_size: int = 50) -> List[Dict[str, Any]]:
        """List all reviews for a specific location

        Args:
            location_name: Location name (e.g., 'accounts/12345/locations/67890')
            page_size: Number of reviews per page (max 50)

        Returns:
            List of review dictionaries with reviewId, reviewer, starRating, comment, etc.
        """
        # Note: Google Business Profile API v4 endpoint for reviews
        url = f"{self.REVIEW_URL}/{location_name}/reviews"
        params = {
            'pageSize': min(page_size, 50)
        }

        reviews = []
        page_token = None

        try:
            while True:
                if page_token:
                    params['pageToken'] = page_token

                response = self.session.get(url, headers=self._get_headers(), params=params)
                response.raise_for_status()
                data = response.json()

                reviews.extend(data.get('reviews', []))

                page_token = data.get('nextPageToken')
                if not page_token:
                    break

                # Safety limit to prevent infinite loops
                if len(reviews) > 1000:
                    logger.warning(f"Hit review limit of 1000 for {location_name}")
                    break

            return reviews

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to list reviews for {location_name}: {e}")
            raise

    def get_review(self, review_name: str) -> Dict[str, Any]:
        """Get a specific review by name

        Args:
            review_name: Full review resource name

        Returns:
            Review dictionary
        """
        url = f"{self.REVIEW_URL}/{review_name}"

        try:
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get review {review_name}: {e}")
            raise

    def reply_to_review(self, review_name: str, reply_text: str) -> Dict[str, Any]:
        """Reply to a review (future feature)

        Args:
            review_name: Full review resource name
            reply_text: Reply text to post

        Returns:
            Updated review dictionary
        """
        url = f"{self.REVIEW_URL}/{review_name}/reply"
        payload = {
            'comment': reply_text
        }

        try:
            response = self.session.put(
                url,
                headers=self._get_headers(),
                json=payload
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to reply to review {review_name}: {e}")
            raise


def parse_google_review(review_data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse Google review data into simplified format

    Args:
        review_data: Raw review data from Google API

    Returns:
        Dictionary with standardized fields
    """
    # Extract reviewer info
    reviewer = review_data.get('reviewer', {})
    reviewer_name = reviewer.get('displayName', 'Anonymous')

    # Extract rating (enum: ONE, TWO, THREE, FOUR, FIVE)
    star_rating = review_data.get('starRating', 'ONE')
    rating_map = {
        'ONE': 1,
        'TWO': 2,
        'THREE': 3,
        'FOUR': 4,
        'FIVE': 5
    }
    rating = rating_map.get(star_rating, 1)

    # Extract comment
    comment = review_data.get('comment', '')

    # Extract review reply if exists
    review_reply_data = review_data.get('reviewReply', {})
    review_reply = review_reply_data.get('comment', '')

    # Parse create time (RFC3339 format)
    create_time_str = review_data.get('createTime', '')
    try:
        create_time = datetime.fromisoformat(create_time_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        create_time = timezone.now()

    # Extract review ID from name (e.g., 'accounts/123/locations/456/reviews/789' -> '789')
    review_name = review_data.get('name', '')
    review_id = review_name.split('/')[-1] if '/' in review_name else review_name

    return {
        'google_review_id': review_id,
        'reviewer_name': reviewer_name,
        'rating': rating,
        'review_text': comment,
        'review_reply': review_reply,
        'review_created_at': create_time
    }


def parse_google_location(location_data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse Google location data into simplified format

    Args:
        location_data: Raw location data from Google API

    Returns:
        Dictionary with standardized fields
    """
    # Extract location ID from name
    location_name = location_data.get('name', '')
    location_id = location_name.split('/')[-1] if '/' in location_name else location_name

    # Extract title
    title = location_data.get('title', '')

    # Extract address
    address_data = location_data.get('storefrontAddress', {})
    address_lines = [
        address_data.get('addressLines', [''])[0] if address_data.get('addressLines') else '',
        address_data.get('locality', ''),
        address_data.get('administrativeArea', ''),
        address_data.get('postalCode', ''),
        address_data.get('regionCode', '')
    ]
    address = ', '.join([line for line in address_lines if line])

    # Check if location is open/active
    location_state = location_data.get('locationState', {})
    is_active = not location_state.get('isClosed', False)

    return {
        'google_location_id': location_id,
        'google_location_name': title,
        'address': address,
        'is_active': is_active
    }
