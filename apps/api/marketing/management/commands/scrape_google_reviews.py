"""
Scrape ALL Google Reviews for a business using browser automation.

Usage:
    python manage.py scrape_google_reviews "BalanceGrille" --location "Toledo, OH"
    python manage.py scrape_google_reviews "Restaurant Name" --max-reviews 500
"""
import json
import time
import re
import random
import logging
from datetime import datetime
from django.core.management.base import BaseCommand
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)


def human_delay(min_seconds=1.5, max_seconds=3.5):
    """Sleep for a random duration to mimic human behavior"""
    delay = random.uniform(min_seconds, max_seconds)
    time.sleep(delay)
    return delay


class Command(BaseCommand):
    help = 'Scrape all Google Reviews for a business using browser automation'

    def add_arguments(self, parser):
        parser.add_argument('business_name', type=str, help='Name of the business')
        parser.add_argument('--location', type=str, default='', help='Location (e.g., "Toledo, OH")')
        parser.add_argument('--max-reviews', type=int, default=1000, help='Maximum reviews to scrape')
        parser.add_argument('--output', type=str, help='Output JSON file path')
        parser.add_argument('--headless', action='store_true', default=True, help='Run browser in headless mode')
        parser.add_argument('--visible', action='store_true', help='Show browser (for debugging)')

    def handle(self, *args, **options):
        business_name = options['business_name']
        location = options['location']
        max_reviews = options['max_reviews']
        headless = options['headless'] and not options['visible']

        self.stdout.write(self.style.SUCCESS(f'\n=== Scraping Google Reviews for "{business_name}" ===\n'))

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

            # Also run the analysis
            self.stdout.write('\nRunning analysis on scraped reviews...')
            from marketing.management.commands.research_google_reviews import Command as AnalysisCommand
            analyzer = AnalysisCommand()

            reviews_formatted = reviews_data.get('reviews', [])
            insights = analyzer.analyze_reviews(reviews_formatted)
            micro_check_suggestions = analyzer.generate_microcheck_suggestions(insights)

            analyzer.display_results(business_name, reviews_formatted, insights, micro_check_suggestions)

            # Save full analysis
            analysis_output = options['output'].replace('.json', '_analysis.json')
            full_data = {
                **reviews_data,
                'insights': insights,
                'micro_check_suggestions': micro_check_suggestions
            }
            with open(analysis_output, 'w') as f:
                json.dump(full_data, f, indent=2)
            self.stdout.write(self.style.SUCCESS(f'✓ Full analysis saved to {analysis_output}'))

    def scrape_reviews(self, business_name, location, max_reviews, headless, progress_callback=None, place_id=None):
        """Scrape reviews using Playwright browser automation

        Args:
            business_name: Name of the business to search for
            location: Location to search in
            place_id: Google Places ID for direct navigation (optional)
            max_reviews: Maximum number of reviews to scrape
            headless: Whether to run in headless mode
            progress_callback: Optional callback function(message, percentage) for progress updates
        """

        with sync_playwright() as p:
            # Launch browser
            self.stdout.write('Launching browser...')
            logger.info("Starting Playwright browser with anti-detection measures...")

            # Anti-detection: Hide automation flags
            browser = p.chromium.launch(
                headless=headless,
                args=[
                    '--disable-blink-features=AutomationControlled',  # Hide webdriver flag
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                ]
            )

            # Randomize viewport to appear more human
            viewport_width = random.randint(1200, 1920)
            viewport_height = random.randint(800, 1080)

            # Use realistic user agents
            user_agents = [
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            ]

            context = browser.new_context(
                viewport={'width': viewport_width, 'height': viewport_height},
                user_agent=random.choice(user_agents),
                locale='en-US',
                timezone_id='America/New_York',
            )

            page = context.new_page()

            # Remove webdriver property that Google checks
            page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)

            logger.info(f"Browser launched (viewport: {viewport_width}x{viewport_height})")

            try:
                # Use place_id for direct navigation if available, otherwise search
                if place_id:
                    search_url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
                    self.stdout.write(f'Navigating directly to place_id: {place_id}')
                    logger.info(f"Using place_id for direct navigation: '{place_id}'")
                else:
                    # Search for the business on Google Maps
                    # Put location first if provided to help Google prioritize the right city
                    if location:
                        search_query = f"{business_name} {location}"
                    else:
                        search_query = business_name

                    self.stdout.write(f'Searching for: {search_query}')
                    logger.info(f"Search query: '{search_query}'")

                    search_url = f"https://www.google.com/maps/search/{search_query.replace(' ', '+')}"

                logger.info(f"Navigating to: {search_url}")

                try:
                    page.goto(search_url, timeout=60000)  # 60 second timeout
                    logger.info(f"Page loaded, current URL: {page.url}")
                except Exception as e:
                    logger.error(f"Failed to navigate to search URL: {str(e)}")
                    browser.close()
                    return None

                human_delay(6, 10)  # Wait for page to fully load (random to appear human)

                # Check if Google is blocking us
                page_content = page.content()
                if 'unusual traffic' in page_content.lower() or 'captcha' in page_content.lower():
                    logger.error("Google detected unusual traffic or showing CAPTCHA")
                    self.stdout.write(self.style.ERROR('Google is blocking automated access. Try again later.'))
                    browser.close()
                    return None

                # Check if we found results
                try:
                    # Wait for search results to appear
                    self.stdout.write('Waiting for search results...')
                    logger.info(f"Waiting for search results to load...")

                    # Try multiple selectors with longer timeouts
                    selectors_to_try = [
                        ('div[role="main"]', 15000),
                        ('div.m6QErb', 15000),
                        ('#QA0Szd', 15000),
                        ('div[role="feed"]', 15000),
                        ('a[href*="/maps/place/"]', 15000),  # Direct place links
                    ]

                    result_found = False
                    for selector, timeout in selectors_to_try:
                        try:
                            page.wait_for_selector(selector, timeout=timeout, state='visible')
                            logger.info(f"Search results loaded using selector: {selector}")
                            result_found = True
                            break
                        except Exception as e:
                            logger.debug(f"Selector {selector} failed: {str(e)[:100]}")
                            continue

                    if not result_found:
                        logger.error("Could not find search results with any selector")
                        # Take screenshot for debugging
                        try:
                            screenshot_path = f"/tmp/maps_error_{int(time.time())}.png"
                            page.screenshot(path=screenshot_path)
                            logger.info(f"Screenshot saved to {screenshot_path}")
                        except:
                            pass
                        raise PlaywrightTimeout("No search results found")

                    human_delay(3, 5)

                    # Try multiple selectors to find clickable business listings
                    self.stdout.write('Looking for business listings...')
                    logger.info("Searching for clickable business listings...")
                    first_result = None

                    # Try different selectors for search results
                    selectors = [
                        'a[href*="/maps/place/"]',  # Direct place links
                        'div[role="article"] a',    # Article wrapper links
                        'a.hfpxzc',                 # Google Maps specific class
                        'div[role="feed"] > div > div > a',  # Feed items
                    ]

                    for selector in selectors:
                        first_result = page.query_selector(selector)
                        if first_result:
                            self.stdout.write(f'Found result with selector: {selector}')
                            logger.info(f"Found clickable business with selector: {selector}")
                            break
                        else:
                            logger.debug(f"Selector '{selector}' didn't match any elements")

                    if first_result:
                        self.stdout.write('Clicking on first search result...')
                        logger.info("Clicking on first search result...")
                        first_result.click()
                        human_delay(3, 5)  # Wait for business page to load
                        logger.info("Clicked successfully, waiting for page to load...")
                    else:
                        self.stdout.write(self.style.WARNING('No clickable result found - checking if already on business page...'))
                        logger.warning("No clickable business found with any selector")

                    # Get business info
                    logger.info("Extracting business information...")
                    business_info = self.extract_business_info(page)
                    logger.info(f"Extracted business info: {business_info}")

                    # Validate we found a real business (only fail if BOTH name and reviews are missing)
                    if business_info["name"] == "Unknown" and business_info["total_reviews"] == 0:
                        self.stdout.write(self.style.ERROR('❌ Could not find valid business information'))
                        self.stdout.write(f'Debug: name={business_info["name"]}, reviews={business_info["total_reviews"]}')
                        logger.error(f"Failed to extract valid business info: name={business_info['name']}, reviews={business_info['total_reviews']}, rating={business_info['rating']}")

                        # Log the page URL for debugging
                        current_url = page.url
                        logger.error(f"Current page URL: {current_url}")

                        # Take a screenshot for debugging (if not headless)
                        if not headless:
                            page.screenshot(path='debug_screenshot.png')
                            self.stdout.write('Screenshot saved to debug_screenshot.png')

                        browser.close()
                        return None

                    self.stdout.write(self.style.SUCCESS(f'✓ Found: {business_info["name"]}'))
                    self.stdout.write(f'  Rating: {business_info["rating"]} ({business_info["total_reviews"]} reviews)')
                    self.stdout.write(f'  Address: {business_info["address"]}')
                    logger.info(f"Successfully validated business: {business_info['name']} with {business_info['total_reviews']} reviews")

                    # Click on reviews tab
                    self.stdout.write('\nNavigating to reviews...')
                    logger.info("Looking for reviews button...")
                    reviews_button = page.query_selector('button[aria-label*="reviews" i], button:has-text("Reviews")')
                    if reviews_button:
                        logger.info("Found reviews button, clicking...")
                        reviews_button.click()
                        human_delay(1.5, 3)
                        logger.info("Clicked reviews button")
                    else:
                        logger.warning("Reviews button not found - may already be on reviews")

                    # Sort by newest - DISABLED: Causes worker to freeze in production
                    # Works fine locally but hangs indefinitely in production environment
                    # Default sort order (relevance/most helpful) is still useful
                    # TODO: Re-enable once we fix the production hanging issue
                    ENABLE_SORTING = False
                    if ENABLE_SORTING:
                        try:
                            logger.info("Looking for sort button...")
                            sort_button = page.query_selector('button[aria-label*="Sort" i]')
                            if sort_button:
                                logger.info("Found sort button, clicking...")
                                sort_button.click()
                                human_delay(0.8, 1.5)
                                newest_option = page.query_selector('div[role="menuitemradio"]:has-text("Newest")')
                                if newest_option:
                                    logger.info("Selecting 'Newest' sort option...")
                                    try:
                                        newest_option.click()
                                        logger.info("Clicked 'Newest' option, waiting for sort to apply...")
                                        human_delay(2, 4)
                                        logger.info("Sort applied, continuing...")
                                    except Exception as click_error:
                                        logger.warning(f"Error clicking Newest option: {click_error}")
                                else:
                                    logger.warning("Could not find 'Newest' sort option")
                        except Exception as e:
                            logger.warning(f"Error with sort button: {e}")
                            pass
                    else:
                        logger.info("Sorting disabled (using default order) - prevents production freeze")

                    # Scrape reviews
                    self.stdout.write(f'Scrolling to load reviews (max {max_reviews})...')
                    logger.info(f"Starting to scroll and extract reviews (max {max_reviews})...")
                    logger.info(f"About to call scroll_and_extract_reviews with page={type(page)}, max_reviews={max_reviews}")
                    reviews = self.scroll_and_extract_reviews(page, max_reviews, progress_callback)
                    logger.info(f"scroll_and_extract_reviews returned: type={type(reviews)}, value={reviews if reviews is None else f'list with {len(reviews)} items'}")

                    # Fallback: If extracted name is invalid, use input business_name
                    if business_info['name'] in ['Unknown', 'Results', 'Search', 'Maps', '']:
                        logger.warning(f"Extracted invalid business name '{business_info['name']}', using input: {business_name}")
                        business_info['name'] = business_name

                    browser.close()

                    return {
                        'business_name': business_name,
                        'location': location,
                        'scraped_at': datetime.now().isoformat(),
                        'business_info': business_info,
                        'total_reviews_scraped': len(reviews),
                        'reviews': reviews
                    }

                except PlaywrightTimeout as e:
                    self.stdout.write(self.style.WARNING('Timeout waiting for results'))
                    logger.error(f"Playwright timeout waiting for search results: {str(e)}", exc_info=True)

                    # Try to capture current page state for debugging
                    try:
                        current_url = page.url
                        logger.error(f"Current page URL when timeout occurred: {current_url}")
                    except:
                        pass

                    browser.close()
                    return None

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
                logger.error(f"Unexpected error during scraping: {str(e)}", exc_info=True)
                browser.close()
                return None

    def extract_business_info(self, page):
        """Extract business information from the page"""
        try:
            # Extract business name - try multiple selectors
            name_text = 'Unknown'
            name_selectors = [
                'h1[class*="fontHeadlineLarge"]',  # Google Maps typical class
                'button[data-item-id*="authority"] h1',  # Business name in button
                'div[role="main"] h1',
                'h1',
                '[aria-label*="Information for"]',  # Fallback
            ]

            # Invalid names to skip
            invalid_names = ['Results', 'Unknown', '', 'Search', 'Maps']

            for selector in name_selectors:
                name_elem = page.query_selector(selector)
                if name_elem:
                    text = name_elem.inner_text().strip()
                    if text and text not in invalid_names:
                        name_text = text
                        logger.info(f"Found business name with selector '{selector}': {name_text}")
                        break
                    elif text in invalid_names:
                        logger.debug(f"Skipping invalid name '{text}' from selector '{selector}'")

            # Extract rating and review count
            rating = 0
            total_reviews = 0

            # Strategy 1: Try to find rating in various aria-labels
            rating_selectors = [
                '[aria-label*="stars" i]',
                'div[aria-label*="star" i]',
                'span[role="img"][aria-label*="star" i]',
                'span[aria-label*="star" i]',
            ]

            rating_elem = None
            for selector in rating_selectors:
                rating_elem = page.query_selector(selector)
                if rating_elem:
                    aria_label = rating_elem.get_attribute('aria-label')
                    if aria_label:
                        rating_match = re.search(r'([\d.]+)\s*stars?', aria_label, re.IGNORECASE)
                        reviews_match = re.search(r'(\d+(?:,\d+)*)\s*reviews?', aria_label, re.IGNORECASE)

                        if rating_match:
                            rating = float(rating_match.group(1))
                        if reviews_match:
                            total_reviews = int(reviews_match.group(1).replace(',', ''))

                        if rating > 0 or total_reviews > 0:
                            break

            # Strategy 2: Look for rating as text (e.g., "4.3" followed by stars)
            if rating == 0:
                # Try to find rating display text
                rating_text_elems = page.query_selector_all('span, div')
                for elem in rating_text_elems:
                    try:
                        text = elem.inner_text().strip()
                        # Match patterns like "4.3", "3.5", etc.
                        if re.match(r'^\d\.\d$', text):
                            rating = float(text)
                            break
                    except:
                        continue

            # Strategy 3: Find review count from button text or nearby elements
            if total_reviews == 0:
                # Try multiple patterns for review count
                review_patterns = [
                    'button:has-text("reviews")',
                    'button:has-text("review")',
                    'span:has-text("reviews")',
                    'div:has-text("reviews")',
                ]

                for pattern in review_patterns:
                    review_elem = page.query_selector(pattern)
                    if review_elem:
                        text = review_elem.inner_text()
                        reviews_match = re.search(r'(\d+(?:,\d+)*)\s*reviews?', text, re.IGNORECASE)
                        if reviews_match:
                            total_reviews = int(reviews_match.group(1).replace(',', ''))
                            break

            # Extract address
            address = ''
            address_selectors = [
                'button[data-item-id="address"]',
                'button[data-tooltip*="address" i]',
                'div[data-item-id="address"]'
            ]

            for selector in address_selectors:
                address_elem = page.query_selector(selector)
                if address_elem:
                    address = address_elem.inner_text().strip()
                    break

            return {
                'name': name_text,
                'rating': rating,
                'total_reviews': total_reviews,
                'address': address
            }
        except Exception as e:
            print(f"Error extracting business info: {e}")
            return {
                'name': 'Unknown',
                'rating': 0,
                'total_reviews': 0,
                'address': ''
            }

    def scroll_and_extract_reviews(self, page, max_reviews, progress_callback=None):
        """Scroll through reviews and extract data"""
        logger.info("=== SCROLL_AND_EXTRACT_REVIEWS FUNCTION ENTRY v2 ===")
        logger.info(f"Parameters: page={type(page)}, max_reviews={max_reviews}")

        # Initialize outside try block so we can return partial results on crash
        reviews = []
        seen_review_texts = set()

        try:
            last_review_count = 0
            no_new_reviews_count = 0

            # Find the scrollable reviews container
            logger.info("Looking for scrollable reviews container...")
            reviews_container = page.query_selector('[role="main"] div[role="feed"], div[aria-label*="Reviews" i]')
            if not reviews_container:
                logger.warning("Main reviews container not found, trying alternative selector...")
                # Try alternative selector
                reviews_container = page.query_selector('div[class*="review" i]')

            if reviews_container:
                logger.info("Found reviews container")
            else:
                logger.warning("No reviews container found - will try to scroll anyway")

            scroll_attempts = 0
            max_scroll_attempts = 100

            while len(reviews) < max_reviews and scroll_attempts < max_scroll_attempts:
                # Extract current reviews on page
                review_elements = page.query_selector_all('[data-review-id], div[data-review-id]')
                logger.info(f"Scroll attempt {scroll_attempts + 1}: Found {len(review_elements)} review elements with [data-review-id]")

                if not review_elements:
                    # Try alternative selector for review elements
                    review_elements = page.query_selector_all('div[jslog*="review"]')
                    logger.info(f"Trying alternative selector: Found {len(review_elements)} review elements with [jslog*='review']")

                for elem in review_elements:
                    if len(reviews) >= max_reviews:
                        break

                    try:
                        review_data = self.extract_review_data(elem, page)

                        # Skip reviews with no text (likely extraction failure)
                        if not review_data.get('text') or len(review_data['text'].strip()) < 5:
                            logger.debug(f"Skipping review with insufficient text: author={review_data.get('author')}, text_len={len(review_data.get('text', ''))}")
                            continue

                        # Avoid duplicates
                        review_text_signature = f"{review_data['author']}_{review_data['text'][:50]}"
                        if review_text_signature not in seen_review_texts:
                            reviews.append(review_data)
                            seen_review_texts.add(review_text_signature)
                        else:
                            logger.debug(f"Skipping duplicate review from {review_data['author']}")
                    except Exception as e:
                        logger.warning(f"Error extracting review data: {e}", exc_info=True)
                        continue

                logger.info(f"After extraction: Total reviews collected = {len(reviews)}")

                # Check if we got new reviews
                if len(reviews) == last_review_count:
                    no_new_reviews_count += 1
                    logger.info(f"No new reviews this iteration. Count: {no_new_reviews_count}/5")
                    if no_new_reviews_count >= 5:
                        logger.warning(f'No new reviews found after {no_new_reviews_count} scroll attempts - stopping')
                        self.stdout.write(f'\nNo new reviews found after {no_new_reviews_count} scroll attempts')
                        break
                else:
                    no_new_reviews_count = 0
                    logger.info(f"Found {len(reviews) - last_review_count} new reviews this iteration")
                    self.stdout.write(f'\rScraped {len(reviews)} reviews...', ending='')

                    # Call progress callback if provided
                    if progress_callback:
                        # Calculate progress: 30% + (45% of completion based on reviews scraped)
                        progress_pct = min(30 + int((len(reviews) / max_reviews) * 15), 45)
                        progress_callback(
                            f'📥 Loading reviews from Google... Found {len(reviews)} reviews so far...',
                            progress_pct
                        )

                last_review_count = len(reviews)

                # Scroll down - find the scrollable element fresh each time to avoid stale handles
                try:
                    # Re-query the scrollable container to avoid stale element references
                    fresh_container = page.query_selector('[role="main"] div[role="feed"], div[aria-label*="Reviews" i]')
                    if fresh_container:
                        page.evaluate('(element) => element.scrollBy(0, 1000)', fresh_container)
                    else:
                        page.evaluate('window.scrollBy(0, 1000)')
                except Exception as e:
                    # If scrolling fails, try window scroll as fallback
                    page.evaluate('window.scrollBy(0, 1000)')

                human_delay(2, 3.5)  # Random wait time to let reviews load and appear human
                scroll_attempts += 1

            logger.info(f"Scroll loop completed. Total reviews: {len(reviews)}, Scroll attempts: {scroll_attempts}")
            self.stdout.write(f'\n✓ Scraped {len(reviews)} reviews')
            logger.info(f"Returning {len(reviews)} reviews from scroll_and_extract_reviews()")
            return reviews

        except Exception as e:
            logger.error(f"Exception in scroll_and_extract_reviews: {str(e)}", exc_info=True)
            logger.warning(f"Browser crashed but returning {len(reviews)} reviews collected before crash")
            return reviews  # Return partial results instead of empty list

    def extract_review_data(self, elem, page):
        """Extract data from a single review element"""

        # Author
        author_elem = elem.query_selector('[aria-label*="Photo of" i], div[class*="author" i]')
        author = 'Anonymous'
        if author_elem:
            aria_label = author_elem.get_attribute('aria-label')
            if aria_label:
                author = aria_label.replace('Photo of ', '').strip()
        else:
            # Try alternative selector
            author_elem = elem.query_selector('button[aria-label]')
            if author_elem:
                author = author_elem.inner_text().strip()

        # Rating
        rating_elem = elem.query_selector('[role="img"][aria-label*="star" i]')
        rating = 0
        if rating_elem:
            aria_label = rating_elem.get_attribute('aria-label')
            rating_match = re.search(r'(\d+)', aria_label)
            if rating_match:
                rating = int(rating_match.group(1))

        # Review text - try to expand "More" button first
        try:
            more_button = elem.query_selector('button[aria-label*="See more" i], button:has-text("More")')
            if more_button:
                try:
                    more_button.click()
                    human_delay(0.1, 0.3)
                except:
                    pass
        except:
            pass

        # Try multiple selectors for review text
        text = ''
        text_selectors = [
            'span[data-review-id]',  # Primary selector
            'div[class*="review-text" i]',
            'div[jslog*="review"] > span',
            'span[jslog] > span',  # Nested span structure
        ]

        for selector in text_selectors:
            text_elem = elem.query_selector(selector)
            if text_elem:
                text = text_elem.inner_text().strip()
                if len(text) > 20:  # Found substantial text
                    break

        # If still no text found, try finding longest span content
        if not text or len(text) < 20:
            text_spans = elem.query_selector_all('span')
            longest_text = ''
            for span in text_spans:
                text_content = span.inner_text().strip()
                if len(text_content) > len(longest_text):
                    longest_text = text_content
            if len(longest_text) > 20:
                text = longest_text

        # Time
        time_elem = elem.query_selector('span[class*="date" i], span:has-text(" ago")')
        time_text = time_elem.inner_text() if time_elem else 'Unknown'

        return {
            'author': author,
            'rating': rating,
            'text': text,
            'time': time_text,
            'timestamp': int(time.time())  # Approximate
        }

    def display_summary(self, business_name, data):
        """Display scraping summary"""
        self.stdout.write(self.style.SUCCESS(f'\n\n{"="*80}'))
        self.stdout.write(self.style.SUCCESS(f'SCRAPING SUMMARY: {business_name}'))
        self.stdout.write(self.style.SUCCESS(f'{"="*80}\n'))

        business_info = data.get('business_info', {})
        self.stdout.write(f'Business: {business_info.get("name", "Unknown")}')
        self.stdout.write(f'Address: {business_info.get("address", "Unknown")}')
        self.stdout.write(f'Overall Rating: {business_info.get("rating", 0)} stars')
        self.stdout.write(f'Total Reviews on Google: {business_info.get("total_reviews", 0)}')
        self.stdout.write(f'Reviews Scraped: {len(data.get("reviews", []))}')

        # Rating distribution
        reviews = data.get('reviews', [])
        if reviews:
            from collections import Counter
            rating_dist = Counter([r['rating'] for r in reviews])
            self.stdout.write('\nRating Distribution (scraped):')
            for rating in sorted(rating_dist.keys(), reverse=True):
                count = rating_dist[rating]
                percentage = (count / len(reviews) * 100)
                stars = '⭐' * rating
                bar = '█' * int(percentage / 2)
                self.stdout.write(f'  {stars} ({rating}): {count:4d} reviews {bar} {percentage:.1f}%')

        self.stdout.write(f'\n{"="*80}\n')
