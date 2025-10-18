import json
import boto3
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class AITemplateGenerator:
    """
    AWS Bedrock service for generating AI-powered micro-check templates.
    Uses Claude via Bedrock to generate custom templates based on brand context.
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
                # Using Claude 3.5 Sonnet for better quality template generation
                self.model_id = "anthropic.claude-3-5-sonnet-20241022-v2:0"
                logger.info("AI Template Generator initialized with Claude 3.5 Sonnet")
            except Exception as e:
                logger.warning(f"Failed to initialize Bedrock client: {e}")
                self.enabled = False
        else:
            logger.info("AI template generation disabled")

    def analyze_brand(self, brand_name, industry=None):
        """
        Analyze a brand to understand its business type and operations.

        Args:
            brand_name: Name of the brand/business
            industry: Optional industry type (RESTAURANT, RETAIL, HOSPITALITY, OTHER)

        Returns:
            dict: {
                'business_type': str (e.g., "Fast casual restaurant chain"),
                'typical_operations': str (description of typical operations),
                'compliance_focus_areas': list[str] (key compliance areas)
            }
        """
        if not self.enabled:
            return self._get_fallback_brand_analysis(brand_name, industry)

        try:
            prompt = self._build_brand_analysis_prompt(brand_name, industry)
            response = self._call_bedrock(prompt, max_tokens=500)
            result = self._parse_brand_analysis_response(response)

            logger.info(f"Generated brand analysis for {brand_name}")
            return result

        except Exception as e:
            logger.warning(f"Brand analysis failed, using fallback: {e}")
            return self._get_fallback_brand_analysis(brand_name, industry)

    def generate_templates(self, brand_info, category, count=5):
        """
        Generate custom micro-check templates for a specific category.

        Args:
            brand_info: dict from analyze_brand() with business context
            category: Micro-check category (PPE, SAFETY, CLEANLINESS, etc.)
            count: Number of templates to generate (default 5)

        Returns:
            list[dict]: List of template objects with:
                - title: str
                - description: str
                - success_criteria: str
                - severity: str (LOW, MEDIUM, HIGH, CRITICAL)
                - expected_completion_seconds: int
        """
        if not self.enabled:
            return self._get_fallback_templates(category, count)

        try:
            prompt = self._build_template_generation_prompt(brand_info, category, count)
            response = self._call_bedrock(prompt, max_tokens=2000)
            templates = self._parse_template_generation_response(response)

            logger.info(f"Generated {len(templates)} templates for category {category}")
            return templates[:count]  # Ensure we don't exceed requested count

        except Exception as e:
            logger.warning(f"Template generation failed, using fallback: {e}")
            return self._get_fallback_templates(category, count)

    def _build_brand_analysis_prompt(self, brand_name, industry):
        """Build prompt for brand analysis"""
        industry_context = f" (industry: {industry})" if industry else ""

        prompt = f"""You are an AI assistant helping analyze businesses for operational compliance checking.

Given this brand: {brand_name}{industry_context}

Analyze and provide:
1. Business type (be specific - e.g., "Fast casual Mexican restaurant chain", "Boutique retail clothing store")
2. Typical operations (what daily operations look like)
3. Top 3-5 compliance focus areas specific to this type of business

Be realistic and specific based on what you know about this brand or similar businesses.

Respond ONLY with a JSON object in this exact format:
{{
  "business_type": "specific business type",
  "typical_operations": "description of typical daily operations",
  "compliance_focus_areas": ["area 1", "area 2", "area 3"]
}}"""

        return prompt

    def _build_template_generation_prompt(self, brand_info, category, count):
        """Build prompt for template generation"""

        # Map category to display name
        category_names = {
            'PPE': 'Personal Protective Equipment',
            'SAFETY': 'Safety',
            'CLEANLINESS': 'Cleanliness',
            'UNIFORM': 'Uniform Compliance',
            'MENU_BOARD': 'Menu Board',
            'FOOD_SAFETY': 'Food Safety & Hygiene',
            'EQUIPMENT': 'Equipment & Maintenance',
            'OPERATIONAL': 'Operational Compliance',
            'FOOD_QUALITY': 'Food Quality & Presentation',
            'STAFF_BEHAVIOR': 'Staff Behavior',
            'OTHER': 'Other'
        }

        category_display = category_names.get(category, category)

        prompt = f"""You are an AI assistant creating quick operational check templates ("Micro Checks") for managers.

Business Context:
- Type: {brand_info.get('business_type', 'Unknown')}
- Operations: {brand_info.get('typical_operations', 'Standard operations')}
- Focus Areas: {', '.join(brand_info.get('compliance_focus_areas', []))}

Category: {category_display}

Generate {count} specific, actionable "Micro Check" templates for this category. Each check should:
1. Be completable in 30-60 seconds
2. Have a clear, specific title (5-8 words)
3. Include a brief description of what to check
4. Define clear success criteria (what "PASS" looks like)
5. Have appropriate severity (LOW, MEDIUM, HIGH, CRITICAL)
6. Be realistic for this specific type of business

Severity Guidelines:
- CRITICAL: Immediate health/safety risk or legal violation
- HIGH: Significant compliance issue or quality problem
- MEDIUM: Standard operational check
- LOW: Best practice or minor detail

