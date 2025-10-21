"""
Management command to backfill streak data for existing completed runs.

Usage:
    python manage.py backfill_streaks
    python manage.py backfill_streaks --dry-run
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from micro_checks.models import MicroCheckRun, MicroCheckStreak, StoreStreak
from micro_checks.utils import get_store_local_date, all_run_items_passed
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backfill streak data for existing completed runs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Get all completed runs ordered by completion date
        completed_runs = MicroCheckRun.objects.filter(
            status='COMPLETED',
            completed_at__isnull=False,
            completed_by__isnull=False,
            store__isnull=False
        ).select_related('store', 'completed_by').order_by('completed_at')

        total_runs = completed_runs.count()
        self.stdout.write(f'Found {total_runs} completed runs')

        if total_runs == 0:
            self.stdout.write(self.style.SUCCESS('No runs to process'))
            return

        # Group runs by user+store to process streaks correctly
        user_store_runs = {}
        store_runs = {}

        for run in completed_runs:
            # Get local completion date
            local_date = get_store_local_date(run.store, run.completed_at)

            # Group by user + store
            key = (run.completed_by.id, run.store.id)
            if key not in user_store_runs:
                user_store_runs[key] = []
            user_store_runs[key].append((run, local_date))

            # Group by store
            if run.store.id not in store_runs:
                store_runs[run.store.id] = []
            store_runs[run.store.id].append((run, local_date))

        # Process user streaks
        user_streak_count = 0
        for (user_id, store_id), runs_with_dates in user_store_runs.items():
            # Process runs in chronological order
            for run, local_date in runs_with_dates:
                all_passed = all_run_items_passed(run)

                if dry_run:
                    self.stdout.write(
                        f'  Would update user streak: user={run.completed_by.email}, '
                        f'store={run.store.name}, date={local_date}, passed={all_passed}'
                    )
                else:
                    # Get or create streak
                    streak, created = MicroCheckStreak.objects.get_or_create(
                        user=run.completed_by,
                        store=run.store,
                        defaults={
                            'current_streak': 0,
                            'longest_streak': 0,
                            'total_completions': 0,
                        }
                    )

                    # Update totals
                    streak.total_completions += 1

                    # Update streak logic
                    if streak.last_completion_date:
                        days_since_last = (local_date - streak.last_completion_date).days

                        if days_since_last == 1:
                            # Consecutive day - increment streak
                            streak.current_streak += 1
                        elif days_since_last == 0:
                            # Same day - don't change streak
                            pass
                        else:
                            # Streak broken
                            streak.current_streak = 1
                    else:
                        # First completion
                        streak.current_streak = 1

                    # Update longest streak
                    if streak.current_streak > streak.longest_streak:
                        streak.longest_streak = streak.current_streak

                    streak.last_completion_date = local_date
                    streak.save()

                    user_streak_count += 1

        # Process store streaks
        store_streak_count = 0
        for store_id, runs_with_dates in store_runs.items():
            # Process runs in chronological order
            for run, local_date in runs_with_dates:
                if dry_run:
                    self.stdout.write(
                        f'  Would update store streak: store={run.store.name}, date={local_date}'
                    )
                else:
                    # Get or create streak
                    streak, created = StoreStreak.objects.get_or_create(
                        store=run.store,
                        defaults={
                            'current_streak': 0,
                            'longest_streak': 0,
                            'total_completions': 0,
                        }
                    )

                    # Update total completions
                    streak.total_completions += 1

                    # Update streak logic
                    if streak.last_completion_date:
                        days_since_last = (local_date - streak.last_completion_date).days

                        if days_since_last == 1:
                            # Consecutive day - increment streak
                            streak.current_streak += 1
                        elif days_since_last == 0:
                            # Same day - don't change streak
                            pass
                        else:
                            # Streak broken
                            streak.current_streak = 1
                    else:
                        # First completion
                        streak.current_streak = 1

                    # Update longest streak
                    if streak.current_streak > streak.longest_streak:
                        streak.longest_streak = streak.current_streak

                    streak.last_completion_date = local_date
                    streak.save()

                    store_streak_count += 1

        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'DRY RUN: Would process {user_streak_count} user streak updates '
                f'and {store_streak_count} store streak updates'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Successfully backfilled streaks: {user_streak_count} user streak updates, '
                f'{store_streak_count} store streak updates'
            ))

            # Show final streak stats
            total_user_streaks = MicroCheckStreak.objects.count()
            total_store_streaks = StoreStreak.objects.count()
            self.stdout.write(f'Total user streaks in database: {total_user_streaks}')
            self.stdout.write(f'Total store streaks in database: {total_store_streaks}')
