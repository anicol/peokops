from django.db import models
from django.utils import timezone
import uuid


class ReviewAnalysis(models.Model):
    """Store Google Reviews analysis for prospects and customers"""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    # Unique identifier for public access
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Business information
    business_name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    place_id = models.CharField(max_length=200, blank=True, help_text='Google Places ID for direct navigation')

    # Contact information (optional, collected if they want email)
    contact_email = models.EmailField(blank=True)
    contact_name = models.CharField(max_length=100, blank=True)

    # Link to account when they convert
    account = models.ForeignKey(
        'brands.Brand',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='review_analyses',
        help_text='Linked when prospect converts to customer'
    )

    # Processing status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    progress_message = models.CharField(max_length=200, blank=True)
    progress_percentage = models.IntegerField(default=0)

    # Analysis results (stored as JSON)
    scraped_data = models.JSONField(null=True, blank=True, help_text='Raw scraped reviews')
    insights = models.JSONField(null=True, blank=True, help_text='Analyzed insights')
    micro_check_suggestions = models.JSONField(null=True, blank=True, help_text='Generated micro-check recommendations')

    # Business info from Google
    google_rating = models.FloatField(null=True, blank=True)
    google_address = models.CharField(max_length=500, blank=True)
    total_reviews_found = models.IntegerField(null=True, blank=True)
    reviews_analyzed = models.IntegerField(null=True, blank=True)
    oldest_review_date = models.DateTimeField(null=True, blank=True)
    newest_review_date = models.DateTimeField(null=True, blank=True)

    # Error tracking
    error_message = models.TextField(blank=True)

    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    viewed_at = models.DateTimeField(null=True, blank=True)

    # Marketing tracking
    source = models.CharField(max_length=50, default='website', help_text='Where they came from')
    converted_to_trial = models.BooleanField(default=False)
    converted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Review Analysis'
        verbose_name_plural = 'Review Analyses'
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['contact_email']),
        ]

    def __str__(self):
        return f"{self.business_name} - {self.status}"

    def get_public_url(self):
        """Public URL for viewing results"""
        from django.conf import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f"{base_url}/review-analysis/{self.id}"

    def mark_viewed(self):
        """Mark as viewed by the prospect"""
        if not self.viewed_at:
            self.viewed_at = timezone.now()
            self.save(update_fields=['viewed_at'])

    def _detect_industry_and_subtype(self):
        """
        Use AI to detect industry and subtype from business name and Google data.

        Returns:
            tuple: (industry, subtype) using Brand.Industry and Brand.Subtype choices
        """
        import boto3
        import json
        import logging
        from brands.models import Brand

        logger = logging.getLogger(__name__)

        # Default fallback
        default_industry = Brand.Industry.RESTAURANT
        default_subtype = Brand.Subtype.CASUAL_DINING

        try:
            # Get business info from scraped data
            business_info = {}
            if self.scraped_data:
                business_info = self.scraped_data.get('business_info', {})

            # Prepare data for AI analysis
            business_name = self.business_name or "Unknown"
            location = self.location or ""
            rating = business_info.get('rating') or self.google_rating
            total_reviews = business_info.get('total_reviews') or self.total_reviews_found

            # Build prompt for Claude
            prompt = f"""Based on the business information below, identify the industry and subtype.

Business Name: {business_name}
Location: {location}
Google Rating: {rating}/5.0
Total Reviews: {total_reviews}

Available Industries:
- RESTAURANT: Restaurant / Food Service
- RETAIL: Retail Store
- HOSPITALITY: Hotel / Lodging
- OTHER: Other Industry

Available Subtypes (for restaurants):
- QSR: Quick Service / Fast Food
- FAST_CASUAL: Fast Casual
- CASUAL_DINING: Casual Dining
- FINE_DINING: Fine Dining
- CAFE: Cafe / Coffee Shop
- BAR_PUB: Bar / Pub
- FOOD_TRUCK: Food Truck
- CATERING: Catering
- BAKERY: Bakery / Dessert Shop

Available Subtypes (for retail):
- GROCERY: Grocery Store
- CONVENIENCE: Convenience Store
- FASHION: Fashion Retail

Available Subtypes (for hospitality):
- HOTEL: Hotel

Generic Subtype:
- OTHER_SUBTYPE: Other

Respond in JSON format:
{{
  "industry": "RESTAURANT|RETAIL|HOSPITALITY|OTHER",
  "subtype": "QSR|FAST_CASUAL|CASUAL_DINING|etc",
  "confidence": "high|medium|low",
  "reasoning": "brief explanation"
}}"""

            # Call AWS Bedrock
            bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

            response = bedrock.invoke_model(
                modelId='us.anthropic.claude-sonnet-4-20250514-v1:0',
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 500,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                })
            )

            # Parse response
            response_body = json.loads(response['body'].read())
            response_text = response_body['content'][0]['text']

            # Extract JSON from response (Claude might wrap it in markdown)
            import re
            json_match = re.search(r'\{[^}]+\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))

                # Validate and return
                industry_str = result.get('industry', '').upper()
                subtype_str = result.get('subtype', '').upper()

                # Map to actual enum values
                try:
                    industry = Brand.Industry[industry_str]
                except KeyError:
                    logger.warning(f"Invalid industry '{industry_str}', using default")
                    industry = default_industry

                try:
                    subtype = Brand.Subtype[subtype_str]
                except KeyError:
                    logger.warning(f"Invalid subtype '{subtype_str}', using default")
                    subtype = default_subtype

                logger.info(f"AI detected industry={industry}, subtype={subtype}, confidence={result.get('confidence')}")
                return (industry, subtype)
            else:
                logger.warning("Could not parse JSON from AI response")
                return (default_industry, default_subtype)

        except Exception as e:
            logger.error(f"Error detecting industry/subtype: {e}")
            return (default_industry, default_subtype)

    def mark_converted(self, user, account=None):
        """
        Mark as converted to trial and auto-populate account with review data.

        Args:
            user: User instance who is converting
            account: Optional Account instance (if None, will create from analysis data)

        Returns:
            tuple: (brand, account, store) - The created/updated entities
        """
        if self.converted_to_trial:
            # Already converted, return existing entities
            brand = self.account
            account = brand.accounts.first() if brand else None
            store = account.stores.first() if account else None
            return (brand, account, store)

        from brands.models import Brand, Store
        from accounts.models import Account
        import re

        # Check if user already has a trial brand from a previous conversion
        # This prevents duplicate key errors when clicking conversion link multiple times
        existing_brand = None
        if hasattr(user, 'account') and user.account:
            existing_brand = user.account.brand

        if existing_brand:
            # User already converted previously, use existing brand/account/store
            brand = existing_brand
            account = user.account
            store = user.store if hasattr(user, 'store') and user.store else account.stores.first()
        else:
            # First time conversion, create new entities
            # Parse business name into brand name (remove location-specific parts)
            brand_name = self._parse_brand_name(self.business_name)

            # Create trial brand
            brand = Brand.create_trial_brand(user)
            brand.name = brand_name

            # Use AI to detect industry and subtype from business data
            industry, subtype = self._detect_industry_and_subtype()
            brand.industry = industry
            brand.subtype = subtype
            brand.save()

            # Create account for the user
            if not account:
                account = Account.objects.create(
                    name=f"{brand_name} - {user.first_name or user.username}'s Account",
                    brand=brand,
                    owner=user,
                    is_active=True
                )
                user.account = account
                user.save()

            # Parse location into city, state
            city, state = self._parse_location(self.location)

            # Create store
            store_code = self._generate_store_code(brand_name, city)
            store = Store.objects.create(
                account=account,
                brand=brand,
                name=f"{city}, {state}" if city and state else self.location or "Main Location",
                code=store_code,
                address=self.google_address or self.location or "",
                city=city or "",
                state=state or "",
                zip_code="",
                is_active=True
            )

            # Link user to store
            user.store = store
            user.save()

        # Mark as converted
        self.converted_to_trial = True
        self.converted_at = timezone.now()
        self.account = brand  # Historical field name
        self.save(update_fields=['converted_to_trial', 'converted_at', 'account'])

        # Create micro-check templates from suggestions (only if we have suggestions)
        # This allows multiple review analyses to contribute templates
        self._create_microcheck_templates(brand, user)

        # Migrate scraped reviews to integrations and link GoogleLocation to Store
        self.migrate_reviews_to_integrations(store)

        return (brand, account, store)

    def _parse_brand_name(self, business_name):
        """Parse brand name from business name, removing location suffixes"""
        import re

        if not business_name:
            return "My Restaurant"

        # Remove common location suffixes like "- City", "City Location", etc.
        patterns = [
            r'\s*-\s*[A-Z][a-z]+,?\s*[A-Z]{2}$',  # "- Independence, OH"
            r'\s*-\s*[A-Z][a-z]+$',                # "- Independence"
            r'\s+[A-Z][a-z]+,?\s*[A-Z]{2}$',      # "Independence, OH"
        ]

        clean_name = business_name
        for pattern in patterns:
            clean_name = re.sub(pattern, '', clean_name).strip()

        return clean_name or business_name

    def _parse_location(self, location_str):
        """Parse city and state from location string"""
        import re

        if not location_str:
            return (None, None)

        # Try to match "City, ST" pattern
        match = re.search(r'([A-Za-z\s]+),\s*([A-Z]{2})', location_str)
        if match:
            return (match.group(1).strip(), match.group(2))

        # Try to match just state code
        match = re.search(r'\b([A-Z]{2})\b', location_str)
        if match:
            return (None, match.group(1))

        # Fallback: use the whole string as city
        return (location_str.strip(), None)

    def _generate_store_code(self, brand_name, city):
        """Generate a unique store code"""
        import re
        import random

        # Take first 3 letters of brand, first 2 of city, plus random 3 digits
        brand_part = re.sub(r'[^A-Z]', '', brand_name.upper())[:3] or 'STR'
        city_part = re.sub(r'[^A-Z]', '', (city or '').upper())[:2] or 'XX'
        random_part = f"{random.randint(100, 999)}"

        return f"{brand_part}{city_part}{random_part}"

    def _create_microcheck_templates(self, brand, user):
        """Create micro-check templates from AI suggestions"""
        from micro_checks.models import MicroCheckTemplate
        from inspections.models import Finding
        import logging

        logger = logging.getLogger(__name__)

        if not self.micro_check_suggestions:
            logger.info("No micro-check suggestions to create templates from")
            return

        templates_created = 0

        for suggestion in self.micro_check_suggestions:
            try:
                # Map category string to Finding.Category choices
                # AI-generated categories from review analysis are mapped to valid Finding categories
                category_map = {
                    'FOOD_SAFETY': Finding.Category.FOOD_SAFETY,
                    'CLEANLINESS': Finding.Category.CLEANLINESS,
                    'SERVICE': Finding.Category.STAFF_BEHAVIOR,  # Service issues -> Staff behavior
                    'AMBIANCE': Finding.Category.CLEANLINESS,    # Ambiance often relates to cleanliness
                    'COMPLIANCE': Finding.Category.OPERATIONAL,  # Compliance -> Operational
                    'EQUIPMENT': Finding.Category.EQUIPMENT,
                    'SAFETY': Finding.Category.SAFETY,
                    'STAFF_BEHAVIOR': Finding.Category.STAFF_BEHAVIOR,
                    'OPERATIONAL': Finding.Category.OPERATIONAL,
                    'FOOD_QUALITY': Finding.Category.FOOD_QUALITY,
                    'OTHER': Finding.Category.OTHER,
                }

                category = category_map.get(
                    suggestion.get('category', 'OTHER'),
                    Finding.Category.OTHER  # Default to OTHER if category not recognized
                )

                # Map severity
                severity_map = {
                    'CRITICAL': Finding.Severity.CRITICAL,
                    'HIGH': Finding.Severity.HIGH,
                    'MEDIUM': Finding.Severity.MEDIUM,
                    'LOW': Finding.Severity.LOW,
                }

                severity = severity_map.get(
                    suggestion.get('severity', 'MEDIUM'),
                    Finding.Severity.MEDIUM
                )

                # Create template
                template = MicroCheckTemplate.objects.create(
                    brand=brand,
                    category=category,
                    severity=severity,
                    title=suggestion.get('title', 'Untitled Check'),
                    description=suggestion.get('description', suggestion.get('question', '')),
                    success_criteria=suggestion.get('success_criteria', 'Check passes inspection'),
                    source='google_reviews',
                    metadata={
                        'review_analysis_id': str(self.id),
                        'business_name': self.business_name,
                        'mentions_in_reviews': suggestion.get('mentions_in_reviews', 0),
                        'generated_from': 'ai_review_analysis',
                    },
                    include_in_rotation=True,
                    rotation_priority=70,  # Higher priority for review-based checks
                    is_active=True,
                    created_by=user,
                )

                templates_created += 1
                logger.info(f"Created micro-check template: {template.title}")

            except Exception as e:
                logger.error(f"Failed to create micro-check template: {e}")
                continue

        logger.info(f"Created {templates_created} micro-check templates from review analysis")
        return templates_created

    def migrate_reviews_to_integrations(self, store=None):
        """
        Migrate scraped reviews from JSON to GoogleReview table (unified storage).
        Called automatically when prospect converts to customer.

        Args:
            store: Optional Store instance to link the GoogleLocation to
        """
        from integrations.models import GoogleLocation, GoogleReview, GoogleReviewAnalysis as IntegrationAnalysis
        from ai_services.bedrock_service import BedrockRecommendationService
        import logging

        logger = logging.getLogger(__name__)

        if not self.account or not self.scraped_data:
            return

        # Note: self.account is actually a Brand instance (confusing naming)
        # We need to get an Account from the Brand
        brand = self.account
        account = brand.accounts.first()

        if not account:
            logger.error(f"No Account found for Brand {brand.id} during review migration")
            return

        logger.info(f"Migrating scraped reviews for {self.business_name} to account {account.id}")

        # Create or get location for this business
        business_info = self.scraped_data.get('business_info', {})
        defaults = {
            'google_location_id': f'scraped_{self.id}',  # Temporary ID until OAuth connects
            'address': business_info.get('address', self.location),
            'average_rating': business_info.get('rating'),
            'total_review_count': business_info.get('total_reviews', 0),
            'is_active': True
        }

        # Link to store if provided (OneToOne relationship)
        if store:
            defaults['store'] = store

        location, created = GoogleLocation.objects.get_or_create(
            account=account,
            google_location_name=self.business_name,
            defaults=defaults
        )

        # Migrate each scraped review to GoogleReview table
        reviews_migrated = 0
        bedrock_service = BedrockRecommendationService()

        for review_data in self.scraped_data.get('reviews', []):
            try:
                # Create Google review with source='scraped'
                review, created = GoogleReview.objects.get_or_create(
                    google_review_id=f"scraped_{self.id}_{review_data.get('author', '')}_{review_data.get('timestamp', '')}",
                    defaults={
                        'location': location,
                        'account': account,
                        'reviewer_name': review_data.get('author', 'Anonymous'),
                        'rating': review_data.get('rating', 0),
                        'review_text': review_data.get('text', ''),
                        'review_reply': '',
                        'review_created_at': timezone.now() - timezone.timedelta(days=30),  # Approximate
                        'source': 'scraped',
                        'is_verified': False,
                        'needs_analysis': True
                    }
                )

                if created:
                    reviews_migrated += 1

                    # Run AI analysis if we have review text
                    if review.review_text:
                        try:
                            analysis_result = bedrock_service.analyze_review(
                                review_text=review.review_text,
                                rating=review.rating
                            )

                            IntegrationAnalysis.objects.create(
                                review=review,
                                topics=analysis_result['topics'],
                                sentiment_score=analysis_result['sentiment_score'],
                                actionable_issues=analysis_result['actionable_issues'],
                                suggested_category=analysis_result['suggested_category'],
                                confidence=analysis_result.get('confidence', 0.5),
                                model_used='bedrock' if bedrock_service.enabled else 'fallback'
                            )

                            review.needs_analysis = False
                            review.analyzed_at = timezone.now()
                            review.save()
                        except Exception as e:
                            logger.error(f"Failed to analyze migrated review: {e}")

            except Exception as e:
                logger.error(f"Failed to migrate review: {e}")
                continue

        logger.info(f"Migrated {reviews_migrated} scraped reviews to GoogleReview table")
        return reviews_migrated

    @property
    def is_processing(self):
        return self.status in [self.Status.PENDING, self.Status.PROCESSING]

    @property
    def key_issues(self):
        """Extract top 3 issues from insights"""
        if not self.insights or not self.insights.get('operational_themes'):
            return []

        themes = self.insights['operational_themes']
        sorted_themes = sorted(
            [(name, data) for name, data in themes.items() if data.get('count', 0) > 0],
            key=lambda x: x[1]['count'],
            reverse=True
        )

        return [
            {
                'theme': name.replace('_', ' ').title(),
                'mentions': data['count'],
                'examples': data.get('examples', [])[:1]
            }
            for name, data in sorted_themes[:3]
        ]

    @property
    def sentiment_summary(self):
        """Get sentiment breakdown"""
        if not self.insights:
            return None

        rating_dist = self.insights.get('rating_distribution', {})
        total = sum(rating_dist.values())

        if total == 0:
            return None

        positive = sum(rating_dist.get(str(i), 0) for i in [4, 5])
        negative = sum(rating_dist.get(str(i), 0) for i in [1, 2])
        neutral = rating_dist.get('3', 0)

        return {
            'positive_percentage': round(positive / total * 100, 1),
            'negative_percentage': round(negative / total * 100, 1),
            'neutral_percentage': round(neutral / total * 100, 1),
            'positive_count': positive,
            'negative_count': negative,
            'neutral_count': neutral,
            'total': total
        }

    @property
    def review_timeframe(self):
        """Get human-readable timeframe of reviews"""
        if not self.oldest_review_date or not self.newest_review_date:
            return None

        from django.utils import timezone
        from datetime import timedelta

        # Calculate age of oldest review
        now = timezone.now()
        oldest_age = now - self.oldest_review_date
        newest_age = now - self.newest_review_date

        # Determine timeframe description
        if oldest_age.days < 7:
            return "Last week"
        elif oldest_age.days < 31:
            return "Last month"
        elif oldest_age.days < 90:
            weeks = oldest_age.days // 7
            return f"Last {weeks} weeks"
        elif oldest_age.days < 365:
            months = oldest_age.days // 30
            return f"Last {months} months"
        elif oldest_age.days < 730:
            return "Last year"
        else:
            years = oldest_age.days // 365
            return f"Last {years} years"


class StoreInsightsState(models.Model):
    """
    Store-level insights and unlock state for 360° operational intelligence.
    Tracks progressive unlock of Customer, Employee, and Operational voices.
    """
    store = models.OneToOneField(
        'brands.Store',
        on_delete=models.CASCADE,
        related_name='insights_state',
        help_text='Store this insights state belongs to'
    )

    # Progressive unlock tracking
    pulse_surveys_completed = models.IntegerField(
        default=0,
        help_text='Number of employee pulse surveys completed (unlock at 5)'
    )

    voices_active = models.JSONField(
        default=dict,
        help_text='Active status of each voice: {customer: bool, employee: bool, operational: bool}'
    )

    # Timestamps
    insights_unlocked_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When insights were first unlocked for this store'
    )
    last_updated = models.DateTimeField(
        auto_now=True,
        help_text='Last time insights state was updated'
    )

    # Historical data for trend calculation
    previous_health_score = models.IntegerField(
        default=0,
        help_text='Previous health score for delta calculation'
    )

    class Meta:
        db_table = 'store_insights_state'
        verbose_name = 'Store Insights State'
        verbose_name_plural = 'Store Insights States'

    def __str__(self):
        return f"Insights State for {self.store.name}"

    @property
    def employee_voice_unlocked(self):
        """Returns True if employee voice is unlocked (5+ pulse surveys)"""
        return self.pulse_surveys_completed >= 5

    @property
    def cross_voice_unlocked(self):
        """
        Returns True if cross-voice trends are unlocked.
        Requires all 3 voices active in last 14 days.
        """
        # Check if all voices are active
        customer_active = self.voices_active.get('customer', False)
        employee_active = self.voices_active.get('employee', False)
        operational_active = self.voices_active.get('operational', False)

        all_active = customer_active and employee_active and operational_active

        # Check recency (updated within 14 days)
        from datetime import timedelta
        recent = (timezone.now() - self.last_updated).days <= 14

        return all_active and recent

    @property
    def store_health_score(self):
        """
        Compute store health score: weighted average of 3 voices.
        Returns: {"score": 84, "delta": 6}
        """
        from statistics import mean

        # Initialize scores
        review_score = 0
        check_score = 0
        pulse_score = 0

        # 1. Customer Voice: Review Rating (normalize 1-5 → 0-100)
        if hasattr(self.store, 'google_location') and self.store.google_location:
            rating = self.store.google_location.average_rating
            if rating:
                review_score = (float(rating) - 1) * 25  # 1→0, 5→100

        # 2. Operational Voice: Micro-Check Completion (0-100)
        from micro_checks.models import MicroCheckRun
        completed_runs = MicroCheckRun.objects.filter(
            store=self.store,
            completed_at__isnull=False
        ).count()
        total_runs = MicroCheckRun.objects.filter(
            store=self.store
        ).count()

        if total_runs > 0:
            check_score = (completed_runs / total_runs) * 100

        # 3. Employee Voice: Pulse Engagement (0-100, backfill with brand avg if locked)
        if self.employee_voice_unlocked:
            # TODO: Calculate from actual pulse survey data when implemented
            pulse_score = 75  # Placeholder
        else:
            # Backfill with brand average or default
            # TODO: Calculate brand.avg_pulse_engagement when pulse surveys exist
            pulse_score = 0  # Don't penalize if not unlocked yet

        # Weighted average: 40% reviews + 40% checks + 20% pulse
        weights = [0.4, 0.4, 0.2] if self.employee_voice_unlocked else [0.5, 0.5, 0.0]
        scores = [review_score, check_score, pulse_score] if self.employee_voice_unlocked else [review_score, check_score]

        current_score = sum(s * w for s, w in zip(scores, weights))

        # Calculate delta from previous
        delta = round(current_score - self.previous_health_score)

        return {
            "score": round(current_score),
            "delta": delta
        }

    def update_voices_active(self):
        """Update voices_active based on current data availability"""
        # Customer voice: Always active if store has Google location
        customer_active = hasattr(self.store, 'google_location') and self.store.google_location is not None

        # Employee voice: Active if unlocked
        employee_active = self.employee_voice_unlocked

        # Operational voice: Always active (micro-checks are core feature)
        operational_active = True

        self.voices_active = {
            'customer': customer_active,
            'employee': employee_active,
            'operational': operational_active
        }
        self.save()
