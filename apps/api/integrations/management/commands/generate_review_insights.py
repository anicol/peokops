"""
Management command to generate review insights and trending topics
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import Account
from integrations.insights_service import ReviewInsightsService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Generate review topic snapshots and calculate trends'

    def add_arguments(self, parser):
        parser.add_argument(
            '--account-id',
            type=int,
            help='Specific account ID to process (processes all if not specified)'
        )
        parser.add_argument(
            '--window-type',
            type=str,
            default='weekly',
            choices=['daily', 'weekly', 'monthly'],
            help='Snapshot window type'
        )
        parser.add_argument(
            '--skip-snapshots',
            action='store_true',
            help='Skip snapshot generation, only calculate trends'
        )
        parser.add_argument(
            '--skip-trends',
            action='store_true',
            help='Skip trend calculation, only generate snapshots'
        )

    def handle(self, *args, **options):
        account_id = options.get('account_id')
        window_type = options.get('window_type')
        skip_snapshots = options.get('skip_snapshots')
        skip_trends = options.get('skip_trends')
        
        service = ReviewInsightsService()
        
        # Get accounts to process
        if account_id:
            accounts = Account.objects.filter(id=account_id)
        else:
            accounts = Account.objects.filter(is_active=True)
        
        if not accounts.exists():
            self.stdout.write(self.style.ERROR('No accounts found to process'))
            return
        
        self.stdout.write(f'Processing {accounts.count()} account(s)...')
        
        total_snapshots = 0
        total_trends = 0
        
        for account in accounts:
            self.stdout.write(f'\nProcessing account: {account.name} (ID: {account.id})')
            
            try:
                # Generate snapshots
                if not skip_snapshots:
                    self.stdout.write(f'  Generating {window_type} snapshots...')
                    snapshots = service.generate_topic_snapshots(
                        account_id=account.id,
                        window_type=window_type
                    )
                    total_snapshots += len(snapshots)
                    self.stdout.write(
                        self.style.SUCCESS(f'    ✓ Created {len(snapshots)} snapshots')
                    )
                
                # Calculate trends
                if not skip_trends:
                    self.stdout.write('  Calculating trends...')
                    trends = service.calculate_trends(account_id=account.id)
                    total_trends += len(trends)
                    self.stdout.write(
                        self.style.SUCCESS(f'    ✓ Updated {len(trends)} trends')
                    )
                    
                    # Show top trending issues
                    increasing = [t for t in trends if t.trend_direction == 'INCREASING' and t.overall_sentiment == 'NEGATIVE']
                    if increasing:
                        self.stdout.write('    Top trending issues:')
                        for trend in sorted(increasing, key=lambda x: x.current_mentions, reverse=True)[:3]:
                            self.stdout.write(
                                f'      - {trend.topic}: {trend.current_mentions} mentions '
                                f'({trend.percent_change:+.1f}% change)'
                            )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error processing account {account.id}: {e}')
                )
                logger.exception(f'Error processing account {account.id}')
                continue
        
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('Summary:'))
        if not skip_snapshots:
            self.stdout.write(f'  Total snapshots created: {total_snapshots}')
        if not skip_trends:
            self.stdout.write(f'  Total trends calculated: {total_trends}')
        self.stdout.write('='*60)
