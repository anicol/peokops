import json
import boto3
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class EmployeeVoiceAISummaryService:
    """
    AWS Bedrock service for summarizing employee voice comments.
    Uses Claude via Bedrock to generate actionable insights from feedback.
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
                logger.info("Employee Voice AI Summary service initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Bedrock client for summaries: {e}")
                self.enabled = False
        else:
            logger.info("Employee Voice AI Summary service disabled")

    def summarize_comments(self, pulse_id, comments, days=7):
        """
        Generate an AI summary of employee comments.

        Args:
            pulse_id: The pulse ID for cache key
            comments: List of comment texts
            days: Time period for caching purposes

        Returns:
            dict: {
                'summary': str,
                'key_themes': List[str],
                'sentiment': str,  # 'positive', 'neutral', 'negative'
                'action_items': List[str]
            }
        """
        if not comments or len(comments) == 0:
            return self._get_empty_summary()

        # Check cache first (cache for 1 hour)
        cache_key = f"ev_ai_summary_{pulse_id}_{days}_{len(comments)}"
        cached_summary = cache.get(cache_key)
        if cached_summary:
            logger.info(f"Returning cached AI summary for pulse {pulse_id}")
            return cached_summary

        # If Bedrock is disabled, use fallback
        if not self.enabled:
            return self._get_fallback_summary(comments)

        try:
            # Build prompt
            prompt = self._build_prompt(comments, days)

            # Call Bedrock
            response = self._call_bedrock(prompt)

            # Parse and validate response
            result = self._parse_response(response)

            # Cache the result for 1 hour
            cache.set(cache_key, result, 3600)

            logger.info(f"Generated AI summary for pulse {pulse_id} ({len(comments)} comments)")
            return result

        except Exception as e:
            logger.warning(f"AI summary generation failed, using fallback: {e}")
            return self._get_fallback_summary(comments)

    def _build_prompt(self, comments, days):
        """Build the Claude prompt for summarizing comments"""

        comments_text = "\n\n".join([f"- {comment}" for comment in comments])

        prompt = f"""You are analyzing employee feedback from a pulse survey at a restaurant.

Here are {len(comments)} anonymous comments from the last {days} days:

{comments_text}

Please analyze these comments and provide:

1. A brief summary (2-3 sentences) of the overall feedback
2. 3-5 key themes or topics mentioned most often
3. Overall sentiment (positive, neutral, or negative)
4. 2-3 actionable items managers should consider

Respond ONLY with valid JSON in this exact format:
{{
    "summary": "Brief 2-3 sentence summary of overall feedback",
    "key_themes": ["Theme 1", "Theme 2", "Theme 3"],
    "sentiment": "positive|neutral|negative",
    "action_items": ["Action 1", "Action 2"]
}}

Be concise, actionable, and focused on what restaurant managers need to know."""

        return prompt

    def _call_bedrock(self, prompt):
        """Make the actual Bedrock API call"""
        body = json.dumps({
            "max_tokens": 1000,
            "temperature": 0.5,  # Moderate temperature for balanced creativity/consistency
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
            # Claude sometimes wraps JSON in markdown
            response_text = response_text.strip()
            if response_text.startswith('```json'):
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif response_text.startswith('```'):
                response_text = response_text.split('```')[1].split('```')[0].strip()

            result = json.loads(response_text)

            # Validate required fields
            required_fields = ['summary', 'key_themes', 'sentiment', 'action_items']
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")

            # Validate sentiment
            if result['sentiment'] not in ['positive', 'neutral', 'negative']:
                result['sentiment'] = 'neutral'

            # Ensure lists
            if not isinstance(result['key_themes'], list):
                result['key_themes'] = []
            if not isinstance(result['action_items'], list):
                result['action_items'] = []

            return result

        except Exception as e:
            logger.error(f"Error parsing AI summary response: {e}\nResponse: {response_text}")
            raise

    def _get_fallback_summary(self, comments):
        """Fallback summary if AI fails"""
        comment_count = len(comments)

        # Simple keyword analysis for fallback
        all_text = " ".join(comments).lower()

        # Detect common themes
        themes = []
        theme_keywords = {
            "Staffing": ["staff", "team", "people", "understaffed"],
            "Equipment": ["equipment", "broken", "tools"],
            "Cleanliness": ["clean", "dirty", "mess"],
            "Communication": ["communication", "told", "know", "inform"],
            "Workload": ["busy", "rushed", "overwhelm", "stress"]
        }

        for theme, keywords in theme_keywords.items():
            if any(keyword in all_text for keyword in keywords):
                themes.append(theme)

        # Basic sentiment
        positive_words = ["great", "good", "excellent", "love", "happy"]
        negative_words = ["bad", "terrible", "awful", "hate", "problem", "issue"]

        pos_count = sum(1 for word in positive_words if word in all_text)
        neg_count = sum(1 for word in negative_words if word in all_text)

        if pos_count > neg_count + 2:
            sentiment = "positive"
        elif neg_count > pos_count + 2:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        return {
            "summary": f"Team members shared {comment_count} {'comment' if comment_count == 1 else 'comments'} about their work experience. Common topics include operations, teamwork, and daily challenges.",
            "key_themes": themes[:5] if themes else ["General Feedback", "Operations"],
            "sentiment": sentiment,
            "action_items": [
                "Review feedback with management team",
                "Address recurring themes in next team meeting"
            ]
        }

    def _get_empty_summary(self):
        """Return structure for when there are no comments"""
        return {
            "summary": "No comments available for this time period.",
            "key_themes": [],
            "sentiment": "neutral",
            "action_items": []
        }


# Singleton instance
_ai_summary_service = None

def get_ai_summary_service():
    """Get or create the singleton AI summary service instance"""
    global _ai_summary_service
    if _ai_summary_service is None:
        _ai_summary_service = EmployeeVoiceAISummaryService()
    return _ai_summary_service
