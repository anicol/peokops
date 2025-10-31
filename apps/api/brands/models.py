from django.db import models


class Brand(models.Model):
    class Industry(models.TextChoices):
        RESTAURANT = 'RESTAURANT', 'Restaurant'
        RETAIL = 'RETAIL', 'Retail'
        HOSPITALITY = 'HOSPITALITY', 'Hospitality'
        OTHER = 'OTHER', 'Other'

    class Subtype(models.TextChoices):
        # Restaurant subtypes
        QSR = 'QSR', 'Quick Service / Fast Food'
        FAST_CASUAL = 'FAST_CASUAL', 'Fast Casual'
        CASUAL_DINING = 'CASUAL_DINING', 'Casual Dining'
        FINE_DINING = 'FINE_DINING', 'Fine Dining'
        CAFE = 'CAFE', 'Cafe / Coffee Shop'
        BAR_PUB = 'BAR_PUB', 'Bar / Pub'
        FOOD_TRUCK = 'FOOD_TRUCK', 'Food Truck'
        CATERING = 'CATERING', 'Catering'
        BAKERY = 'BAKERY', 'Bakery / Dessert Shop'
        # Retail subtypes (for future)
        GROCERY = 'GROCERY', 'Grocery Store'
        CONVENIENCE = 'CONVENIENCE', 'Convenience Store'
        FASHION = 'FASHION', 'Fashion Retail'
        # Hospitality subtypes (for future)
        HOTEL = 'HOTEL', 'Hotel'
        # Generic
        OTHER_SUBTYPE = 'OTHER_SUBTYPE', 'Other'

    name = models.CharField(max_length=100, unique=True)
    logo = models.ImageField(upload_to='brands/logos/', blank=True, null=True)
    description = models.TextField(blank=True)
    retention_days_inspection = models.IntegerField(default=365, help_text="Retention period for inspection mode in days")
    retention_days_coaching = models.IntegerField(default=7, help_text="Retention period for coaching mode in days")
    webhook_url = models.URLField(blank=True, null=True, help_text="URL for webhook notifications")
    inspection_config = models.JSONField(default=dict, help_text="Configuration for inspection criteria")
    is_active = models.BooleanField(default=True)

    # Enterprise features
    has_enterprise_access = models.BooleanField(default=False, help_text="Has access to inspector-led enterprise workflow")

    # Trial functionality
    is_trial = models.BooleanField(default=False, help_text="Is this a trial brand")
    trial_created_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE, null=True, blank=True,
                                       related_name='trial_brands_created')

    # Onboarding and profiling
    industry = models.CharField(max_length=50, choices=Industry.choices, blank=True, null=True, help_text="Primary industry vertical")
    subtype = models.CharField(max_length=50, choices=Subtype.choices, blank=True, null=True, help_text="Industry subtype (e.g., QSR, Fine Dining for restaurants)")
    store_count_range = models.CharField(max_length=50, blank=True, null=True, help_text="Number of locations (flexible format for industry-specific ranges)")
    focus_areas = models.JSONField(default=list, blank=True, help_text="Array of operational focus areas (food_safety, cleanliness, etc)")
    onboarding_completed_at = models.DateTimeField(null=True, blank=True, help_text="When brand profile was completed")

    # Brand consolidation support
    consolidated_into = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                         related_name='consolidated_brands',
                                         help_text="If this trial brand was consolidated into an enterprise brand")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @classmethod
    def create_trial_brand(cls, user):
        """Create a trial brand with smart defaults and seeded Micro-Check templates"""
        brand = cls.objects.create(
            name=f"{user.first_name or user.username}'s Trial",
            is_trial=True,
            trial_created_by=user,
            retention_days_coaching=7,  # Trial gets 7-day retention
            inspection_config=cls.get_default_trial_config()
        )

        # Auto-seed default Micro-Check templates for immediate use
        from micro_checks.utils import seed_default_templates
        seed_default_templates(brand, created_by=user)

        return brand
    
    @staticmethod
    def get_default_trial_config():
        """Get default inspection configuration for trial users"""
        return {
            "ppe": {
                "enabled": True,
                "items": ["hair_nets", "gloves", "aprons", "safety_shoes"],
                "required_areas": ["kitchen", "food_prep"]
            },
            "safety": {
                "enabled": True,
                "items": ["wet_floor_signs", "first_aid_kit", "fire_extinguisher"],
                "critical": True
            },
            "cleanliness": {
                "enabled": True,
                "areas": ["floors", "surfaces", "equipment", "storage"],
                "scoring_weight": 30
            },
            "signage": {
                "enabled": True,
                "required": ["handwashing", "temperature_logs", "allergen_warnings"],
                "scoring_weight": 15
            },
            "demo_mode": True  # Enable consistent demo results
        }

    class Meta:
        db_table = 'brands'
        ordering = ['name']

    def __str__(self):
        return self.name


class Store(models.Model):
    class StoreSegment(models.TextChoices):
        LOW_VOL = 'low_vol', 'Low Volume'
        MED_VOL = 'med_vol', 'Medium Volume'
        HIGH_VOL = 'high_vol', 'High Volume'

    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE, null=True, blank=True,
                                related_name='stores', help_text="Franchisee account that operates this store")
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='stores',
                             help_text="Parent brand (for reporting and brand-level templates)")
    name = models.CharField(max_length=100)
    region = models.CharField(max_length=100, blank=True, help_text="Geographic region or district")
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField()
    city = models.CharField(max_length=50)
    state = models.CharField(max_length=50)
    zip_code = models.CharField(max_length=10)
    phone = models.CharField(max_length=20, blank=True)
    manager_email = models.EmailField(blank=True)
    timezone = models.CharField(max_length=50, default='America/New_York')
    segment = models.CharField(
        max_length=20,
        choices=StoreSegment.choices,
        null=True,
        blank=True,
        db_index=True,
        help_text="Store segment for ML model grouping (low/med/high volume)"
    )
    is_active = models.BooleanField(default=True)

    # Micro-check scheduling
    micro_check_send_time = models.TimeField(
        default='08:00:00',
        help_text="Local time to send daily micro-check emails (in store's timezone)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stores'
        ordering = ['brand__name', 'name']

    def __str__(self):
        return f"{self.brand.name} - {self.name} ({self.code})"