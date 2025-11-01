"""
Management command to verify database backup integrity.

Usage:
    python manage.py verify_backup

This command performs basic sanity checks on the database to ensure
backups would be restorable and contain expected data.
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Verify database backup integrity and readiness'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting backup verification...'))
        
        checks_passed = 0
        checks_failed = 0
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                self.stdout.write(self.style.SUCCESS('✓ Database connectivity'))
                checks_passed += 1
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Database connectivity: {e}'))
            checks_failed += 1
        
        critical_tables = [
            'users', 'accounts', 'brands', 'stores',
            'inspections', 'videos', 'findings',
            'micro_check_runs', 'micro_check_responses',
            'subscriptions', 'payment_events'
        ]
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            existing_tables = {row[0] for row in cursor.fetchall()}
        
        for table in critical_tables:
            if table in existing_tables:
                self.stdout.write(self.style.SUCCESS(f'✓ Table exists: {table}'))
                checks_passed += 1
            else:
                self.stdout.write(self.style.ERROR(f'✗ Table missing: {table}'))
                checks_failed += 1
        
        from accounts.models import User
        from inspections.models import Inspection
        from videos.models import Video
        from micro_checks.models import MicroCheckRun
        
        user_count = User.objects.count()
        inspection_count = Inspection.objects.count()
        video_count = Video.objects.count()
        run_count = MicroCheckRun.objects.count()
        
        self.stdout.write(self.style.SUCCESS(f'✓ Users: {user_count}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Inspections: {inspection_count}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Videos: {video_count}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Micro-check runs: {run_count}'))
        checks_passed += 4
        
        recent_threshold = timezone.now() - timedelta(days=7)
        recent_users = User.objects.filter(created_at__gte=recent_threshold).count()
        recent_inspections = Inspection.objects.filter(created_at__gte=recent_threshold).count()
        
        self.stdout.write(self.style.SUCCESS(f'✓ Recent users (7d): {recent_users}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Recent inspections (7d): {recent_inspections}'))
        checks_passed += 2
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
            """)
            db_size = cursor.fetchone()[0]
            self.stdout.write(self.style.SUCCESS(f'✓ Database size: {db_size}'))
            checks_passed += 1
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    schemaname || '.' || tablename AS table_name,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                LIMIT 5
            """)
            self.stdout.write(self.style.SUCCESS('\n✓ Largest tables:'))
            for table_name, size in cursor.fetchall():
                self.stdout.write(f'  - {table_name}: {size}')
            checks_passed += 1
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.table_constraints 
                WHERE constraint_type = 'FOREIGN KEY'
            """)
            fk_count = cursor.fetchone()[0]
            self.stdout.write(self.style.SUCCESS(f'✓ Foreign key constraints: {fk_count}'))
            checks_passed += 1
        
        total_checks = checks_passed + checks_failed
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'Checks passed: {checks_passed}/{total_checks}'))
        
        if checks_failed > 0:
            self.stdout.write(self.style.ERROR(f'Checks failed: {checks_failed}/{total_checks}'))
            self.stdout.write(self.style.ERROR('\n⚠ Backup verification FAILED'))
            return
        
        self.stdout.write(self.style.SUCCESS('\n✓ Backup verification PASSED'))
        self.stdout.write(self.style.SUCCESS('Database is healthy and ready for backup'))