Respond ONLY with a JSON array in this exact format:
[
  {{
    "title": "Check Title",
    "description": "What to check and why",
    "success_criteria": "What PASS looks like - specific, measurable",
    "severity": "MEDIUM",
    "expected_completion_seconds": 45
  }}
]"""

        return prompt

    def _call_bedrock(self, prompt, max_tokens=1000):
        """Make the API call to Bedrock"""
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": 0.7,  # Balance creativity and consistency
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

    def _parse_brand_analysis_response(self, response_text):
        """Parse and validate brand analysis response"""
        try:
            response_text = self._clean_json_response(response_text)
            result = json.loads(response_text)

            # Validate required fields
            required_fields = ['business_type', 'typical_operations', 'compliance_focus_areas']
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")

            return result

        except Exception as e:
            logger.error(f"Error parsing brand analysis response: {e}\nResponse: {response_text}")
            raise

    def _parse_template_generation_response(self, response_text):
        """Parse and validate template generation response"""
        try:
            response_text = self._clean_json_response(response_text)
            templates = json.loads(response_text)

            if not isinstance(templates, list):
                raise ValueError("Response is not a list")

            # Validate each template
            validated_templates = []
            for template in templates:
                validated = self._validate_template(template)
                if validated:
                    validated_templates.append(validated)

            return validated_templates

        except Exception as e:
            logger.error(f"Error parsing template response: {e}\nResponse: {response_text}")
            raise

    def _validate_template(self, template):
        """Validate and normalize a template object"""
        required_fields = ['title', 'description', 'success_criteria', 'severity']

        for field in required_fields:
            if field not in template or not template[field]:
                return None

        # Normalize severity
        severity = template['severity'].upper()
        if severity not in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']:
            severity = 'MEDIUM'

        # Ensure expected_completion_seconds is reasonable
        completion_time = template.get('expected_completion_seconds', 45)
        completion_time = max(15, min(180, int(completion_time)))  # Clamp to 15-180 seconds

        return {
            'title': template['title'][:200],  # Truncate to model limit
            'description': template['description'],
            'success_criteria': template['success_criteria'],
            'severity': severity,
            'expected_completion_seconds': completion_time
        }

    def _clean_json_response(self, response_text):
        """Clean markdown code blocks from JSON response"""
        response_text = response_text.strip()
        if response_text.startswith('```json'):
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif response_text.startswith('```'):
            response_text = response_text.split('```')[1].split('```')[0].strip()
        return response_text

    def _get_fallback_brand_analysis(self, brand_name, industry):
        """Fallback brand analysis if AI unavailable"""
        industry_map = {
            'RESTAURANT': 'Restaurant',
            'RETAIL': 'Retail Store',
            'HOSPITALITY': 'Hospitality Business',
            'OTHER': 'Business'
        }

        business_type = f"{industry_map.get(industry, 'Business')}"

        return {
            'business_type': business_type,
            'typical_operations': 'Daily operations including customer service, facility management, and compliance monitoring',
            'compliance_focus_areas': ['Safety', 'Cleanliness', 'Staff Training']
        }

    def _get_fallback_templates(self, category, count):
        """Fallback templates if AI unavailable"""

        fallback_templates = {
            'CLEANLINESS': [
                {
                    'title': 'Dining Area Cleanliness Check',
                    'description': 'Inspect tables, floors, and high-touch surfaces for cleanliness',
                    'success_criteria': 'All surfaces clean, no visible debris, floors swept and mopped',
                    'severity': 'MEDIUM',
                    'expected_completion_seconds': 45
                },
                {
                    'title': 'Restroom Cleanliness Inspection',
                    'description': 'Check restroom cleanliness, supplies, and functionality',
                    'success_criteria': 'Restrooms clean, stocked with supplies, all fixtures working',
                    'severity': 'HIGH',
                    'expected_completion_seconds': 60
                }
            ],
            'SAFETY': [
                {
                    'title': 'Fire Exit Accessibility',
                    'description': 'Verify all fire exits are clear and accessible',
                    'success_criteria': 'All exits clearly marked, unobstructed, emergency lighting functional',
                    'severity': 'CRITICAL',
                    'expected_completion_seconds': 30
                },
                {
                    'title': 'Wet Floor Signage',
                    'description': 'Check that wet floors are properly marked',
                    'success_criteria': 'Caution signs placed on all wet surfaces, clear warnings visible',
                    'severity': 'HIGH',
                    'expected_completion_seconds': 30
                }
            ],
            'FOOD_SAFETY': [
                {
                    'title': 'Food Temperature Check',
                    'description': 'Verify hot and cold food storage temperatures',
                    'success_criteria': 'Hot foods above 140°F, cold foods below 40°F',
                    'severity': 'CRITICAL',
                    'expected_completion_seconds': 60
                },
                {
                    'title': 'Hand Washing Station Check',
                    'description': 'Ensure hand washing stations are stocked and functional',
                    'success_criteria': 'Soap, paper towels, hot water available at all stations',
                    'severity': 'HIGH',
                    'expected_completion_seconds': 45
                }
            ]
        }

        templates = fallback_templates.get(category, fallback_templates['CLEANLINESS'])
        return templates[:count]
