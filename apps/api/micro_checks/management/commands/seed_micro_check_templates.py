from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from micro_checks.models import MicroCheckTemplate
from inspections.models import Finding

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed micro-check templates with default checks for all categories'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing templates before seeding',
        )

    def handle(self, *args, **options):
        # Get or create a system user for template creation
        system_user, _ = User.objects.get_or_create(
            email='system@getpeakops.com',
            defaults={
                'first_name': 'System',
                'last_name': 'User',
                'role': 'ADMIN'
            }
        )

        if options['clear']:
            self.stdout.write('Clearing existing templates...')
            MicroCheckTemplate.objects.all().delete()

        self.stdout.write('Seeding micro-check templates...')

        templates_data = [
            # PPE (Personal Protective Equipment)
            {
                'category': 'PPE',
                'severity': 'CRITICAL',
                'title': 'Hair Restraints in Kitchen',
                'description': 'Check that all kitchen staff are wearing proper hair restraints (hats, hairnets, or caps)',
                'guidance': 'All hair should be completely covered while working with food. Look for any loose hair or improper coverage.',
                'pass_criteria': 'All visible kitchen staff wearing proper hair restraints with no hair exposed',
                'fail_criteria': 'Any staff member without hair restraint or with exposed hair',
                'photo_guidance': 'Capture a wide shot showing all staff members in the kitchen area'
            },
            {
                'category': 'PPE',
                'severity': 'HIGH',
                'title': 'Glove Usage During Food Prep',
                'description': 'Verify staff are wearing gloves when handling ready-to-eat food',
                'guidance': 'Check food prep areas for proper glove usage. Staff should change gloves between tasks.',
                'pass_criteria': 'All staff handling ready-to-eat food are wearing clean gloves',
                'fail_criteria': 'Staff touching ready-to-eat food without gloves or with visibly soiled gloves',
                'photo_guidance': 'Photo of staff member handling food, showing glove usage'
            },
            {
                'category': 'PPE',
                'severity': 'MEDIUM',
                'title': 'Proper Uniform and Apron',
                'description': 'Check that staff are wearing clean uniforms and aprons',
                'guidance': 'Uniforms should be clean with no visible stains or damage',
                'pass_criteria': 'All staff in clean, proper uniforms',
                'fail_criteria': 'Staff in stained, damaged, or improper attire',
                'photo_guidance': 'Full body shot of kitchen staff showing uniform condition'
            },

            # SAFETY
            {
                'category': 'SAFETY',
                'severity': 'CRITICAL',
                'title': 'Wet Floor Hazards',
                'description': 'Check kitchen floors for water, grease, or other slip hazards',
                'guidance': 'Walk through all kitchen areas looking for wet spots, spills, or slippery surfaces',
                'pass_criteria': 'All floors dry and clean with no slip hazards',
                'fail_criteria': 'Any wet spots, spills, or slippery surfaces without warning signs',
                'photo_guidance': 'Photo of any problem areas found, or general floor condition'
            },
            {
                'category': 'SAFETY',
                'severity': 'HIGH',
                'title': 'Fire Extinguisher Access',
                'description': 'Verify fire extinguishers are accessible and not blocked',
                'guidance': 'Check that paths to fire extinguishers are clear and units are visible',
                'pass_criteria': 'All fire extinguishers easily accessible with clear signage',
                'fail_criteria': 'Any fire extinguisher blocked or difficult to access',
                'photo_guidance': 'Photo showing fire extinguisher and surrounding area'
            },
            {
                'category': 'SAFETY',
                'severity': 'HIGH',
                'title': 'Electrical Cord Safety',
                'description': 'Check for damaged cords or improper electrical equipment usage',
                'guidance': 'Look for frayed cords, overloaded outlets, or cords in wet areas',
                'pass_criteria': 'All electrical equipment properly maintained with no hazards',
                'fail_criteria': 'Damaged cords, overloaded outlets, or cords near water',
                'photo_guidance': 'Photo of any damaged equipment or unsafe electrical setup'
            },

            # CLEANLINESS
            {
                'category': 'CLEANLINESS',
                'severity': 'CRITICAL',
                'title': 'Food Contact Surface Sanitation',
                'description': 'Check cleanliness of cutting boards, prep tables, and food contact surfaces',
                'guidance': 'Surfaces should be clean with no visible food debris or residue',
                'pass_criteria': 'All food contact surfaces clean and sanitized',
                'fail_criteria': 'Any food contact surface with visible debris or residue',
                'photo_guidance': 'Close-up of prep surfaces showing cleanliness'
            },
            {
                'category': 'CLEANLINESS',
                'severity': 'HIGH',
                'title': 'Handwashing Station Compliance',
                'description': 'Verify handwashing stations are stocked and functional',
                'guidance': 'Check for soap, paper towels, and hot water at all handwashing stations',
                'pass_criteria': 'All stations stocked with soap, towels, and hot water available',
                'fail_criteria': 'Any station missing supplies or without hot water',
                'photo_guidance': 'Photo of handwashing station showing supplies'
            },
            {
                'category': 'CLEANLINESS',
                'severity': 'MEDIUM',
                'title': 'Floor and Drain Cleanliness',
                'description': 'Check floor drains for cleanliness and proper drainage',
                'guidance': 'Drains should be free of debris and odor-free',
                'pass_criteria': 'All drains clean and draining properly',
                'fail_criteria': 'Clogged drains, debris buildup, or foul odors',
                'photo_guidance': 'Photo of drain area showing condition'
            },

            # FOOD_HANDLING
            {
                'category': 'FOOD_HANDLING',
                'severity': 'CRITICAL',
                'title': 'Proper Food Temperature Control',
                'description': 'Check that hot foods are held at 135°F+ and cold foods at 41°F or below',
                'guidance': 'Use thermometer to verify temperatures of food in holding equipment',
                'pass_criteria': 'All hot foods 135°F+, all cold foods 41°F or below',
                'fail_criteria': 'Any food in temperature danger zone (42°F - 134°F)',
                'photo_guidance': 'Photo of thermometer reading with food item visible'
            },
            {
                'category': 'FOOD_HANDLING',
                'severity': 'CRITICAL',
                'title': 'Raw and Cooked Food Separation',
                'description': 'Verify raw and cooked foods are properly separated in storage',
                'guidance': 'Raw meats should be stored below ready-to-eat foods in coolers',
                'pass_criteria': 'Proper separation maintained, raw items on lower shelves',
                'fail_criteria': 'Raw foods stored above ready-to-eat items or in contact',
                'photo_guidance': 'Photo inside cooler showing food storage arrangement'
            },
            {
                'category': 'FOOD_HANDLING',
                'severity': 'HIGH',
                'title': 'Date Marking Compliance',
                'description': 'Check that prepared foods are properly dated',
                'guidance': 'All prepped items should have clear date labels',
                'pass_criteria': 'All prepared foods have clear, legible date marks',
                'fail_criteria': 'Any prepared food without date marking or illegible dates',
                'photo_guidance': 'Photo showing date labels on food containers'
            },

            # EQUIPMENT
            {
                'category': 'EQUIPMENT',
                'severity': 'HIGH',
                'title': 'Refrigeration Equipment Temperature',
                'description': 'Check that all coolers and freezers are maintaining proper temperatures',
                'guidance': 'Coolers should be 41°F or below, freezers 0°F or below',
                'pass_criteria': 'All refrigeration units at proper temperatures',
                'fail_criteria': 'Any unit above safe temperature',
                'photo_guidance': 'Photo of temperature display or thermometer reading'
            },
            {
                'category': 'EQUIPMENT',
                'severity': 'MEDIUM',
                'title': 'Equipment Cleanliness',
                'description': 'Check that cooking equipment is clean and well-maintained',
                'guidance': 'Look for grease buildup, food debris, or signs of poor maintenance',
                'pass_criteria': 'All equipment clean with no excessive buildup',
                'fail_criteria': 'Heavy grease, food debris, or equipment in poor condition',
                'photo_guidance': 'Photo of cooking equipment showing cleanliness'
            },
            {
                'category': 'EQUIPMENT',
                'severity': 'MEDIUM',
                'title': 'Dish Machine Functionality',
                'description': 'Verify dish machine is operating at proper temperatures',
                'guidance': 'Wash should be 110°F+, rinse should be 180°F+ (or proper chemical concentration)',
                'pass_criteria': 'Machine operating at proper temperatures',
                'fail_criteria': 'Temperatures below required levels',
                'photo_guidance': 'Photo of machine temperature gauge'
            },

            # WASTE_MANAGEMENT
            {
                'category': 'WASTE_MANAGEMENT',
                'severity': 'MEDIUM',
                'title': 'Trash Container Condition',
                'description': 'Check that all trash containers have lids and are in good condition',
                'guidance': 'Containers should be leak-proof with tight-fitting lids',
                'pass_criteria': 'All trash containers with lids, no leaks or damage',
                'fail_criteria': 'Containers without lids or with damage/leaks',
                'photo_guidance': 'Photo of trash container area'
            },
            {
                'category': 'WASTE_MANAGEMENT',
                'severity': 'MEDIUM',
                'title': 'Outdoor Dumpster Area',
                'description': 'Verify dumpster area is clean and pest-free',
                'guidance': 'Area should be free of trash spillage and pest activity',
                'pass_criteria': 'Clean area, lids closed, no pest evidence',
                'fail_criteria': 'Trash spillage, open lids, or signs of pests',
                'photo_guidance': 'Photo of dumpster and surrounding area'
            },

            # PEST_CONTROL
            {
                'category': 'PEST_CONTROL',
                'severity': 'CRITICAL',
                'title': 'Pest Activity Evidence',
                'description': 'Check for signs of pest activity (droppings, nesting, live pests)',
                'guidance': 'Inspect storage areas, behind equipment, and in corners',
                'pass_criteria': 'No evidence of pest activity',
                'fail_criteria': 'Any signs of pests (droppings, damage, live pests)',
                'photo_guidance': 'Photo of any pest evidence found'
            },
            {
                'category': 'PEST_CONTROL',
                'severity': 'HIGH',
                'title': 'Entry Point Protection',
                'description': 'Check that doors, windows, and gaps are properly sealed',
                'guidance': 'Look for gaps under doors, damaged screens, or open entry points',
                'pass_criteria': 'All potential entry points properly sealed',
                'fail_criteria': 'Gaps, damaged screens, or unsealed entry points',
                'photo_guidance': 'Photo of any problem areas found'
            },

            # STORAGE
            {
                'category': 'STORAGE',
                'severity': 'MEDIUM',
                'title': 'Chemical Storage Safety',
                'description': 'Verify chemicals are properly labeled and stored away from food',
                'guidance': 'Chemicals should be in original containers or properly labeled, stored below/away from food',
                'pass_criteria': 'All chemicals labeled and stored safely away from food',
                'fail_criteria': 'Unlabeled chemicals or storage near food',
                'photo_guidance': 'Photo of chemical storage area'
            },
            {
                'category': 'STORAGE',
                'severity': 'MEDIUM',
                'title': 'Dry Storage Organization',
                'description': 'Check that dry storage is organized with proper spacing and rotation',
                'guidance': 'Items should be 6 inches off floor, organized with oldest items in front (FIFO)',
                'pass_criteria': 'Proper organization, spacing, and rotation practices',
                'fail_criteria': 'Items on floor, poor organization, or no rotation',
                'photo_guidance': 'Photo of dry storage area showing organization'
            },

            # DOCUMENTATION
            {
                'category': 'DOCUMENTATION',
                'severity': 'HIGH',
                'title': 'Temperature Log Completion',
                'description': 'Verify daily temperature logs are being completed',
                'guidance': 'Check logs for today - should have entries for all required equipment',
                'pass_criteria': 'All required temperatures logged for current day',
                'fail_criteria': 'Missing entries or logs not completed',
                'photo_guidance': 'Photo of temperature log showing current entries'
            },
            {
                'category': 'DOCUMENTATION',
                'severity': 'MEDIUM',
                'title': 'Cleaning Schedule Adherence',
                'description': 'Check that cleaning tasks are being documented as completed',
                'guidance': 'Review cleaning checklist for current period',
                'pass_criteria': 'All scheduled cleaning tasks documented',
                'fail_criteria': 'Missing signatures or incomplete documentation',
                'photo_guidance': 'Photo of cleaning schedule'
            },

            # FACILITY
            {
                'category': 'FACILITY',
                'severity': 'MEDIUM',
                'title': 'Lighting Functionality',
                'description': 'Check that all lights are working and properly covered',
                'guidance': 'Verify adequate lighting in all areas and check for shatter-proof covers',
                'pass_criteria': 'All lights functional with proper covers',
                'fail_criteria': 'Burned out bulbs or missing/damaged covers',
                'photo_guidance': 'Photo of any lighting issues'
            },
            {
                'category': 'FACILITY',
                'severity': 'MEDIUM',
                'title': 'Wall and Ceiling Condition',
                'description': 'Check walls and ceilings for damage, stains, or needed repairs',
                'guidance': 'Look for cracks, water stains, peeling paint, or other damage',
                'pass_criteria': 'Walls and ceilings in good repair with no damage',
                'fail_criteria': 'Visible damage, stains, or areas needing repair',
                'photo_guidance': 'Photo of any damage found'
            },
        ]

        created_count = 0
        for template_data in templates_data:
            template, created = MicroCheckTemplate.objects.get_or_create(
                category=template_data['category'],
                title=template_data['title'],
                defaults={
                    **template_data,
                    'is_active': True,
                    'created_by': system_user,
                    'updated_by': system_user
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created: {template.category} - {template.title}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Already exists: {template.category} - {template.title}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\nSeeding complete! Created {created_count} new templates.')
        )
        self.stdout.write(f'Total templates: {MicroCheckTemplate.objects.count()}')
