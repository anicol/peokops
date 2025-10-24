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

    def __init__(self, access_token: str):
        """
        Initialize 7shifts client with access token.

        Args:
            access_token: 7shifts API access token (will be encrypted when stored)
        """
        self.access_token = access_token
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

    def test_connection(self) -> bool:
        """
        Test if API credentials are valid.

        Returns:
            True if connection successful, False otherwise
        """
        try:
            self._request('GET', '/whoami')
            return True
        except Exception as e:
            logger.error(f"7shifts connection test failed: {str(e)}")
            return False

    def get_company_info(self) -> Dict[str, Any]:
        """Get company information"""
        return self._request('GET', '/company')

    def list_users(self, location_id: Optional[str] = None,
                   active_only: bool = True) -> List[Dict[str, Any]]:
        """
        List users (employees) from 7shifts.

        Args:
            location_id: Filter by specific location (optional)
            active_only: Only return active employees

        Returns:
            List of user dictionaries
        """
        params = {}
        if location_id:
            params['location_id'] = location_id
        if active_only:
            params['active'] = 1

        response = self._request('GET', '/users', params=params)
        return response.get('data', [])

    def get_user(self, user_id: str) -> Dict[str, Any]:
        """Get specific user by ID"""
        response = self._request('GET', f'/users/{user_id}')
        return response.get('data', {})

    def list_locations(self) -> List[Dict[str, Any]]:
        """
        List all locations (stores) from 7shifts.

        Returns:
            List of location dictionaries
        """
        response = self._request('GET', '/locations')
        return response.get('data', [])

    def list_shifts(self, start_date: datetime, end_date: datetime,
                    location_id: Optional[str] = None,
                    user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List shifts within a date range.

        Args:
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)
            location_id: Filter by location (optional)
            user_id: Filter by user (optional)

        Returns:
            List of shift dictionaries
        """
        params = {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d')
        }

        if location_id:
            params['location_id'] = location_id
        if user_id:
            params['user_id'] = user_id

        response = self._request('GET', '/shifts', params=params)
        return response.get('data', [])

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
