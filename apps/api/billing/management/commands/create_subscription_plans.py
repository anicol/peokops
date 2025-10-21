"""
Management command to create subscription plans matching the pricing page.
Run with: python manage.py create_subscription_plans
"""
from django.core.management.base import BaseCommand
from billing.models import SubscriptionPlan


class Command(BaseCommand):
    help = 'Creates subscription plans matching the pricing page'

    def handle(self, *args, **options):
        self.stdout.write('Creating subscription plans...')

        plans = [
            {
                'name': 'Starter Coaching',
                'plan_type': SubscriptionPlan.PlanType.STARTER_COACHING,
                'description': 'Private AI coaching to build confidence',
                'price_monthly': '49.00',
                'stripe_price_id': 'price_starter_coaching_REPLACE_ME',  # Replace with actual Stripe Price ID
                'stripe_product_id': 'prod_starter_coaching_REPLACE_ME',  # Replace with actual Stripe Product ID
                'unlimited_coaching_videos': True,
                'inspection_mode_enabled': False,
                'multi_manager_analytics': False,
                'corporate_dashboards': False,
                'advanced_analytics': False,
                'priority_support': False,
                'dedicated_success_manager': False,
                'max_videos_per_month': None,  # Unlimited
                'max_stores': 1,
                'max_users': 5,
            },
            {
                'name': 'Pro Coaching',
                'plan_type': SubscriptionPlan.PlanType.PRO_COACHING,
                'description': 'Everything in Starter plus multi-manager analytics',
                'price_monthly': '79.00',
                'stripe_price_id': 'price_pro_coaching_REPLACE_ME',  # Replace with actual Stripe Price ID
                'stripe_product_id': 'prod_pro_coaching_REPLACE_ME',  # Replace with actual Stripe Product ID
                'unlimited_coaching_videos': True,
                'inspection_mode_enabled': False,
                'multi_manager_analytics': True,
                'corporate_dashboards': False,
                'advanced_analytics': False,
                'priority_support': False,
                'dedicated_success_manager': False,
                'max_videos_per_month': None,  # Unlimited
                'max_stores': 1,
                'max_users': 10,
            },
        ]

        for plan_data in plans:
            plan, created = SubscriptionPlan.objects.update_or_create(
                plan_type=plan_data['plan_type'],
                defaults=plan_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {plan.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Updated: {plan.name}'))

        self.stdout.write(self.style.SUCCESS('\n✓ Subscription plans setup complete!'))
        self.stdout.write(self.style.WARNING('\n⚠️  IMPORTANT: Update the Stripe Price IDs and Product IDs in the database'))
        self.stdout.write('   You can do this via Django Admin or by updating the command and re-running it.')
