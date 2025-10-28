import json
import boto3
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class BedrockRecommendationService:
    """
    AWS Bedrock service for generating AI-powered inspection recommendations.
    Uses Claude via Bedrock to generate contextual recommendations and time estimates.
    """

    def __init__(self):
        self.enabled = getattr(settings, 'ENABLE_BEDROCK_RECOMMENDATIONS', False)

        if self.enabled:
            try:
                self.client = boto3.client(
                    'bedrock-runtime',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME
                )
                # Using Claude 3 Haiku for fast, cost-effective responses
                self.model_id = "anthropic.claude-3-haiku-20240307-v1:0"
                logger.info("Bedrock recommendation service initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Bedrock client, using fallback recommendations: {e}")
                self.enabled = False
        else:
            logger.info("Bedrock recommendations disabled, using fallback recommendations")

    def generate_recommendation(self, category, severity, title, description, is_consolidated=False, frame_count=1):
        """
        Generate a recommended action and time estimate for a finding.

        Args:
            category: Finding category (PPE, SAFETY, etc.)
            severity: Severity level (LOW, MEDIUM, HIGH, CRITICAL)
            title: Finding title
            description: Finding description
            is_consolidated: Whether this is a consolidated finding
            frame_count: Number of frames where issue appears (for consolidated findings)

        Returns:
            dict: {
                'recommended_action': str,
                'estimated_minutes': int
            }
        """
        # If Bedrock is disabled, use fallback immediately
        if not self.enabled:
            return self._get_fallback_recommendation(category, severity, is_consolidated, frame_count)

        try:
            # Build context-aware prompt
            prompt = self._build_prompt(category, severity, title, description, is_consolidated, frame_count)

            # Call Bedrock
            response = self._call_bedrock(prompt)

            # Parse and validate response
            result = self._parse_response(response)

            logger.info(f"Generated Bedrock recommendation for {title}: {result['estimated_minutes']} minutes")
            return result

        except Exception as e:
            logger.warning(f"Bedrock recommendation failed, using fallback: {e}")
            # Fallback to basic recommendation
            return self._get_fallback_recommendation(category, severity, is_consolidated, frame_count)

    def _build_prompt(self, category, severity, title, description, is_consolidated, frame_count):
        """Build the Claude prompt for generating recommendations"""

        persistence_context = ""
        if is_consolidated and frame_count > 1:
            persistence_context = f"\n- This issue was detected in {frame_count} different video frames, indicating it's a persistent/systemic problem"

        prompt = f"""You are an AI assistant helping generate actionable recommendations for restaurant/store inspection findings.

Given this inspection finding:
- Category: {category}
- Severity: {severity}
- Issue Title: {title}
- Description: {description}{persistence_context}

Generate:
1. A specific, actionable recommendation (1-2 sentences) that tells staff exactly what to do
2. A realistic time estimate in minutes to address this issue

Guidelines:
- Be specific and actionable (not vague)
- Consider severity: CRITICAL requires immediate action, LOW can be scheduled
- Persistent issues (multiple frames) may need systemic fixes, not just spot corrections
- Time estimates should be realistic for restaurant/retail staff
- CRITICAL: 2-10 minutes (immediate action)
- HIGH: 5-15 minutes (priority action)
- MEDIUM: 10-30 minutes (scheduled action)
- LOW: 15-45 minutes (ongoing improvement)

Respond ONLY with a JSON object in this exact format:
{{"recommended_action": "specific action here", "estimated_minutes": 10}}"""

        return prompt

    def _call_bedrock(self, prompt):
        """Make the API call to Bedrock"""
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 200,
            "temperature": 0.3,  # Low temperature for consistent, factual responses
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        })

        response = self.client.invoke_model(
            modelId=self.model_id,
            body=body
        )

        response_body = json.loads(response['body'].read())
        return response_body['content'][0]['text']

    def _parse_response(self, response_text):
        """Parse and validate the Claude response"""
        try:
            # Claude should return JSON, but sometimes wraps it in markdown
            response_text = response_text.strip()
            if response_text.startswith('```json'):
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif response_text.startswith('```'):
                response_text = response_text.split('```')[1].split('```')[0].strip()

            result = json.loads(response_text)

            # Validate required fields
            if 'recommended_action' not in result or 'estimated_minutes' not in result:
                raise ValueError("Missing required fields in response")

            # Ensure estimated_minutes is an integer
            result['estimated_minutes'] = int(result['estimated_minutes'])

            # Clamp time estimate to reasonable range (1-60 minutes)
            result['estimated_minutes'] = max(1, min(60, result['estimated_minutes']))

            return result

        except Exception as e:
            logger.error(f"Error parsing Bedrock response: {e}\nResponse: {response_text}")
            raise

    def _get_fallback_recommendation(self, category, severity, is_consolidated, frame_count):
        """Fallback recommendations if Bedrock fails"""

        # Basic recommendations by category
        fallback_actions = {
            'PPE': 'Ensure all staff wear required personal protective equipment per company policy',
            'SAFETY': 'Address safety hazard immediately and review safety protocols',
            'CLEANLINESS': 'Clean affected area and implement regular cleaning schedule',
            'FOOD_SAFETY': 'Address food safety issue immediately and review food handling procedures',
            'EQUIPMENT': 'Inspect and repair equipment as needed, schedule maintenance if required',
            'OPERATIONAL': 'Review operational procedures and adjust staffing or processes as needed',
            'FOOD_QUALITY': 'Review food presentation standards with kitchen staff',
            'STAFF_BEHAVIOR': 'Counsel staff on professional behavior and company policy compliance',
            'UNIFORM': 'Review and correct staff uniform compliance with company standards',
            'MENU_BOARD': 'Update menu board to meet current compliance requirements',
            'OTHER': 'Review and address identified issue according to company standards'
        }

        # Time estimates by severity
        base_times = {
            'CRITICAL': 5,
            'HIGH': 10,
            'MEDIUM': 15,
            'LOW': 20
        }

        action = fallback_actions.get(category, fallback_actions['OTHER'])
        base_time = base_times.get(severity, 15)

        # Add extra time for persistent issues
        multiplier = 1.5 if (is_consolidated and frame_count > 5) else 1.0
        estimated_minutes = int(base_time * multiplier)

        return {
            'recommended_action': action,
            'estimated_minutes': estimated_minutes
        }

    def analyze_review(self, review_text, rating):
        """
        Analyze a Google review to extract topics, sentiment, and actionable insights.

        Args:
            review_text: The review comment text
            rating: Star rating (1-5)

        Returns:
            dict: {
                'topics': list of topics (e.g., ['cleanliness', 'service']),
                'sentiment_score': float from -1.0 (negative) to 1.0 (positive),
                'actionable_issues': list of specific problems to address,
                'suggested_category': str (cleanliness, service, food_quality, etc.),
                'confidence': float (0.0-1.0)
            }
        """
        # If Bedrock is disabled, use fallback
        if not self.enabled:
            return self._get_fallback_analysis(review_text, rating)

        try:
            # Build analysis prompt
            prompt = self._build_review_analysis_prompt(review_text, rating)

            # Call Bedrock
            response = self._call_bedrock(prompt)

            # Parse and validate response
            result = self._parse_review_analysis(response)

            logger.info(f"Analyzed review (rating: {rating}): {len(result['topics'])} topics, {result['suggested_category']}")
            return result

        except Exception as e:
            logger.warning(f"Bedrock review analysis failed, using fallback: {e}")
            return self._get_fallback_analysis(review_text, rating)

    def _build_review_analysis_prompt(self, review_text, rating):
        """Build the Claude prompt for review analysis"""

        prompt = f"""You are an AI assistant analyzing customer reviews for restaurants and retail stores.

Analyze this customer review:
Rating: {rating}/5 stars
Review: "{review_text}"

Extract the following information:
1. Topics mentioned (e.g., cleanliness, service, food quality, wait time, staff attitude, atmosphere)
2. Sentiment score from -1.0 (very negative) to 1.0 (very positive) - consider both rating and text
3. Specific actionable issues that staff can address (concrete problems, not vague complaints)
4. Primary category this review relates to (choose ONE):
   - cleanliness
   - service
   - food_quality
   - wait_time
   - staff_attitude
   - atmosphere
   - pricing
   - other

Guidelines:
- Topics should be lowercase, underscore-separated keywords (e.g., "food_quality", "wait_time")
- Actionable issues should be specific (e.g., "tables not cleaned promptly" not "bad service")
- If review mentions multiple issues, list all of them
- Sentiment should align with rating but also consider text tone
- Focus on operational issues that can be improved, not one-time incidents

Respond ONLY with a JSON object in this exact format:
{{
    "topics": ["topic1", "topic2"],
    "sentiment_score": -0.5,
    "actionable_issues": ["specific issue 1", "specific issue 2"],
    "suggested_category": "service",
    "confidence": 0.85
}}"""

        return prompt

    def _parse_review_analysis(self, response_text):
        """Parse and validate the review analysis response"""
        try:
            # Claude might wrap JSON in markdown
            response_text = response_text.strip()
            if response_text.startswith('```json'):
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif response_text.startswith('```'):
                response_text = response_text.split('```')[1].split('```')[0].strip()

            result = json.loads(response_text)

            # Validate required fields
            required_fields = ['topics', 'sentiment_score', 'actionable_issues', 'suggested_category']
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")

            # Validate and normalize data
            result['topics'] = result['topics'] if isinstance(result['topics'], list) else []
            result['sentiment_score'] = float(result['sentiment_score'])
            result['sentiment_score'] = max(-1.0, min(1.0, result['sentiment_score']))
            result['actionable_issues'] = result['actionable_issues'] if isinstance(result['actionable_issues'], list) else []
            result['confidence'] = float(result.get('confidence', 0.5))
            result['confidence'] = max(0.0, min(1.0, result['confidence']))

            return result

        except Exception as e:
            logger.error(f"Error parsing review analysis response: {e}\nResponse: {response_text}")
            raise

    def _get_fallback_analysis(self, review_text, rating):
        """Fallback review analysis if Bedrock fails"""

        # Basic sentiment based on rating
        sentiment_map = {
            1: -0.9,
            2: -0.5,
            3: 0.0,
            4: 0.5,
            5: 0.9
        }
        sentiment_score = sentiment_map.get(rating, 0.0)

        # Simple keyword-based topic detection
        topics = []
        text_lower = review_text.lower()

        topic_keywords = {
            'cleanliness': ['clean', 'dirty', 'messy', 'filth', 'sanitize'],
            'service': ['service', 'server', 'waiter', 'staff', 'employee', 'rude', 'friendly'],
            'food_quality': ['food', 'taste', 'delicious', 'bland', 'quality', 'fresh', 'stale'],
            'wait_time': ['wait', 'slow', 'fast', 'quick', 'long time'],
            'atmosphere': ['atmosphere', 'ambiance', 'noise', 'loud', 'comfortable'],
            'pricing': ['price', 'expensive', 'cheap', 'value', 'cost']
        }

        for topic, keywords in topic_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                topics.append(topic)

        # If no topics found, use 'other'
        if not topics:
            topics = ['other']

        # Use first detected topic as category
        suggested_category = topics[0] if topics else 'other'

        # Extract simple actionable issues for low ratings
        actionable_issues = []
        if rating <= 3 and review_text:
            # Just use the review text as an issue for fallback
            actionable_issues = [review_text[:100]]  # First 100 chars

        return {
            'topics': topics,
            'sentiment_score': sentiment_score,
            'actionable_issues': actionable_issues,
            'suggested_category': suggested_category,
            'confidence': 0.5  # Low confidence for fallback
        }
