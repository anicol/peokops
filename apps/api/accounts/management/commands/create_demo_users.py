from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from brands.models import Brand, Store

User = get_user_model()


class Command(BaseCommand):
    help = 'Create demo users with default passwords'

    def handle(self, *args, **options):
        # Create or get brands and stores
        fastbite, created = Brand.objects.get_or_create(
            name="FastBite",
            defaults={
                "description": "Quick service restaurant chain",
                "inspection_config": {
                    "ppe_required": True,
                    "safety_checks": ["fire_extinguisher", "exit_signs"],
                    "cleanliness_standards": ["spill_free", "trash_management"]
                }
            }
        )

        store, created = Store.objects.get_or_create(
            code="FB001",
            defaults={
                "brand": fastbite,
                "name": "Downtown Location",
                "address": "123 Main St",
                "city": "San Francisco",
                "state": "CA",
                "zip_code": "94105"
            }
        )

        # Create demo users
        users_data = [
            {
                "username": "admin",
                "email": "admin@inspectai.com",
                "first_name": "System",
                "last_name": "Administrator",
                "role": "SUPER_ADMIN",  # Super admin with system-wide access
                "store": None,
                "is_staff": True,
                "is_superuser": True
            },
            {
                "username": "manager",
                "email": "manager@fastbite.com",
                "first_name": "John",
                "last_name": "Manager",
                "role": "GM",
                "store": store,
                "is_staff": False,
                "is_superuser": False
            },
            {
                "username": "inspector",
                "email": "inspector@fastbite.com",
                "first_name": "Jane",
                "last_name": "Inspector",
                "role": "INSPECTOR",
                "store": store,
                "is_staff": False,
                "is_superuser": False
            }
        ]

        for user_data in users_data:
            username = user_data["username"]
            if not User.objects.filter(username=username).exists():
                user = User.objects.create_user(
                    password="demo123",  # Default password for all demo users
                    **user_data
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created user: {username} (password: demo123)'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'User {username} already exists')
                )

        self.stdout.write(
            self.style.SUCCESS(
                '\nDemo users created successfully!\n'
                'Login credentials:\n'
                '- admin / demo123 (Super Administrator - System-wide access)\n'
                '- manager / demo123 (General Manager)\n'
                '- inspector / demo123 (Inspector)\n'
            )
        )