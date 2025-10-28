"""
Research tool to fetch and analyze Google Reviews for prospective clients.

Usage:
    python manage.py research_google_reviews "BalanceGrille" --location "USA"
    python manage.py research_google_reviews "Restaurant Name" --api-key YOUR_KEY
"""
import requests
import json
from collections import Counter
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Fetch and analyze Google Reviews for a business to identify operational insights'

    def add_arguments(self, parser):
        parser.add_argument('business_name', type=str, help='Name of the business to research')
        parser.add_argument('--location', type=str, default='', help='Location to narrow search (e.g., "New York, NY")')
        parser.add_argument('--api-key', type=str, help='Google Places API key (or set GOOGLE_PLACES_API_KEY env var)')
        parser.add_argument('--output', type=str, help='Output JSON file path')
        parser.add_argument('--max-reviews', type=int, default=50, help='Maximum number of reviews to fetch')
        parser.add_argument('--method', type=str, default='places', choices=['places', 'serpapi'],
                          help='Method to use: places (Google Places API) or serpapi (SerpAPI)')

    def handle(self, *args, **options):
        business_name = options['business_name']
        location = options['location']
        api_key = options['api_key'] or getattr(settings, 'GOOGLE_PLACES_API_KEY', None)
        max_reviews = options['max_reviews']
        method = options['method']

        self.stdout.write(self.style.SUCCESS(f'\n=== Google Reviews Research for "{business_name}" ===\n'))

        if method == 'places':
            if not api_key:
                self.stdout.write(self.style.ERROR(
                    'Google Places API key required. Set GOOGLE_PLACES_API_KEY in settings or use --api-key'
                ))
                self.stdout.write('\nGet an API key at: https://console.cloud.google.com/apis/credentials')
                self.stdout.write('Enable "Places API" at: https://console.cloud.google.com/apis/library/places-backend.googleapis.com')
                return

            reviews_data = self.fetch_reviews_google_places(business_name, location, api_key, max_reviews)
        elif method == 'serpapi':
            serpapi_key = options['api_key'] or getattr(settings, 'SERPAPI_KEY', None)
            if not serpapi_key:
                self.stdout.write(self.style.ERROR(
                    'SerpAPI key required. Set SERPAPI_KEY in settings or use --api-key'
                ))
                self.stdout.write('\nGet an API key at: https://serpapi.com/manage-api-key')
                return
            reviews_data = self.fetch_reviews_serpapi(business_name, location, serpapi_key, max_reviews)

        if not reviews_data:
            self.stdout.write(self.style.ERROR('No reviews found. Check business name or API key.'))
            return

        # Analyze the reviews
        insights = self.analyze_reviews(reviews_data)

        # Generate micro-check suggestions
        micro_check_suggestions = self.generate_microcheck_suggestions(insights)

        # Display results
        self.display_results(business_name, reviews_data, insights, micro_check_suggestions)

        # Save to file if requested
        if options['output']:
            output_data = {
                'business_name': business_name,
                'location': location,
                'total_reviews': len(reviews_data),
                'reviews': reviews_data,
                'insights': insights,
                'micro_check_suggestions': micro_check_suggestions
            }
            with open(options['output'], 'w') as f:
                json.dump(output_data, f, indent=2)
            self.stdout.write(self.style.SUCCESS(f'\n✓ Data saved to {options["output"]}'))

    def fetch_reviews_google_places(self, business_name, location, api_key, max_reviews):
        """Fetch reviews using Google Places API"""
        self.stdout.write(f'Searching for "{business_name}"...')

        # Step 1: Find the place
        search_query = f"{business_name} {location}".strip()
        search_url = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
        search_params = {
            'input': search_query,
            'inputtype': 'textquery',
            'fields': 'place_id,name,formatted_address,rating,user_ratings_total',
            'key': api_key
        }

        try:
            response = requests.get(search_url, params=search_params)
            response.raise_for_status()
            search_data = response.json()

            if search_data.get('status') != 'OK' or not search_data.get('candidates'):
                self.stdout.write(self.style.WARNING(f'Status: {search_data.get("status")}'))
                self.stdout.write(self.style.WARNING(f'No results found for "{search_query}"'))
                return None

            place = search_data['candidates'][0]
            place_id = place['place_id']

            self.stdout.write(self.style.SUCCESS(f'✓ Found: {place["name"]}'))
            self.stdout.write(f'  Address: {place.get("formatted_address", "N/A")}')
            self.stdout.write(f'  Rating: {place.get("rating", "N/A")} ({place.get("user_ratings_total", 0)} reviews)')

            # Step 2: Fetch place details including reviews
            details_url = 'https://maps.googleapis.com/maps/api/place/details/json'
            details_params = {
                'place_id': place_id,
                'fields': 'name,rating,user_ratings_total,reviews,formatted_address',
                'key': api_key
            }

            self.stdout.write(f'\nFetching reviews (max {max_reviews})...')
            response = requests.get(details_url, params=details_params)
            response.raise_for_status()
            details_data = response.json()

            if details_data.get('status') != 'OK':
                self.stdout.write(self.style.WARNING(f'Details status: {details_data.get("status")}'))
                return None

            reviews = details_data['result'].get('reviews', [])[:max_reviews]

            self.stdout.write(self.style.SUCCESS(f'✓ Fetched {len(reviews)} reviews'))

            # Format review data
            formatted_reviews = []
            for review in reviews:
                formatted_reviews.append({
                    'author': review.get('author_name', 'Anonymous'),
                    'rating': review.get('rating', 0),
                    'text': review.get('text', ''),
                    'time': review.get('relative_time_description', ''),
                    'timestamp': review.get('time', 0)
                })

            return formatted_reviews

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'API Error: {str(e)}'))
            return None

    def fetch_reviews_serpapi(self, business_name, location, api_key, max_reviews):
        """Fetch reviews using SerpAPI (alternative method)"""
        self.stdout.write(f'Searching via SerpAPI for "{business_name}"...')

        url = 'https://serpapi.com/search'
        params = {
            'engine': 'google_maps',
            'q': f"{business_name} {location}".strip(),
            'type': 'search',
            'api_key': api_key
        }

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if not data.get('local_results'):
                self.stdout.write(self.style.WARNING('No results found'))
                return None

            # Get the first result's place_id
            place_id = data['local_results'][0].get('place_id')
            if not place_id:
                self.stdout.write(self.style.WARNING('No place_id found'))
                return None

            # Fetch reviews
            reviews_params = {
                'engine': 'google_maps_reviews',
                'place_id': place_id,
                'api_key': api_key,
                'num': max_reviews
            }

            reviews_response = requests.get(url, params=reviews_params)
            reviews_response.raise_for_status()
            reviews_data = reviews_response.json()

            reviews = reviews_data.get('reviews', [])

            # Format review data
            formatted_reviews = []
            for review in reviews:
                formatted_reviews.append({
                    'author': review.get('user', {}).get('name', 'Anonymous'),
                    'rating': review.get('rating', 0),
                    'text': review.get('snippet', ''),
                    'time': review.get('date', ''),
                    'timestamp': 0
                })

            return formatted_reviews

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'API Error: {str(e)}'))
            return None

    def analyze_reviews(self, reviews):
        """Analyze reviews to extract operational insights"""
        insights = {
            'total_reviews': len(reviews),
            'rating_distribution': Counter(),
            'common_complaints': [],
            'common_praise': [],
            'operational_themes': {
                'cleanliness': {'count': 0, 'examples': []},
                'service_speed': {'count': 0, 'examples': []},
                'food_quality': {'count': 0, 'examples': []},
                'staff_attitude': {'count': 0, 'examples': []},
                'wait_time': {'count': 0, 'examples': []},
                'temperature': {'count': 0, 'examples': []},
                'accuracy': {'count': 0, 'examples': []},
                'ambiance': {'count': 0, 'examples': []},
            },
            'negative_reviews': [],
            'positive_reviews': []
        }

        # Keywords for each operational theme
        theme_keywords = {
            'cleanliness': ['dirty', 'clean', 'sanit', 'mess', 'floor', 'table', 'bathroom', 'wipe'],
            'service_speed': ['slow', 'fast', 'quick', 'wait', 'long time', 'forever', 'efficient'],
            'food_quality': ['cold', 'hot', 'fresh', 'stale', 'delicious', 'terrible', 'overcooked', 'undercooked', 'raw'],
            'staff_attitude': ['rude', 'friendly', 'polite', 'attitude', 'smile', 'helpful', 'unprofessional'],
            'wait_time': ['wait', 'line', 'queue', 'busy', 'crowded', 'reservation'],
            'temperature': ['cold', 'hot', 'warm', 'freezing', 'temperature', 'lukewarm'],
            'accuracy': ['wrong', 'mistake', 'missing', 'forgot', 'error', 'correct order'],
            'ambiance': ['noise', 'loud', 'atmosphere', 'music', 'lighting', 'decor', 'uncomfortable']
        }

        for review in reviews:
            rating = review.get('rating', 0)
            text = review.get('text', '').lower()

            # Rating distribution
            insights['rating_distribution'][rating] += 1

            # Categorize as positive or negative
            if rating <= 2:
                insights['negative_reviews'].append(review)
            elif rating >= 4:
                insights['positive_reviews'].append(review)

            # Detect themes
            for theme, keywords in theme_keywords.items():
                for keyword in keywords:
                    if keyword in text:
                        insights['operational_themes'][theme]['count'] += 1
                        if len(insights['operational_themes'][theme]['examples']) < 3:
                            snippet = self.extract_snippet(text, keyword)
                            insights['operational_themes'][theme]['examples'].append({
                                'rating': rating,
                                'snippet': snippet
                            })
                        break

        return insights

    def extract_snippet(self, text, keyword, context_words=10):
        """Extract a snippet around a keyword"""
        words = text.split()
        for i, word in enumerate(words):
            if keyword in word:
                start = max(0, i - context_words)
                end = min(len(words), i + context_words + 1)
                snippet = ' '.join(words[start:end])
                return f"...{snippet}..."
        return text[:100]

    def generate_microcheck_suggestions(self, insights):
        """Generate micro-check questions based on insights"""
        suggestions = []

        themes = insights['operational_themes']

        # Sort themes by frequency
        sorted_themes = sorted(themes.items(), key=lambda x: x[1]['count'], reverse=True)

        for theme_name, theme_data in sorted_themes[:5]:  # Top 5 themes
            if theme_data['count'] == 0:
                continue

            micro_checks = {
                'cleanliness': {
                    'title': 'Dining Area Cleanliness Check',
                    'question': 'Are all tables, floors, and high-touch surfaces clean and sanitized?',
                    'success_criteria': 'All surfaces wiped down, no visible debris, sanitizer available',
                    'category': 'CLEANLINESS',
                    'severity': 'HIGH'
                },
                'service_speed': {
                    'title': 'Service Speed Check',
                    'question': 'Are orders being taken and delivered within target time windows?',
                    'success_criteria': 'Orders taken within 2 min, food delivered within 15 min',
                    'category': 'SERVICE',
                    'severity': 'MEDIUM'
                },
                'food_quality': {
                    'title': 'Food Temperature & Quality',
                    'question': 'Is food served at proper temperature and meeting quality standards?',
                    'success_criteria': 'Hot food >140°F, cold food <40°F, fresh appearance',
                    'category': 'FOOD_SAFETY',
                    'severity': 'HIGH'
                },
                'staff_attitude': {
                    'title': 'Staff Customer Service',
                    'question': 'Are staff greeting customers warmly and providing attentive service?',
                    'success_criteria': 'Friendly greeting, eye contact, proactive assistance',
                    'category': 'SERVICE',
                    'severity': 'MEDIUM'
                },
                'wait_time': {
                    'title': 'Wait Time Management',
                    'question': 'Are wait times being managed and communicated to customers?',
                    'success_criteria': 'Wait times <10 min or clearly communicated, line moving',
                    'category': 'SERVICE',
                    'severity': 'MEDIUM'
                },
                'temperature': {
                    'title': 'Food Temperature Verification',
                    'question': 'Are food temperatures being checked and logged regularly?',
                    'success_criteria': 'Temp logs current, all items within safe range',
                    'category': 'FOOD_SAFETY',
                    'severity': 'CRITICAL'
                },
                'accuracy': {
                    'title': 'Order Accuracy Check',
                    'question': 'Are orders being prepared correctly with all items included?',
                    'success_criteria': 'Order matches ticket, all items present, proper packaging',
                    'category': 'SERVICE',
                    'severity': 'MEDIUM'
                },
                'ambiance': {
                    'title': 'Dining Environment Check',
                    'question': 'Is the dining area comfortable with appropriate lighting, music, and temperature?',
                    'success_criteria': 'Comfortable temp, moderate music volume, good lighting',
                    'category': 'AMBIANCE',
                    'severity': 'LOW'
                }
            }

            if theme_name in micro_checks:
                check = micro_checks[theme_name].copy()
                check['mentions_in_reviews'] = theme_data['count']
                check['example_feedback'] = theme_data['examples'][:2]
                suggestions.append(check)

        return suggestions

    def display_results(self, business_name, reviews, insights, suggestions):
        """Display formatted analysis results"""
        self.stdout.write(self.style.SUCCESS(f'\n\n{"="*80}'))
        self.stdout.write(self.style.SUCCESS(f'ANALYSIS RESULTS: {business_name}'))
        self.stdout.write(self.style.SUCCESS(f'{"="*80}\n'))

        # Rating distribution
        self.stdout.write(self.style.WARNING('📊 RATING DISTRIBUTION'))
        total = insights['total_reviews']
        for rating in sorted(insights['rating_distribution'].keys(), reverse=True):
            count = insights['rating_distribution'][rating]
            percentage = (count / total * 100) if total > 0 else 0
            stars = '⭐' * rating
            bar = '█' * int(percentage / 2)
            self.stdout.write(f'  {stars} ({rating}): {count:3d} reviews {bar} {percentage:.1f}%')

        # Operational themes
        self.stdout.write(self.style.WARNING(f'\n🔍 OPERATIONAL THEMES (mentions in reviews)'))
        sorted_themes = sorted(
            insights['operational_themes'].items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )
        for theme_name, theme_data in sorted_themes:
            if theme_data['count'] > 0:
                self.stdout.write(f'\n  {theme_name.replace("_", " ").title()}: {theme_data["count"]} mentions')
                for example in theme_data['examples'][:2]:
                    self.stdout.write(f'    • ({example["rating"]}⭐) {example["snippet"][:80]}...')

        # Micro-check suggestions
        self.stdout.write(self.style.WARNING(f'\n\n💡 RECOMMENDED MICRO-CHECK QUESTIONS\n'))
        for i, suggestion in enumerate(suggestions, 1):
            self.stdout.write(self.style.SUCCESS(f'{i}. {suggestion["title"]}'))
            self.stdout.write(f'   Category: {suggestion["category"]} | Severity: {suggestion["severity"]}')
            self.stdout.write(f'   Question: "{suggestion["question"]}"')
            self.stdout.write(f'   Success Criteria: {suggestion["success_criteria"]}')
            self.stdout.write(f'   📈 Based on {suggestion["mentions_in_reviews"]} review mentions')
            if suggestion.get('example_feedback'):
                self.stdout.write('   Example customer feedback:')
                for ex in suggestion['example_feedback']:
                    self.stdout.write(f'     • ({ex["rating"]}⭐) {ex["snippet"][:70]}...')
            self.stdout.write('')

        # Summary stats
        self.stdout.write(self.style.WARNING('📈 SUMMARY'))
        self.stdout.write(f'  Total reviews analyzed: {insights["total_reviews"]}')
        self.stdout.write(f'  Negative reviews (≤2⭐): {len(insights["negative_reviews"])}')
        self.stdout.write(f'  Positive reviews (≥4⭐): {len(insights["positive_reviews"])}')
        self.stdout.write(f'  Recommended micro-checks: {len(suggestions)}')

        self.stdout.write(self.style.SUCCESS(f'\n{"="*80}\n'))
