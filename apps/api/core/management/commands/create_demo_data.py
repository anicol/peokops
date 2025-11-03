import random
import json
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from brands.models import Brand, Store
from uploads.models import Upload, Rule, Detection
from videos.models import Video, VideoFrame
from inspections.models import Inspection, Finding, ActionItem
from accounts.models import User

User = get_user_model()


class Command(BaseCommand):
    help = 'Create comprehensive demo data for VerityInspect platform'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset all demo data before creating new data',
        )
        parser.add_argument(
            '--minimal',
            action='store_true', 
            help='Create minimal demo data set',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('🗑️  Resetting demo data...')
            self.reset_demo_data()
        else:
            # Check if demo data already exists (idempotency)
            if self.demo_data_exists():
                self.stdout.write(
                    self.style.WARNING('⚠️  Demo data already exists. Use --reset to recreate.')
                )
                return

        if options['minimal']:
            self.stdout.write('📊 Creating minimal demo data...')
            self.create_minimal_demo()
        else:
            self.stdout.write('🎭 Creating comprehensive demo data...')
            self.create_comprehensive_demo()

        self.stdout.write(
            self.style.SUCCESS('✅ Demo data creation completed successfully!')
        )

    def demo_data_exists(self):
        """Check if demo data already exists to prevent duplicate creation"""
        # Check if any brands exist (primary indicator)
        if Brand.objects.exists():
            return True
        # Check if any demo users exist
        if User.objects.filter(email__in=['admin@demo.com', 'manager@demo.com', 'inspector@demo.com']).exists():
            return True
        return False

    def reset_demo_data(self):
        """Reset all demo data"""
        ActionItem.objects.all().delete()
        Detection.objects.all().delete()
        Finding.objects.all().delete()
        Inspection.objects.all().delete()
        VideoFrame.objects.all().delete()
        Video.objects.all().delete()
        Upload.objects.all().delete()
        Rule.objects.all().delete()
        Store.objects.all().delete()
        Brand.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    def create_minimal_demo(self):
        """Create minimal demo data for basic testing"""
        # Create brands and stores
        brands_data = [
            {
                'name': 'FastBite',
                'description': 'Quick service restaurant chain',
                'stores': [
                    {'name': 'FastBite Downtown', 'address': '123 Main St'},
                    {'name': 'FastBite Mall', 'address': '456 Shopping Center Blvd'},
                ]
            }
        ]
        
        for brand_data in brands_data:
            brand = self.create_brand(brand_data)
            self.create_demo_users(brand)
            self.create_basic_rules(brand)

    def create_comprehensive_demo(self):
        """Create comprehensive demo data with realistic scenarios"""
        # Multiple restaurant brands with different characteristics
        brands_data = [
            {
                'name': 'FastBite',
                'description': 'Quick service restaurant chain specializing in burgers and fries',
                'industry_type': 'QSR',
                'inspection_config': {
                    'ppe_required': True,
                    'safety_checks': ['fire_extinguisher', 'exit_signs', 'first_aid'],
                    'cleanliness_standards': ['spill_free', 'sanitized_surfaces', 'organized_storage']
                },
                'stores': [
                    {'name': 'FastBite Downtown', 'address': '123 Main St, Downtown', 'priority': 'high'},
                    {'name': 'FastBite Mall', 'address': '456 Shopping Center Blvd', 'priority': 'medium'},
                    {'name': 'FastBite Airport', 'address': '789 Airport Terminal', 'priority': 'high'},
                    {'name': 'FastBite Suburbs', 'address': '321 Residential Ave', 'priority': 'low'},
                ]
            },
            {
                'name': 'Healthy Harvest',
                'description': 'Farm-to-table healthy dining restaurant chain',
                'industry_type': 'Casual Dining',
                'inspection_config': {
                    'ppe_required': True,
                    'safety_checks': ['food_temperature', 'allergen_control', 'hygiene'],
                    'cleanliness_standards': ['organic_compliance', 'fresh_ingredients', 'clean_prep_areas']
                },
                'stores': [
                    {'name': 'Healthy Harvest Midtown', 'address': '555 Health St', 'priority': 'medium'},
                    {'name': 'Healthy Harvest University', 'address': '777 Campus Dr', 'priority': 'high'},
                ]
            },
            {
                'name': 'Pizza Palace',
                'description': 'Traditional Italian pizza restaurant',
                'industry_type': 'Casual Dining',
                'inspection_config': {
                    'ppe_required': True,
                    'safety_checks': ['oven_safety', 'burn_prevention', 'knife_handling'],
                    'cleanliness_standards': ['dough_hygiene', 'cheese_storage', 'tomato_freshness']
                },
                'stores': [
                    {'name': 'Pizza Palace Central', 'address': '999 Italian Way', 'priority': 'medium'},
                ]
            }
        ]

        brands = []
        for brand_data in brands_data:
            brand = self.create_brand(brand_data)
            brands.append(brand)
            self.create_demo_users(brand)
            self.create_comprehensive_rules(brand)

        # Create demo videos and inspections
        self.create_demo_videos_and_inspections(brands)
        
        # Create demo uploads
        self.create_demo_uploads(brands)
        
        self.stdout.write('📈 Created comprehensive demo environment with:')
        self.stdout.write(f'   • {Brand.objects.count()} brands')
        self.stdout.write(f'   • {Store.objects.count()} stores') 
        self.stdout.write(f'   • {User.objects.count()} users')
        self.stdout.write(f'   • {Rule.objects.count()} inspection rules')
        self.stdout.write(f'   • {Video.objects.count()} demo videos')
        self.stdout.write(f'   • {Inspection.objects.count()} inspections')
        self.stdout.write(f'   • {Upload.objects.count()} uploads')

    def create_brand(self, brand_data):
        """Create brand and associated stores"""
        brand, created = Brand.objects.get_or_create(
            name=brand_data['name'],
            defaults={
                'description': brand_data['description'],
                'inspection_config': brand_data.get('inspection_config', {})
            }
        )
        
        if created:
            self.stdout.write(f'Created brand: {brand.name}')
        
        # Create stores
        for store_data in brand_data.get('stores', []):
            store, created = Store.objects.get_or_create(
                name=store_data['name'],
                brand=brand,
                defaults={
                    'address': store_data['address'],
                    'is_active': True,
                    'metadata': {
                        'priority': store_data.get('priority', 'medium'),
                        'demo_store': True
                    }
                }
            )
            
            if created:
                self.stdout.write(f'Created store: {store.name}')
        
        return brand

    def create_demo_users(self, brand):
        """Create demo users for a brand"""
        stores = list(brand.stores.all())
        
        users_data = [
            {
                'username': f'admin_{brand.name.lower().replace(" ", "_")}',
                'email': f'admin@{brand.name.lower().replace(" ", "")}.com',
                'first_name': 'Admin',
                'last_name': brand.name,
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': False,
                'store': stores[0] if stores else None
            },
            {
                'username': f'manager_{brand.name.lower().replace(" ", "_")}',
                'email': f'manager@{brand.name.lower().replace(" ", "")}.com',
                'first_name': 'Manager',
                'last_name': brand.name,
                'role': 'GM',
                'is_staff': False,
                'is_superuser': False,
                'store': stores[0] if stores else None
            },
            {
                'username': f'inspector_{brand.name.lower().replace(" ", "_")}',
                'email': f'inspector@{brand.name.lower().replace(" ", "")}.com',
                'first_name': 'Inspector',
                'last_name': brand.name,
                'role': 'INSPECTOR',
                'is_staff': False,
                'is_superuser': False,
                'store': stores[0] if stores else None
            }
        ]

        # Add additional users for larger brands
        if len(stores) > 2:
            for i, store in enumerate(stores[1:3], 1):
                users_data.extend([
                    {
                        'username': f'manager_{brand.name.lower().replace(" ", "_")}_{i+1}',
                        'email': f'manager{i+1}@{brand.name.lower().replace(" ", "")}.com',
                        'first_name': f'Manager{i+1}',
                        'last_name': brand.name,
                        'role': 'GM',
                        'store': store
                    },
                    {
                        'username': f'inspector_{brand.name.lower().replace(" ", "_")}_{i+1}',
                        'email': f'inspector{i+1}@{brand.name.lower().replace(" ", "")}.com',
                        'first_name': f'Inspector{i+1}',
                        'last_name': brand.name,
                        'role': 'INSPECTOR',
                        'store': store
                    }
                ])

        for user_data in users_data:
            username = user_data['username']
            if not User.objects.filter(username=username).exists():
                User.objects.create_user(
                    password='demo123',
                    **user_data
                )

    def create_basic_rules(self, brand):
        """Create basic inspection rules"""
        rules_data = [
            {
                'name': 'PPE Compliance',
                'description': 'Check that all staff are wearing required personal protective equipment',
                'rule_type': 'PPE',
                'category': 'safety',
                'is_active': True
            },
            {
                'name': 'Hand Washing',
                'description': 'Verify proper hand washing procedures are followed',
                'rule_type': 'CLEANLINESS',
                'category': 'hygiene',
                'is_active': True
            }
        ]
        
        for rule_data in rules_data:
            Rule.objects.get_or_create(
                brand=brand,
                name=rule_data['name'],
                defaults=rule_data
            )

    def create_comprehensive_rules(self, brand):
        """Create comprehensive inspection rules based on brand type"""
        base_rules = [
            {
                'name': 'Personal Protective Equipment',
                'description': 'All staff must wear appropriate PPE including hair nets, gloves, and aprons',
                'rule_type': 'PPE',
                'category': 'safety',
                'severity': 'HIGH',
                'points_deducted': 10,
                'is_active': True
            },
            {
                'name': 'Hand Washing Compliance',
                'description': 'Staff must wash hands properly before handling food',
                'rule_type': 'CLEANLINESS',
                'category': 'hygiene',
                'severity': 'HIGH',
                'points_deducted': 8,
                'is_active': True
            },
            {
                'name': 'Food Temperature Control',
                'description': 'All food items must be stored at proper temperatures',
                'rule_type': 'SAFETY',
                'category': 'food_safety',
                'severity': 'CRITICAL',
                'points_deducted': 15,
                'is_active': True
            },
            {
                'name': 'Clean Work Surfaces',
                'description': 'All work surfaces must be clean and sanitized',
                'rule_type': 'CLEANLINESS',
                'category': 'sanitation',
                'severity': 'MEDIUM',
                'points_deducted': 5,
                'is_active': True
            },
            {
                'name': 'Proper Uniform',
                'description': 'Staff must wear clean, appropriate uniforms',
                'rule_type': 'TRAINING',
                'category': 'presentation',
                'severity': 'LOW',
                'points_deducted': 3,
                'is_active': True
            }
        ]

        # Add brand-specific rules
        if 'Healthy' in brand.name:
            base_rules.extend([
                {
                    'name': 'Organic Ingredient Verification',
                    'description': 'Verify that organic ingredients are properly labeled and stored',
                    'rule_type': 'PROCESS',
                    'category': 'quality',
                    'severity': 'MEDIUM',
                    'points_deducted': 6,
                    'is_active': True
                },
                {
                    'name': 'Allergen Control',
                    'description': 'Proper allergen control and cross-contamination prevention',
                    'rule_type': 'SAFETY',
                    'category': 'allergens',
                    'severity': 'CRITICAL',
                    'points_deducted': 12,
                    'is_active': True
                }
            ])
        elif 'Pizza' in brand.name:
            base_rules.extend([
                {
                    'name': 'Oven Safety Protocol',
                    'description': 'Proper use of pizza ovens and burn prevention',
                    'rule_type': 'SAFETY',
                    'category': 'equipment',
                    'severity': 'HIGH',
                    'points_deducted': 10,
                    'is_active': True
                },
                {
                    'name': 'Dough Preparation Hygiene',
                    'description': 'Hygienic dough preparation and storage',
                    'rule_type': 'CLEANLINESS',
                    'category': 'food_prep',
                    'severity': 'MEDIUM',
                    'points_deducted': 7,
                    'is_active': True
                }
            ])

        for rule_data in base_rules:
            Rule.objects.get_or_create(
                brand=brand,
                name=rule_data['name'],
                defaults=rule_data
            )

    def create_demo_videos_and_inspections(self, brands):
        """Create demo videos and associated inspections"""
        video_scenarios = [
            {
                'title': 'Morning Kitchen Prep - Week 1',
                'description': 'Morning preparation routine including hand washing and equipment setup',
                'mode': 'inspection',
                'duration': 180,
                'compliance_score': 85
            },
            {
                'title': 'Lunch Rush Service',
                'description': 'Peak service time with multiple staff members',
                'mode': 'inspection', 
                'duration': 240,
                'compliance_score': 78
            },
            {
                'title': 'End of Day Cleaning',
                'description': 'Closing procedures and sanitation protocols',
                'mode': 'coaching',
                'duration': 300,
                'compliance_score': 92
            },
            {
                'title': 'New Staff Training Session',
                'description': 'Training new employee on safety procedures',
                'mode': 'coaching',
                'duration': 420,
                'compliance_score': 65
            },
            {
                'title': 'Health Inspector Simulation',
                'description': 'Practice run before official health inspection',
                'mode': 'inspection',
                'duration': 360,
                'compliance_score': 95
            }
        ]

        for brand in brands:
            stores = list(brand.stores.all())
            for i, scenario in enumerate(video_scenarios):
                store = random.choice(stores)
                
                # Create video (always COMPLETED - no PROCESSING to avoid triggering celery tasks)
                video = Video.objects.create(
                    title=f"{scenario['title']} - {store.name}",
                    description=scenario['description'],
                    store=store,
                    duration=scenario['duration'],
                    status='COMPLETED',
                    metadata={
                        'demo_video': True,
                        'scenario': scenario['title'],
                        'quality': 'HD'
                    },
                    created_at=timezone.now() - timedelta(days=random.randint(1, 30))
                )

                # Create inspection if video is completed
                if video.status == 'COMPLETED':
                    inspection = Inspection.objects.create(
                        video=video,
                        mode=scenario['mode'],
                        score=scenario['compliance_score'],
                        status='COMPLETED',
                        created_at=video.created_at + timedelta(minutes=5),
                        metadata={
                            'demo_inspection': True,
                            'auto_generated': True
                        }
                    )

                    # Create findings and detections
                    self.create_demo_findings(inspection, brand)

    def create_demo_findings(self, inspection, brand):
        """Create realistic findings for an inspection"""
        rules = list(Rule.objects.filter(brand=brand, is_active=True))
        
        # Create 1-4 findings per inspection
        num_findings = random.randint(1, 4)
        
        for _ in range(num_findings):
            rule = random.choice(rules)
            
            # Higher chance of findings for lower scored inspections
            if random.random() < (100 - inspection.score) / 100:
                severity_choices = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
                severity = random.choice(severity_choices)
                
                finding = Finding.objects.create(
                    inspection=inspection,
                    rule=rule,
                    severity=severity,
                    description=f"Issue found with {rule.name.lower()}",
                    is_resolved=random.choice([True, False, False]),  # 33% resolved
                    metadata={
                        'demo_finding': True,
                        'confidence': random.uniform(0.7, 0.95)
                    }
                )

                # Create action items for unresolved findings
                if not finding.is_resolved and severity in ['HIGH', 'CRITICAL']:
                    ActionItem.objects.create(
                        finding=finding,
                        title=f"Address {rule.name} Violation",
                        description=f"Resolve the {severity.lower()} priority issue with {rule.name.lower()}",
                        priority=severity,
                        status='OPEN',
                        due_date=timezone.now() + timedelta(days=random.randint(3, 14)),
                        assigned_to=random.choice(User.objects.filter(role__in=['GM', 'INSPECTOR']))
                    )

    def create_demo_uploads(self, brands):
        """Create demo upload records"""
        upload_scenarios = [
            {
                'filename': 'kitchen_morning_prep.mp4',
                'mode': 'inspection',
                'status': 'COMPLETE'
            },
            {
                'filename': 'staff_training_session.mov',
                'mode': 'coaching',
                'status': 'COMPLETE'
            },
            {
                'filename': 'evening_cleanup_routine.mp4',
                'mode': 'inspection',
                'status': 'COMPLETE'
            },
            {
                'filename': 'new_employee_orientation.mp4',
                'mode': 'coaching',
                'status': 'COMPLETE'
            }
        ]

        for brand in brands:
            stores = list(brand.stores.all())
            users = list(User.objects.filter(store__brand=brand))
            
            for scenario in upload_scenarios:
                store = random.choice(stores)
                user = random.choice(users) if users else None
                
                Upload.objects.create(
                    store=store,
                    mode=scenario['mode'],
                    s3_key=f"uploads/{scenario['mode']}/{timezone.now().strftime('%Y/%m/%d')}/{scenario['filename']}",
                    status=scenario['status'],
                    original_filename=scenario['filename'],
                    file_type='video/mp4',
                    created_by=user,
                    created_at=timezone.now() - timedelta(days=random.randint(1, 7)),
                    metadata={
                        'demo_upload': True,
                        'file_size': random.randint(50_000_000, 200_000_000)  # 50-200MB
                    }
                )