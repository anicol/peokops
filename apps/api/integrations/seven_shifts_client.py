"""
7shifts API Client

Handles authentication, data syncing, and queries for 7shifts integration.
Documentation: https://developers.7shifts.com/
"""

import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from cryptography.fernet import Fernet
import base64


logger = logging.getLogger(__name__)


class SevenShiftsClient:
    """Client for interacting with 7shifts API v2"""

    BASE_URL = "https://api.7shifts.com/v2"

    def __init__(self, access_token: str, company_id: Optional[str] = None):
        """
        Initialize 7shifts client with access token.

        Args:
            access_token: 7shifts API access token (will be encrypted when stored)
            company_id: 7shifts company ID (required for most API calls)
        """
        self.access_token = access_token
        self.company_id = company_id
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    @staticmethod
    def encrypt_token(token: str) -> bytes:
        """Encrypt access token for secure storage"""
        # Use Django SECRET_KEY as basis for encryption key
        key = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode().ljust(32)[:32])
        f = Fernet(key)
        return f.encrypt(token.encode())

    @staticmethod
    def decrypt_token(encrypted_token: bytes) -> str:
        """Decrypt access token from storage"""
        # Convert memoryview to bytes if needed (Django BinaryField returns memoryview)
        if isinstance(encrypted_token, memoryview):
            encrypted_token = bytes(encrypted_token)

        key = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode().ljust(32)[:32])
        f = Fernet(key)
        return f.decrypt(encrypted_token).decode()

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make authenticated request to 7shifts API.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path (e.g., '/users')
            **kwargs: Additional arguments passed to requests

        Returns:
            JSON response data

        Raises:
            requests.HTTPError: If request fails
        """
        url = f"{self.BASE_URL}{endpoint}"

        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.HTTPError as e:
            logger.error(f"7shifts API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"7shifts API request failed: {str(e)}")
            raise

    def test_connection(self) -> tuple[bool, Optional[str]]:
        """
        Test if API credentials are valid.

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        try:
            self._request('GET', '/whoami')
            return (True, None)
        except requests.HTTPError as e:
            error_msg = f"7shifts API error: {e.response.status_code}"
            try:
                error_data = e.response.json()
                if 'error_description' in error_data:
                    error_msg = error_data['error_description']
                elif 'error' in error_data:
                    error_msg = error_data['error']
            except:
                error_msg = e.response.text[:200] if e.response.text else error_msg
            logger.error(f"7shifts connection test failed: {error_msg}")
            return (False, error_msg)
        except Exception as e:
            error_msg = str(e)
            logger.error(f"7shifts connection test failed: {error_msg}")
            return (False, error_msg)

    def get_company_info(self) -> Dict[str, Any]:
        """Get company information"""
        return self._request('GET', '/company')

    def list_users(self, location_id: Optional[str] = None,
                   active_only: bool = True,
                   limit: int = 500) -> List[Dict[str, Any]]:
        """
        List ALL users (employees) from 7shifts with pagination support.

        Args:
            location_id: Filter by specific location (optional)
            active_only: Only return active employees
            limit: Number of results per page (1-500, default 500 for efficiency)

        Returns:
            List of ALL user dictionaries (handles pagination automatically)
        """
        params = {
            'limit': min(max(limit, 1), 500)  # Clamp between 1-500
        }
        if self.company_id:
            params['company_id'] = self.company_id
        if location_id:
            params['location_id'] = location_id
        if active_only:
            params['active'] = 1

        all_users = []
        cursor = None
        page = 1

        while True:
            if cursor:
                params['cursor'] = cursor

            response = self._request('GET', '/users', params=params)

            # Get users from current page (try both 'data' and 'results' for API version compatibility)
            users = response.get('data', response.get('results', []))
            all_users.extend(users)

            logger.info(f"7shifts list_users: Fetched page {page} with {len(users)} users (total so far: {len(all_users)})")

            # Check for next page cursor
            meta = response.get('meta', {})
            cursor = meta.get('next')

            if not cursor:  # No more pages
                break

            page += 1

        logger.info(f"7shifts list_users: Completed fetching {len(all_users)} total users across {page} page(s)")
        return all_users

    def get_user(self, user_id: str) -> Dict[str, Any]:
        """Get specific user by ID"""
        params = {}
        if self.company_id:
            params['company_id'] = self.company_id

        response = self._request('GET', f'/users/{user_id}', params=params)
        return response.get('data', {})

    def get_user_assignments(self, user_id: str) -> Dict[str, Any]:
        """
        Get user's location, department, and role assignments.

        Returns:
            Dict with 'locations', 'departments', and 'roles' arrays
        """
        if not self.company_id:
            raise ValueError("company_id is required to get user assignments")

        response = self._request('GET', f'/company/{self.company_id}/users/{user_id}/assignments')
        return response.get('data', {})

    def list_locations(self) -> List[Dict[str, Any]]:
        """
        List all locations (stores) from 7shifts.

        Returns:
            List of location dictionaries
        """
        if not self.company_id:
            raise ValueError("company_id is required to list locations")

        # Use company-scoped endpoint: /company/{company_id}/locations
        response = self._request('GET', f'/company/{self.company_id}/locations')
        return response.get('data', [])

    def list_roles(self) -> List[Dict[str, Any]]:
        """
        List all roles from 7shifts company.

        Returns:
            List of role dictionaries with 'id' and 'name' fields
        """
        if not self.company_id:
            raise ValueError("company_id is required to list roles")

        # Use company-scoped endpoint: /company/{company_id}/roles
        response = self._request('GET', f'/company/{self.company_id}/roles')
        return response.get('data', [])

    def list_shifts(self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None,
                    location_id: Optional[str] = None,
                    user_id: Optional[str] = None,
                    limit: int = 500) -> List[Dict[str, Any]]:
        """
        List ALL shifts within a date range with pagination support.

        Args:
            start_date: Start of date range (inclusive) - optional, fetches all if not provided
            end_date: End of date range (inclusive) - optional, fetches all if not provided
            location_id: Filter by location (optional)
            user_id: Filter by user (optional)
            limit: Number of results per page (1-500, default 500 for efficiency)

        Returns:
            List of ALL shift dictionaries (handles pagination automatically)
        """
        if not self.company_id:
            raise ValueError("company_id is required to list shifts")

        params = {
            'limit': min(max(limit, 1), 500)  # Clamp between 1-500
        }

        # Note: 7shifts API has issues with date filtering, so we fetch all shifts
        # and filter client-side. This appears to be an API limitation.
        # When start/end params are provided, the API returns empty results.

        if location_id:
            params['location_id'] = location_id
        if user_id:
            params['user_id'] = user_id

        all_shifts = []
        cursor = None
        page = 1

        # Fetch all pages
        while True:
            if cursor:
                params['cursor'] = cursor

            # Use company-scoped endpoint: /company/{company_id}/shifts
            response = self._request('GET', f'/company/{self.company_id}/shifts', params=params)
            shifts = response.get('data', [])
            all_shifts.extend(shifts)

            logger.info(f"7shifts list_shifts: Fetched page {page} with {len(shifts)} shifts (total so far: {len(all_shifts)})")

            # Check for next page cursor
            meta = response.get('meta', {})
            cursor = meta.get('next')

            if not cursor:  # No more pages
                break

            page += 1

        logger.info(f"7shifts list_shifts: Completed fetching {len(all_shifts)} total shifts across {page} page(s)")

        # Filter client-side if date range provided
        if start_date or end_date:
            filtered_shifts = []
            for shift in all_shifts:
                shift_start = datetime.fromisoformat(shift['start'].replace('Z', '+00:00'))

                if start_date and shift_start < start_date:
                    continue
                if end_date and shift_start > end_date:
                    continue

                filtered_shifts.append(shift)

            logger.info(f"7shifts list_shifts: Filtered to {len(filtered_shifts)} shifts within date range")
            return filtered_shifts

        return all_shifts

    def get_employee_shifts_for_date(self, user_id: str,
                                     date: datetime) -> List[Dict[str, Any]]:
        """
        Get all shifts for a specific employee on a specific date.

        Args:
            user_id: 7shifts user ID
            date: Date to check

        Returns:
            List of shift dictionaries for that day
        """
        start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)

        return self.list_shifts(
            start_date=start_date,
            end_date=end_date,
            user_id=user_id
        )

    def is_employee_on_shift(self, user_id: str, check_time: datetime) -> bool:
        """
        Check if an employee is currently on shift at a given time.

        Args:
            user_id: 7shifts user ID
            check_time: Time to check

        Returns:
            True if employee has a shift covering check_time, False otherwise
        """
        shifts = self.get_employee_shifts_for_date(user_id, check_time)

        for shift in shifts:
            start = datetime.fromisoformat(shift['start'].replace('Z', '+00:00'))
            end = datetime.fromisoformat(shift['end'].replace('Z', '+00:00'))

            if start <= check_time <= end:
                return True

        return False

    def get_employees_on_shift_at_location(self, location_id: str,
                                           check_time: datetime) -> List[Dict[str, Any]]:
        """
        Get all employees who are on shift at a specific location and time.

        Args:
            location_id: 7shifts location ID
            check_time: Time to check

        Returns:
            List of employee dictionaries who are currently on shift
        """
        # Get all shifts for this location on this date
        shifts = self.list_shifts(
            start_date=check_time,
            end_date=check_time,
            location_id=location_id
        )

        employees_on_shift = []

        for shift in shifts:
            start = datetime.fromisoformat(shift['start'].replace('Z', '+00:00'))
            end = datetime.fromisoformat(shift['end'].replace('Z', '+00:00'))

            # Check if shift covers the check_time
            if start <= check_time <= end:
                # Fetch user details
                user_id = shift.get('user', {}).get('id')
                if user_id:
                    try:
                        user = self.get_user(user_id)
                        employees_on_shift.append({
                            'user': user,
                            'shift': shift
                        })
                    except Exception as e:
                        logger.error(f"Failed to fetch user {user_id}: {str(e)}")
                        continue

        return employees_on_shift
