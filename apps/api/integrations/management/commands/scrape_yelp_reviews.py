"""
Scrape Yelp Reviews for a business using browser automation.

Usage:
    python manage.py scrape_yelp_reviews "Business Name" --location "City, State"
    python manage.py scrape_yelp_reviews "Potbelly Sandwich Shop" --location "Charleston, SC" --max-reviews 100
"""
import json
import time
import re
import random
import logging
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)


def human_delay(min_seconds=1.5, max_seconds=3.5):
    """Sleep for a random duration to mimic human behavior"""
    delay = random.uniform(min_seconds, max_seconds)
    time.sleep(delay)
    return delay


class Command(BaseCommand):
    help = 'Scrape Yelp Reviews for a business using browser automation'

    def add_arguments(self, parser):
        parser.add_argument('business_name', type=str, help='Name of the business')
        parser.add_argument('--location', type=str, default='', help='Location (e.g., "Charleston, SC")')
        parser.add_argument('--max-reviews', type=int, default=100, help='Maximum reviews to scrape')
        parser.add_argument('--output', type=str, help='Output JSON file path')
        parser.add_argument('--headless', action='store_true', default=True, help='Run browser in headless mode')
        parser.add_argument('--visible', action='store_true', help='Show browser (for debugging)')
        parser.add_argument('--account-id', type=int, help='Account ID to save reviews to')

    def handle(self, *args, **options):
        business_name = options['business_name']
        location = options['location']
        max_reviews = options['max_reviews']
        headless = options['headless'] and not options['visible']
        account_id = options.get('account_id')

        self.stdout.write(self.style.SUCCESS(f'\n=== Scraping Yelp Reviews for "{business_name}" ===\n'))

        # Scrape reviews
        reviews_data = self.scrape_reviews(business_name, location, max_reviews, headless)

        if not reviews_data:
            self.stdout.write(self.style.ERROR('No reviews found.'))
            return

        # Display summary
        self.display_summary(business_name, reviews_data)

        # Save to file if requested
        if options['output']:
            with open(options['output'], 'w') as f:
                json.dump(reviews_data, f, indent=2)
            self.stdout.write(self.style.SUCCESS(f'\n✓ Data saved to {options["output"]}'))

        # Save to database if account_id provided
        if account_id:
            self.save_to_database(reviews_data, account_id)

    def scrape_reviews(self, business_name, location, max_reviews, headless):
        """Scrape reviews using Playwright browser automation"""

        with sync_playwright() as p:
            # Launch browser
            self.stdout.write('Launching browser...')
            logger.info("Starting Playwright browser for Yelp scraping...")

            browser = p.chromium.launch(
                headless=headless,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                ]
            )

            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )

            page = context.new_page()

            try:
                # Build search URL
                search_query = f"{business_name} {location}".strip()
                yelp_url = f"https://www.yelp.com/search?find_desc={search_query.replace(' ', '+')}"

                self.stdout.write(f'Navigating to Yelp search: {yelp_url}')
                page.goto(yelp_url, wait_until='networkidle', timeout=30000)
                human_delay(2, 4)

                # Click on first business result
                self.stdout.write('Finding business...')
                try:
                    # Wait for search results
                    page.wait_for_selector('[data-testid="serp-ia-card"]', timeout=10000)

                    # Click first result
                    first_result = page.locator('[data-testid="serp-ia-card"]').first
                    first_result.click()
                    human_delay(2, 4)

                except PlaywrightTimeout:
                    self.stdout.write(self.style.ERROR('Business not found'))
                    return None

                # Extract business info
                self.stdout.write('Extracting business information...')
                business_info = self.extract_business_info(page)
                self.stdout.write(f'Found: {business_info["business_name"]}')
                self.stdout.write(f'Rating: {business_info.get("average_rating", "N/A")} ({business_info.get("total_review_count", 0)} reviews)')

                # Scrape reviews
                self.stdout.write(f'\nScraping up to {max_reviews} reviews...')
                reviews = self.scrape_review_list(page, max_reviews)

                return {
                    **business_info,
                    'reviews': reviews,
                    'scraped_at': datetime.now().isoformat(),
                    'review_count': len(reviews)
                }

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error during scraping: {str(e)}'))
                logger.exception("Error during Yelp scraping")
                return None

            finally:
                browser.close()

    def extract_business_info(self, page):
        """Extract business metadata from Yelp page"""
        try:
            # Business name
            business_name = page.locator('h1').first.inner_text()

            # Rating
            rating_text = page.locator('[role="img"]').first.get_attribute('aria-label')
            average_rating = None
            if rating_text:
                match = re.search(r'([\d.]+) star', rating_text)
                if match:
                    average_rating = float(match.group(1))

            # Review count
            review_count_text = page.locator('text=/\d+ reviews?/').first.inner_text()
            total_review_count = 0
            if review_count_text:
                match = re.search(r'(\d+)', review_count_text)
                if match:
                    total_review_count = int(match.group(1))

            # Address
            address_elem = page.locator('[data-testid="business-info-address"]')
            address = address_elem.inner_text() if address_elem.count() > 0 else ''

            # Phone
            phone_elem = page.locator('[data-testid="business-info-phone"]')
            phone = phone_elem.inner_text() if phone_elem.count() > 0 else ''

            # Business ID from URL
            current_url = page.url
            business_id = ''
            match = re.search(r'/biz/([^/?]+)', current_url)
            if match:
                business_id = match.group(1)

            return {
                'yelp_business_id': business_id,
                'business_name': business_name,
                'average_rating': average_rating,
                'total_review_count': total_review_count,
                'address': address,
                'phone': phone,
                'yelp_url': current_url.split('?')[0],  # Remove query params
            }

        except Exception as e:
            logger.error(f"Error extracting business info: {e}")
            return {
                'business_name': 'Unknown',
                'yelp_business_id': '',
            }

    def scrape_review_list(self, page, max_reviews):
        """Scrape review list from current page"""
        reviews = []
        page_num = 1

        while len(reviews) < max_reviews:
            self.stdout.write(f'Page {page_num}: ', ending='')

            # Extract reviews from current page
            page_reviews = self.extract_reviews_from_page(page)

            if not page_reviews:
                self.stdout.write('No more reviews found')
                break

            reviews.extend(page_reviews)
            self.stdout.write(f'Found {len(page_reviews)} reviews (total: {len(reviews)})')

            if len(reviews) >= max_reviews:
                break

            # Check for next page button
            try:
                next_button = page.locator('[aria-label="Next"]').first
                if next_button.count() == 0 or not next_button.is_visible():
                    self.stdout.write('No more pages')
                    break

                # Click next page
                next_button.click()
                human_delay(2, 4)
                page.wait_for_load_state('networkidle')
                page_num += 1

            except Exception as e:
                logger.error(f"Error navigating to next page: {e}")
                break

        return reviews[:max_reviews]

    def extract_reviews_from_page(self, page):
        """Extract all reviews from current page"""
        reviews = []

        try:
            # Wait for reviews to load
            page.wait_for_selector('[data-testid^="review"]', timeout=5000)

            # Get all review elements
            review_elements = page.locator('[data-testid^="review"]').all()

            for elem in review_elements:
                try:
                    review_data = self.extract_single_review(elem)
                    if review_data:
                        reviews.append(review_data)
                except Exception as e:
                    logger.warning(f"Error extracting review: {e}")
                    continue

        except PlaywrightTimeout:
            logger.warning("Timeout waiting for reviews")

        return reviews

    def extract_single_review(self, review_elem):
        """Extract data from a single review element"""
        try:
            # Review ID
            review_id = review_elem.get_attribute('data-testid')
            if review_id:
                review_id = review_id.replace('review-', '')

            # Reviewer name
            reviewer_name = ''
            name_elem = review_elem.locator('[data-testid="user-name"]')
            if name_elem.count() > 0:
                reviewer_name = name_elem.first.inner_text()

            # Reviewer location
            reviewer_location = ''
            location_elem = review_elem.locator('[data-testid="user-location"]')
            if location_elem.count() > 0:
                reviewer_location = location_elem.first.inner_text()

            # Rating
            rating_elem = review_elem.locator('[role="img"]').first
            rating_text = rating_elem.get_attribute('aria-label') if rating_elem.count() > 0 else ''
            rating = 0
            if rating_text:
                match = re.search(r'(\d+) star', rating_text)
                if match:
                    rating = int(match.group(1))

            # Review text
            review_text = ''
            text_elem = review_elem.locator('[data-testid="review-text"]')
            if text_elem.count() > 0:
                review_text = text_elem.first.inner_text()

            # Date
            date_elem = review_elem.locator('[data-testid="review-date"]')
            date_text = date_elem.first.inner_text() if date_elem.count() > 0 else ''
            review_created_at = self.parse_yelp_date(date_text)

            # Elite status
            is_elite = review_elem.locator('text=/Elite/i').count() > 0

            # Check-in count (if available)
            check_in_count = 0
            checkin_elem = review_elem.locator('text=/\d+ check-in/i')
            if checkin_elem.count() > 0:
                match = re.search(r'(\d+)', checkin_elem.first.inner_text())
                if match:
                    check_in_count = int(match.group(1))

            return {
                'yelp_review_id': review_id or f'review-{hash(review_text)}',
                'reviewer_name': reviewer_name,
                'reviewer_location': reviewer_location,
                'rating': rating,
                'review_text': review_text,
                'review_created_at': review_created_at,
                'is_elite': is_elite,
                'check_in_count': check_in_count,
            }

        except Exception as e:
            logger.error(f"Error parsing review: {e}")
            return None

    def parse_yelp_date(self, date_text):
        """Parse Yelp date format to ISO timestamp"""
        try:
            # Yelp formats: "12/25/2023", "a day ago", "3 weeks ago", etc.
            if '/' in date_text:
                # Parse MM/DD/YYYY format
                dt = datetime.strptime(date_text, '%m/%d/%Y')
                return dt.isoformat()

            # Handle relative dates
            now = datetime.now()
            if 'day' in date_text.lower():
                match = re.search(r'(\d+)', date_text)
                days = int(match.group(1)) if match else 1
                dt = now - timedelta(days=days)
            elif 'week' in date_text.lower():
                match = re.search(r'(\d+)', date_text)
                weeks = int(match.group(1)) if match else 1
                dt = now - timedelta(weeks=weeks)
            elif 'month' in date_text.lower():
                match = re.search(r'(\d+)', date_text)
                months = int(match.group(1)) if match else 1
                dt = now - timedelta(days=months * 30)
            elif 'year' in date_text.lower():
                match = re.search(r'(\d+)', date_text)
                years = int(match.group(1)) if match else 1
                dt = now - timedelta(days=years * 365)
            else:
                dt = now

            return dt.isoformat()

        except Exception as e:
            logger.error(f"Error parsing date '{date_text}': {e}")
            return datetime.now().isoformat()

    def display_summary(self, business_name, data):
        """Display scraping summary"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('Scraping Complete!'))
        self.stdout.write('='*60)
        self.stdout.write(f'Business: {data.get("business_name", business_name)}')
        self.stdout.write(f'Reviews Scraped: {len(data.get("reviews", []))}')
        self.stdout.write(f'Yelp Rating: {data.get("average_rating", "N/A")}')
        self.stdout.write(f'Total Reviews on Yelp: {data.get("total_review_count", 0)}')
        self.stdout.write('='*60 + '\n')

    def save_to_database(self, data, account_id):
        """Save scraped reviews to database"""
        from accounts.models import Account
        from integrations.models import YelpLocation, YelpReview

        self.stdout.write('\nSaving to database...')

        try:
            account = Account.objects.get(id=account_id)

            # Create or update location
            location, created = YelpLocation.objects.update_or_create(
                yelp_business_id=data['yelp_business_id'],
                defaults={
                    'account': account,
                    'business_name': data['business_name'],
                    'address': data.get('address', ''),
                    'phone': data.get('phone', ''),
                    'yelp_url': data.get('yelp_url', ''),
                    'average_rating': data.get('average_rating'),
                    'total_review_count': data.get('total_review_count', 0),
                    'synced_at': timezone.now(),
                }
            )

            self.stdout.write(f'{"Created" if created else "Updated"} location: {location.business_name}')

            # Save reviews
            reviews_created = 0
            reviews_updated = 0

            for review_data in data.get('reviews', []):
                review, created = YelpReview.objects.update_or_create(
                    yelp_review_id=review_data['yelp_review_id'],
                    defaults={
                        'location': location,
                        'account': account,
                        'reviewer_name': review_data.get('reviewer_name', ''),
                        'reviewer_location': review_data.get('reviewer_location', ''),
                        'rating': review_data['rating'],
                        'review_text': review_data.get('review_text', ''),
                        'is_elite': review_data.get('is_elite', False),
                        'check_in_count': review_data.get('check_in_count', 0),
                        'review_created_at': review_data['review_created_at'],
                        'source': 'scraped',
                        'is_verified': False,
                        'needs_analysis': True,
                    }
                )

                if created:
                    reviews_created += 1
                else:
                    reviews_updated += 1

            self.stdout.write(self.style.SUCCESS(f'✓ Saved {reviews_created} new reviews, updated {reviews_updated}'))

        except Account.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Account with ID {account_id} not found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error saving to database: {str(e)}'))
            logger.exception("Error saving Yelp reviews to database")
