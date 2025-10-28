"""
Default micro-check templates for coaching mode.

These templates are automatically seeded when a new brand is created,
providing an immediate "batteries included" experience where managers
can start running Micro-Checks on day 1.

Templates cover industry-standard operational checks across key categories:
- Food Safety
- Cleanliness
- Safety
- PPE (Personal Protective Equipment)
- Equipment & Maintenance
"""

DEFAULT_TEMPLATES = [
    # Food Safety (4 templates)
    {
        'title': 'Hand Sink Stocked',
        'category': 'FOOD_SAFETY',
        'severity': 'MEDIUM',
        'description': 'Verify that hand washing station has soap, paper towels, and hot water available for staff.',
        'success_criteria': '• Soap dispenser full or >25% remaining\n• Paper towels stocked\n• Water runs hot (at least 100°F/38°C)\n• Sink is clean and free of debris',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 30,
        'rotation_priority': 70,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Food Temperature Check',
        'category': 'FOOD_SAFETY',
        'severity': 'CRITICAL',
        'description': 'Verify that hot foods are held at safe temperatures (above 140°F/60°C) and cold foods below 40°F/4°C.',
        'success_criteria': '• Hot holding units at 140°F+ (60°C+)\n• Cold holding units at 40°F- (4°C-)\n• Thermometer readings logged\n• No food in temperature danger zone (40-140°F)',
        'default_photo_required': True,
        'default_video_required': False,
        'expected_completion_seconds': 45,
        'rotation_priority': 90,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Food Storage Proper',
        'category': 'FOOD_SAFETY',
        'severity': 'HIGH',
        'description': 'Check that food is stored properly with raw items below cooked, all items labeled and dated.',
        'success_criteria': '• Raw meat stored below ready-to-eat foods\n• All items labeled with date\n• No expired products visible\n• Shelves clean and organized\n• Items 6 inches off floor',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 40,
        'rotation_priority': 75,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Sanitizer Buckets Fresh',
        'category': 'FOOD_SAFETY',
        'severity': 'MEDIUM',
        'description': 'Verify sanitizer solution is at proper concentration and changed regularly.',
        'success_criteria': '• Test strips show 200-400 ppm quaternary (or 50-100 ppm chlorine)\n• Solution is clear, not cloudy\n• Buckets labeled and dated\n• Wiping cloths stored in solution',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 35,
        'rotation_priority': 65,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },

    # Cleanliness (3 templates)
    {
        'title': 'Floors Clean and Dry',
        'category': 'CLEANLINESS',
        'severity': 'MEDIUM',
        'description': 'Check that floors in food prep and service areas are clean, dry, and free of hazards.',
        'success_criteria': '• No visible spills or debris\n• Floors dry (no slip hazards)\n• Corners and edges cleaned\n• Floor drains clear and odor-free\n• Wet floor signs used if mopping',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 30,
        'rotation_priority': 60,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Prep Surfaces Sanitized',
        'category': 'CLEANLINESS',
        'severity': 'HIGH',
        'description': 'Verify all food contact surfaces are clean and sanitized before use.',
        'success_criteria': '• Cutting boards clean with no staining\n• Work tables wiped down and sanitized\n• No food debris in cracks or seams\n• Equipment clean before food prep\n• Sanitizer applied after cleaning',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 40,
        'rotation_priority': 75,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Trash Containers Managed',
        'category': 'CLEANLINESS',
        'severity': 'LOW',
        'description': 'Check that trash and recycling containers are not overflowing and area is clean.',
        'success_criteria': '• Trash cans <75% full\n• Lids in place and functional\n• No trash on floor around containers\n• Recycling separated properly\n• Outside dumpster area clean',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 25,
        'rotation_priority': 40,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },

    # Safety (3 templates)
    {
        'title': 'Fire Extinguisher Accessible',
        'category': 'SAFETY',
        'severity': 'HIGH',
        'description': 'Ensure fire extinguishers are visible, accessible, and properly maintained.',
        'success_criteria': '• Extinguisher visible and accessible (not blocked)\n• Pin and seal intact\n• Pressure gauge in green zone\n• Inspection tag current (within 1 year)\n• Mounted securely on wall',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 30,
        'rotation_priority': 80,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Exit Paths Clear',
        'category': 'SAFETY',
        'severity': 'HIGH',
        'description': 'Verify all emergency exits and pathways are clear and unobstructed.',
        'success_criteria': '• Exit doors unblocked and operational\n• Exit signs illuminated\n• Aisles and hallways clear\n• No storage blocking exits\n• Doors open freely without resistance',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 35,
        'rotation_priority': 85,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Wet Floor Signs Used',
        'category': 'SAFETY',
        'severity': 'MEDIUM',
        'description': 'Check that wet floor signs are deployed when cleaning or when spills occur.',
        'success_criteria': '• Signs available and in good condition\n• Signs placed when mopping or cleaning\n• Signs visible from all approaches\n• Floors dried promptly after cleaning',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 20,
        'rotation_priority': 50,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },

    # PPE (2 templates)
    {
        'title': 'Staff Wearing Gloves',
        'category': 'PPE',
        'severity': 'HIGH',
        'description': 'Verify staff handling food are wearing clean, intact gloves and changing them appropriately.',
        'success_criteria': '• Staff wear gloves when handling ready-to-eat foods\n• Gloves changed between tasks\n• No torn or dirty gloves in use\n• Gloves changed after touching face/phone/trash\n• Hands washed before putting on gloves',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 30,
        'rotation_priority': 75,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Hair Restraints Worn',
        'category': 'PPE',
        'severity': 'MEDIUM',
        'description': 'Check that all food handlers are wearing proper hair restraints (hats, visors, hairnets).',
        'success_criteria': '• All staff in food prep wear hair restraints\n• Hair fully covered (no loose hair visible)\n• Hats/visors clean and in good condition\n• Beards covered if required\n• Restraints worn properly (not just carried)',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 25,
        'rotation_priority': 60,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },

    # Equipment (3 templates)
    {
        'title': 'Refrigeration Temperatures',
        'category': 'EQUIPMENT',
        'severity': 'CRITICAL',
        'description': 'Monitor refrigerator and freezer temperatures to ensure food safety.',
        'success_criteria': '• Walk-in cooler at 40°F (4°C) or below\n• Freezer at 0°F (-18°C) or below\n• Reach-in units at proper temps\n• Thermometers visible and accurate\n• Temperatures logged in daily log',
        'default_photo_required': True,
        'default_video_required': False,
        'expected_completion_seconds': 40,
        'rotation_priority': 90,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Equipment Clean and Functional',
        'category': 'EQUIPMENT',
        'severity': 'MEDIUM',
        'description': 'Verify cooking and prep equipment is clean and operating properly.',
        'success_criteria': '• Ovens, grills, fryers clean (no buildup)\n• Equipment functioning without unusual sounds\n• No visible leaks or damage\n• Filters clean and in place\n• All parts assembled correctly',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 45,
        'rotation_priority': 65,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
    {
        'title': 'Dishwasher Operating Correctly',
        'category': 'EQUIPMENT',
        'severity': 'HIGH',
        'description': 'Check that dish machine is reaching proper temperatures and sanitizing effectively.',
        'success_criteria': '• Wash temperature 150-165°F (66-74°C)\n• Final rinse temperature 180°F+ (82°C+)\n• Chemicals dispensing properly\n• Test strips confirm sanitization\n• No buildup in spray arms or tanks',
        'default_photo_required': False,
        'default_video_required': False,
        'expected_completion_seconds': 40,
        'rotation_priority': 70,
        'ai_validation_enabled': False,
        'ai_validation_prompt': '',
    },
]


def get_default_templates():
    """
    Returns the list of default coaching templates.

    Returns:
        list: List of template dictionaries ready for MicroCheckTemplate.objects.create()
    """
    return DEFAULT_TEMPLATES.copy()


def get_template_count():
    """Returns the number of default templates"""
    return len(DEFAULT_TEMPLATES)


def get_templates_by_category():
    """Returns templates grouped by category"""
    from collections import defaultdict
    grouped = defaultdict(list)
    for template in DEFAULT_TEMPLATES:
        grouped[template['category']].append(template)
    return dict(grouped)
