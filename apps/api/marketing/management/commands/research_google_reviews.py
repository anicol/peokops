"""
Research tool to fetch and analyze Google Reviews for prospective clients.

Usage:
    python manage.py research_google_reviews "BalanceGrille" --location "USA"
    python manage.py research_google_reviews "Restaurant Name" --api-key YOUR_KEY
"""
import requests
import json
import boto3
from collections import Counter
from django.core.management.base import BaseCommand
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


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
                if search_data.get('error_message'):
                    self.stdout.write(self.style.ERROR(f'Error: {search_data.get("error_message")}'))
                self.stdout.write(self.style.WARNING(f'Full API response: {search_data}'))
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

    def analyze_review_trends(self, reviews):
        """Analyze how ratings and sentiment change over time"""
        from datetime import datetime, timedelta
        from django.utils import timezone

        if not reviews:
            return None

        # Parse timestamps and sort reviews chronologically
        reviews_with_dates = []
        now = timezone.now()

        for review in reviews:
            timestamp = review.get('timestamp')
            if timestamp and isinstance(timestamp, int) and timestamp > 0:
                # Unix timestamp from API
                review_date = datetime.fromtimestamp(timestamp, tz=timezone.get_current_timezone())
            else:
                # Parse relative time from web scraping
                time_text = review.get('time', '')
                review_date = self.parse_relative_time_for_trends(time_text, now)

            if review_date:
                reviews_with_dates.append({
                    'date': review_date,
                    'rating': review.get('rating', 0),
                    'text': review.get('text', '')
                })

        if not reviews_with_dates:
            return None

        # Sort by date
        reviews_with_dates.sort(key=lambda x: x['date'])

        # Determine time grouping based on date range
        oldest = reviews_with_dates[0]['date']
        newest = reviews_with_dates[-1]['date']
        date_range_days = (newest - oldest).days

        # Choose grouping: weekly for <3 months, monthly for >3 months
        if date_range_days < 90:
            period_days = 7  # Weekly
            period_label = 'week'
        else:
            period_days = 30  # Monthly
            period_label = 'month'

        # Group reviews by time period
        period_data = {}

        for review in reviews_with_dates:
            # Calculate period key (e.g., "2024-W01" or "2024-01")
            if period_days == 7:
                # Weekly: use ISO week
                period_key = review['date'].strftime('%Y-W%U')
                period_display = review['date'].strftime('%b %d')
            else:
                # Monthly: use year-month
                period_key = review['date'].strftime('%Y-%m')
                period_display = review['date'].strftime('%b %Y')

            if period_key not in period_data:
                period_data[period_key] = {
                    'period': period_display,
                    'ratings': [],
                    'positive_count': 0,
                    'negative_count': 0,
                    'neutral_count': 0
                }

            rating = review['rating']
            period_data[period_key]['ratings'].append(rating)

            # Count sentiment
            if rating >= 4:
                period_data[period_key]['positive_count'] += 1
            elif rating <= 2:
                period_data[period_key]['negative_count'] += 1
            else:
                period_data[period_key]['neutral_count'] += 1

        # Calculate averages and format for charting
        trend_series = []
        for period_key in sorted(period_data.keys()):
            data = period_data[period_key]
            total = len(data['ratings'])
            avg_rating = sum(data['ratings']) / total if total > 0 else 0

            trend_series.append({
                'period': data['period'],
                'average_rating': round(avg_rating, 2),
                'total_reviews': total,
                'positive_percentage': round((data['positive_count'] / total * 100), 1) if total > 0 else 0,
                'negative_percentage': round((data['negative_count'] / total * 100), 1) if total > 0 else 0,
                'neutral_percentage': round((data['neutral_count'] / total * 100), 1) if total > 0 else 0,
            })

        return {
            'series': trend_series,
            'period_type': period_label,
            'total_periods': len(trend_series)
        }

    def parse_relative_time_for_trends(self, time_text, reference_time):
        """Parse relative time for trend analysis"""
        import re

        if not time_text or not isinstance(time_text, str):
            return None

        time_text = time_text.lower().strip()

        patterns = [
            (r'(\d+)\s*day', 'days'),
            (r'(\d+)\s*week', 'weeks'),
            (r'(\d+)\s*month', 'months'),
            (r'(\d+)\s*year', 'years'),
            (r'a\s+day', 'days'),
            (r'a\s+week', 'weeks'),
            (r'a\s+month', 'months'),
            (r'a\s+year', 'years'),
        ]

        for pattern, unit in patterns:
            match = re.search(pattern, time_text)
            if match:
                try:
                    number = int(match.group(1))
                except (IndexError, ValueError):
                    number = 1

                if unit == 'days':
                    delta = timedelta(days=number)
                elif unit == 'weeks':
                    delta = timedelta(weeks=number)
                elif unit == 'months':
                    delta = timedelta(days=number * 30)
                elif unit == 'years':
                    delta = timedelta(days=number * 365)
                else:
                    continue

                return reference_time - delta

        return None

    def analyze_reviews_with_ai(self, reviews):
        """Use AI to analyze reviews for deeper insights"""
        try:
            # Initialize Bedrock client
            bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

            # Prepare review samples for AI (limit to avoid token limits)
            review_samples = []
            for review in reviews[:50]:  # Analyze up to 50 reviews for efficiency
                review_samples.append(f"Rating: {review.get('rating', 0)}/5\n{review.get('text', '')}")

            reviews_text = "\n\n---\n\n".join(review_samples)

            prompt = f"""Analyze these customer reviews for a hospitality business and provide actionable operational insights.

REVIEWS:
{reviews_text}

Please provide a JSON response with this structure:
{{
  "key_issues": [
    {{
      "theme": "Brief theme name (e.g., 'Food Temperature Issues')",
      "severity": "HIGH|MEDIUM|LOW",
      "mentions": 5,
      "summary": "2-sentence description of the issue",
      "examples": [
        {{"snippet": "relevant quote from review", "rating": 2}}
      ]
    }}
  ],
  "operational_themes": {{
    "cleanliness": {{"count": 0, "sentiment": "positive|negative|mixed", "positive_count": 0, "neutral_count": 0, "negative_count": 0, "examples": [{{"snippet": "...", "rating": 4}}]}},
    "service_speed": {{"count": 0, "sentiment": "positive|negative|mixed", "positive_count": 0, "neutral_count": 0, "negative_count": 0, "examples": []}},
    "food_quality": {{"count": 0, "sentiment": "positive|negative|mixed", "positive_count": 0, "neutral_count": 0, "negative_count": 0, "examples": []}},
    "staff_attitude": {{"count": 0, "sentiment": "positive|negative|mixed", "positive_count": 0, "neutral_count": 0, "negative_count": 0, "examples": []}},
    "wait_time": {{"count": 0, "sentiment": "positive|negative|mixed", "positive_count": 0, "neutral_count": 0, "negative_count": 0, "examples": []}},
    "temperature": {{"count": 0, "sentiment": "positive|negative|mixed", "positive_count": 0, "neutral_count": 0, "negative_count": 0, "examples": []}},
    "accuracy": {{"count": 0, "sentiment": "positive|negative|mixed", "positive_count": 0, "neutral_count": 0, "negative_count": 0, "examples": []}},
    "ambiance": {{"count": 0, "sentiment": "positive|negative|mixed", "positive_count": 0, "neutral_count": 0, "negative_count": 0, "examples": []}}
  }}
}}

Focus on identifying specific, actionable operational issues that could be addressed with daily checks."""

            # Call Claude via Bedrock
            response = bedrock.invoke_model(
                modelId='anthropic.claude-sonnet-4-20250514-v1:0',
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4000,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                })
            )

            response_body = json.loads(response['body'].read())
            ai_analysis = json.loads(response_body['content'][0]['text'])

            logger.info("AI analysis completed successfully")
            return ai_analysis

        except Exception as e:
            logger.error(f"Error in AI analysis: {str(e)}")
            # Fall back to keyword-based analysis
            logger.info("Falling back to keyword-based analysis")
            return None

    def analyze_reviews(self, reviews):
        """Analyze reviews to extract operational insights"""
        insights = {
            'total_reviews': len(reviews),
            'rating_distribution': Counter(),
            'common_complaints': [],
            'common_praise': [],
            'operational_themes': {
                'cleanliness': {'count': 0, 'positive_count': 0, 'neutral_count': 0, 'negative_count': 0, 'examples': []},
                'service_speed': {'count': 0, 'positive_count': 0, 'neutral_count': 0, 'negative_count': 0, 'examples': []},
                'food_quality': {'count': 0, 'positive_count': 0, 'neutral_count': 0, 'negative_count': 0, 'examples': []},
                'staff_attitude': {'count': 0, 'positive_count': 0, 'neutral_count': 0, 'negative_count': 0, 'examples': []},
                'wait_time': {'count': 0, 'positive_count': 0, 'neutral_count': 0, 'negative_count': 0, 'examples': []},
                'temperature': {'count': 0, 'positive_count': 0, 'neutral_count': 0, 'negative_count': 0, 'examples': []},
                'accuracy': {'count': 0, 'positive_count': 0, 'neutral_count': 0, 'negative_count': 0, 'examples': []},
                'ambiance': {'count': 0, 'positive_count': 0, 'neutral_count': 0, 'negative_count': 0, 'examples': []},
            },
            'negative_reviews': [],
            'positive_reviews': []
        }

        # Try AI analysis first
        ai_insights = self.analyze_reviews_with_ai(reviews)
        if ai_insights:
            # Use AI insights directly - trust the AI's analysis completely
            insights['operational_themes'] = ai_insights.get('operational_themes', insights['operational_themes'])
            insights['key_issues'] = ai_insights.get('key_issues', [])

            # Calculate sentiment percentages from AI's count data
            for theme_name, theme_data in insights['operational_themes'].items():
                total_count = theme_data.get('count', 0)

                # If AI didn't provide sentiment breakdown, estimate from examples
                if total_count > 0 and theme_data.get('positive_count', 0) == 0 and theme_data.get('negative_count', 0) == 0:
                    examples = theme_data.get('examples', [])
                    positive = sum(1 for ex in examples if ex.get('rating', 0) >= 4)
                    neutral = sum(1 for ex in examples if ex.get('rating', 0) == 3)
                    negative = sum(1 for ex in examples if ex.get('rating', 0) <= 2)

                    # Extrapolate from examples to total count
                    if len(examples) > 0:
                        total_examples = len(examples)
                        theme_data['positive_count'] = round((positive / total_examples) * total_count)
                        theme_data['neutral_count'] = round((neutral / total_examples) * total_count)
                        theme_data['negative_count'] = round((negative / total_examples) * total_count)
                    else:
                        # No examples, assume neutral distribution
                        theme_data['positive_count'] = 0
                        theme_data['neutral_count'] = 0
                        theme_data['negative_count'] = 0
                else:
                    # Ensure fields exist even if AI provided them
                    theme_data.setdefault('positive_count', 0)
                    theme_data.setdefault('neutral_count', 0)
                    theme_data.setdefault('negative_count', 0)
        else:
            # Fallback to keyword-based analysis only if AI completely fails
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

                for theme, keywords in theme_keywords.items():
                    for keyword in keywords:
                        if keyword in text:
                            insights['operational_themes'][theme]['count'] += 1

                            if rating >= 4:
                                insights['operational_themes'][theme]['positive_count'] += 1
                            elif rating == 3:
                                insights['operational_themes'][theme]['neutral_count'] += 1
                            else:
                                insights['operational_themes'][theme]['negative_count'] += 1

                            if len(insights['operational_themes'][theme]['examples']) < 3:
                                snippet = self.extract_snippet(text, keyword)
                                insights['operational_themes'][theme]['examples'].append({
                                    'rating': rating,
                                    'snippet': snippet
                                })
                            break

        # Add time-series trend analysis
        insights['trend_data'] = self.analyze_review_trends(reviews)

        # Always calculate rating distribution and categorize reviews
        for review in reviews:
            rating = review.get('rating', 0)

            # Rating distribution
            insights['rating_distribution'][rating] += 1

            # Categorize as positive or negative
            if rating <= 2:
                insights['negative_reviews'].append(review)
            elif rating >= 4:
                insights['positive_reviews'].append(review)

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

    def generate_microcheck_suggestions_with_ai(self, insights):
        """Use AI to generate highly relevant micro-check suggestions"""
        import time
        from botocore.exceptions import ClientError

        try:
            # Add delay before making AI call to avoid throttling
            # (this is called right after the main analysis AI call)
            # AWS Bedrock has strict rate limits, need much longer delay
            logger.info("Waiting 30 seconds before generating micro-checks to avoid throttling...")
            time.sleep(30)

            bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

            # Prepare key issues for context
            key_issues_text = ""
            if 'key_issues' in insights:
                for issue in insights['key_issues'][:5]:
                    key_issues_text += f"- {issue.get('theme')}: {issue.get('summary', '')}\n"

            prompt = f"""Based on these customer review insights for a hospitality business, generate 5-7 specific micro-check questions that staff should perform daily to prevent these issues.

KEY ISSUES IDENTIFIED:
{key_issues_text}

OPERATIONAL THEMES:
{json.dumps(insights.get('operational_themes', {}), indent=2)}

Generate a JSON array of micro-check suggestions with this structure:
[
  {{
    "title": "Clear, actionable title (e.g., 'Food Temperature Verification')",
    "question": "Specific yes/no question staff should check (e.g., 'Is all hot food being served above 140°F?')",
    "success_criteria": "Clear, measurable criteria for passing this check",
    "category": "CLEANLINESS|FOOD_SAFETY|SERVICE|AMBIANCE",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "mentions_in_reviews": 5
  }}
]

Focus on:
1. Specific, daily-checkable items (not vague or subjective)
2. Issues that customers actually mentioned
3. Preventable operational problems
4. Clear pass/fail criteria"""

            # Retry logic with exponential backoff for throttling
            max_retries = 3
            base_delay = 10  # Increased from 5s to 10s for very strict rate limits

            for attempt in range(max_retries):
                try:
                    response = bedrock.invoke_model(
                        modelId='anthropic.claude-sonnet-4-20250514-v1:0',
                        body=json.dumps({
                            "anthropic_version": "bedrock-2023-05-31",
                            "max_tokens": 3000,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": prompt
                                }
                            ]
                        })
                    )

                    response_body = json.loads(response['body'].read())
                    ai_suggestions = json.loads(response_body['content'][0]['text'])

                    logger.info(f"AI generated {len(ai_suggestions)} micro-check suggestions")
                    return ai_suggestions

                except ClientError as ce:
                    error_code = ce.response.get('Error', {}).get('Code', '')

                    if error_code == 'ThrottlingException' and attempt < max_retries - 1:
                        # Exponential backoff: 10s, 20s, 40s
                        delay = base_delay * (2 ** attempt)
                        logger.warning(f"Throttling detected, retrying in {delay}s (attempt {attempt + 1}/{max_retries})")
                        time.sleep(delay)
                    else:
                        # Last attempt or different error
                        raise

        except Exception as e:
            logger.error(f"Error generating AI micro-checks: {str(e)}")
            return None

    def generate_microcheck_suggestions(self, insights):
        """Generate micro-check questions based on insights"""
        # Try AI-powered generation first
        ai_suggestions = self.generate_microcheck_suggestions_with_ai(insights)
        if ai_suggestions:
            return ai_suggestions

        # Fallback to keyword-based suggestions
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
