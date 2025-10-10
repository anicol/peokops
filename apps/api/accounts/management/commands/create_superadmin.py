from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a SUPER_ADMIN user for system-level management'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Username for the super admin')
        parser.add_argument('--email', type=str, help='Email for the super admin')
        parser.add_argument('--password', type=str, help='Password for the super admin')
        parser.add_argument(
            '--interactive',
            action='store_true',
            help='Prompt for details interactively'
        )

    def handle(self, *args, **options):
        username = options.get('username')
        email = options.get('email')
        password = options.get('password')
        interactive = options.get('interactive', False)

        # Interactive mode
        if interactive or not all([username, email, password]):
            self.stdout.write(self.style.WARNING('\n=== Create Super Admin User ===\n'))
            username = input('Username: ') if not username else username
            email = input('Email: ') if not email else email

            if not password:
                from getpass import getpass
                password = getpass('Password: ')
                password_confirm = getpass('Confirm Password: ')

                if password != password_confirm:
                    self.stdout.write(self.style.ERROR('Passwords do not match!'))
                    return

                if len(password) < 8:
                    self.stdout.write(self.style.ERROR('Password must be at least 8 characters!'))
                    return

        # Validate inputs
        if not all([username, email, password]):
            self.stdout.write(self.style.ERROR('Username, email, and password are required!'))
            self.stdout.write('Usage: python manage.py create_superadmin --interactive')
            self.stdout.write('   or: python manage.py create_superadmin --username=admin --email=admin@example.com --password=******')
            return

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.ERROR(f'User "{username}" already exists!'))
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR(f'Email "{email}" is already in use!'))
            return

        # Create the super admin user
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name='Super',
                    last_name='Admin',
                    role=User.Role.SUPER_ADMIN,
                    is_staff=True,
                    is_superuser=True,
                    is_active=True,
                    store=None  # Super admin has no specific store
                )

                self.stdout.write(self.style.SUCCESS(f'\n✓ Super Admin user created successfully!'))
                self.stdout.write(f'  Username: {user.username}')
                self.stdout.write(f'  Email: {user.email}')
                self.stdout.write(f'  Role: {user.get_role_display()}')
                self.stdout.write(f'\n  This user has system-wide access to:')
                self.stdout.write('    • All brands and tenants')
                self.stdout.write('    • All stores across all brands')
                self.stdout.write('    • User management and role assignment')
                self.stdout.write('    • Brand provisioning and configuration')
                self.stdout.write('    • System monitoring and logs\n')

                self.stdout.write(self.style.WARNING('⚠️  Keep super admin credentials secure!'))
                self.stdout.write('   Super admins should only be used for internal operations.\n')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating super admin: {str(e)}'))
            return
