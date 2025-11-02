import hashlib
from datetime import datetime


def generate_anonymous_hash(device_fingerprint: str, ip_address: str, date: datetime = None) -> str:
    """
    Generate a non-reversible anonymous hash for employee voice responses.

    This hash is used for:
    1. Deduplication: Prevent multiple submissions from same device within 24h
    2. Unique respondent counting: Track unique respondents for unlocking (5 required)
    3. Privacy protection: Cannot reverse-engineer to identify individuals

    The hash combines:
    - Device fingerprint (user agent + screen resolution + timezone + plugins)
    - IP address (for additional uniqueness)
    - Date (YYYY-MM-DD format, so hash changes daily)

    Args:
        device_fingerprint: Browser fingerprint string (from frontend)
        ip_address: IP address of the request
        date: Optional date to use (defaults to today). Used for testing.

    Returns:
        64-character hexadecimal SHA-256 hash string

    Example:
        >>> generate_anonymous_hash("Mozilla/5.0...", "192.168.1.1")
        "a7f8d9c2b4e1f6a3d8c5b9e2f1a4d7c0b3e6f9a2d5c8b1e4f7a0d3c6b9e2f5a8"
    """
    if date is None:
        date = datetime.now()

    # Format date as YYYY-MM-DD to ensure hash changes daily
    date_str = date.strftime('%Y-%m-%d')

    # Combine all components
    hash_input = f"{device_fingerprint}|{ip_address}|{date_str}"

    # Generate SHA-256 hash
    hash_bytes = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()

    return hash_bytes


def get_device_fingerprint_from_request(request) -> str:
    """
    Extract device fingerprint components from Django request.

    This creates a fingerprint from:
    - User agent string
    - Accept-Language header
    - Accept-Encoding header

    Note: For more robust fingerprinting, the frontend should send:
    - Screen resolution
    - Timezone
    - Browser plugins
    - Canvas fingerprint

    Args:
        request: Django HttpRequest object

    Returns:
        Device fingerprint string
    """
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
    accept_encoding = request.META.get('HTTP_ACCEPT_ENCODING', '')

    fingerprint = f"{user_agent}|{accept_language}|{accept_encoding}"

    return fingerprint


def get_client_ip(request) -> str:
    """
    Extract client IP address from request, handling proxies.

    Checks X-Forwarded-For header first (for proxied requests),
    then falls back to REMOTE_ADDR.

    Args:
        request: Django HttpRequest object

    Returns:
        IP address string
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')

    return ip


def generate_anonymous_hash_from_request(request, device_fingerprint: str = None) -> str:
    """
    Convenience function to generate anonymous hash directly from Django request.

    Args:
        request: Django HttpRequest object
        device_fingerprint: Optional device fingerprint from frontend.
                          If not provided, will be extracted from request headers.

    Returns:
        64-character hexadecimal SHA-256 hash string

    Example usage in view:
        from employee_voice.utils import generate_anonymous_hash_from_request

        def submit_survey(request):
            # Get device fingerprint from request body (sent by frontend)
            device_fingerprint = request.data.get('device_fingerprint')
            anonymous_hash = generate_anonymous_hash_from_request(request, device_fingerprint)
    """
    if device_fingerprint is None:
        device_fingerprint = get_device_fingerprint_from_request(request)

    ip_address = get_client_ip(request)

    return generate_anonymous_hash(device_fingerprint, ip_address)
