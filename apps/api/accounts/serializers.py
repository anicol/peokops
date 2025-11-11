from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta, time
import secrets
import string
from .models import User, SmartNudge, UserBehaviorEvent, MicroCheckDeliveryConfig, Account
from brands.models import Brand, Store
from .demo_data import create_demo_videos_and_inspections


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    trial_status = serializers.SerializerMethodField()
    hours_since_signup = serializers.ReadOnlyField()
    total_inspections = serializers.ReadOnlyField()
    accessible_stores_count = serializers.ReadOnlyField()
    has_account_wide_access = serializers.SerializerMethodField()
    store_name = serializers.CharField(source='store.name', read_only=True)
    brand_name = serializers.CharField(source='store.brand.name', read_only=True)
    brand_id = serializers.IntegerField(source='store.brand.id', read_only=True)
    account_id = serializers.IntegerField(source='account.id', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    impersonation_context = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name',
                 'role', 'store', 'store_name', 'brand_name', 'brand_id',
                 'account_id', 'account_name', 'phone',
                 'is_active', 'is_trial_user', 'trial_status', 'hours_since_signup',
                 'total_inspections', 'accessible_stores_count', 'has_account_wide_access', 'has_seen_demo', 'demo_completed_at', 'onboarding_completed_at', 'password_set_by_user_at',
                 'created_at', 'last_active_at', 'impersonation_context')
        read_only_fields = ('id', 'created_at', 'is_trial_user', 'trial_status', 'hours_since_signup',
                           'total_inspections', 'accessible_stores_count', 'has_account_wide_access', 'last_active_at', 'onboarding_completed_at', 'password_set_by_user_at',
                           'account_id', 'account_name', 'impersonation_context')

    def get_trial_status(self, obj):
        """Get trial status information"""
        return obj.get_trial_status()

    def get_has_account_wide_access(self, obj):
        """Check if user has account-wide access (OWNER with store=null)"""
        return obj.role == User.Role.OWNER and obj.store is None

    def get_impersonation_context(self, obj):
        """Get impersonation context from request if available"""
        request = self.context.get('request')
        if not request:
            return None

        from .jwt_utils import get_impersonation_context_from_request
        context = get_impersonation_context_from_request(request)

        if not context or not context.get('is_impersonating'):
            return None

        # Get the original super admin user
        try:
            original_user = User.objects.get(id=context['original_user_id'])
            return {
                'is_impersonating': True,
                'original_user': {
                    'id': original_user.id,
                    'email': original_user.email,
                    'full_name': original_user.full_name,
                },
                'impersonated_user': {
                    'id': obj.id,
                    'email': obj.email,
                    'full_name': obj.full_name,
                    'account_name': obj.account.name if obj.account else None,
                }
            }
        except User.DoesNotExist:
            return None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 
                 'password_confirm', 'role', 'store', 'phone')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")

        # Validate store assignment based on role
        role = attrs.get('role')
        store = attrs.get('store')

        # OWNER role should not have a store assignment (account-wide access)
        if role == User.Role.OWNER and store is not None:
            raise serializers.ValidationError({
                'store': 'Account Owners should not be assigned to a specific store. Leave blank for account-wide access.'
            })

        # TRIAL_ADMIN can optionally have no store (account-wide access during trial)
        # GM, INSPECTOR, EMPLOYEE roles must have a store
        if role in [User.Role.GM, User.Role.INSPECTOR, User.Role.EMPLOYEE]:
            if store is None:
                raise serializers.ValidationError({
                    'store': f'{role} role requires a store assignment.'
                })

        return attrs

    def create(self, validated_data):
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.core.mail import send_mail
        from django.conf import settings

        # Get the inviting user from the request context
        request = self.context.get('request')
        invited_by = request.user if request and request.user.is_authenticated else None

        # Set the account from the inviting user (inherit tenant)
        if invited_by and invited_by.account:
            validated_data['account'] = invited_by.account

        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        # Mark that this is an admin-assigned password, not user-set
        user.password_set_by_user_at = None
        user.save()

        # Generate a magic link token for the new user
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        # Build the login link
        app_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000'
        login_link = f"{app_url}/login?token={access_token}"

        # Send invitation email
        if user.email and invited_by:
            inviter_name = invited_by.get_full_name() or invited_by.email
            store_name = user.store.name if user.store else 'your store'

            subject = f"{inviter_name} invited you to PeakOps"
            message = f"""
Hi {user.first_name or user.email},

{inviter_name} has invited you to join {store_name} on PeakOps!

What is PeakOps?
PeakOps helps your team maintain operational excellence through quick daily checks. Instead of lengthy inspections, you'll complete 3 micro-checks each day (takes just 2 minutes) to keep your store running smoothly.

Your Role: {user.get_role_display()}
You'll receive daily check reminders via email and can complete them right from your phone or computer.

Click here to get started:
{login_link}

This link will log you in automatically. Once you're in, you can run your first micro-check from the dashboard.

Welcome to the team,
PeakOps
            """

            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True,
                )
            except Exception as e:
                # Log error but don't fail user creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send invitation email: {str(e)}")

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Try to find user by email and authenticate with username
            try:
                user = User.objects.get(email=email)
                user = authenticate(username=user.username, password=password)
                if not user:
                    raise serializers.ValidationError('Invalid credentials')
            except User.DoesNotExist:
                raise serializers.ValidationError('Invalid credentials')

            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include email and password')


class TrialSignupSerializer(serializers.Serializer):
    """Simplified trial signup - just email and password"""
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    analysis_id = serializers.UUIDField(required=False, allow_null=True, help_text="ReviewAnalysis ID for conversion tracking")

    def validate_email(self, value):
        """Ensure email is unique"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def create(self, validated_data):
        """Create trial user with auto-generated brand and store"""
        email = validated_data['email']
        password = validated_data['password']
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '')
        analysis_id = validated_data.get('analysis_id')

        # Generate referral code
        referral_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

        # Create trial user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=User.Role.TRIAL_ADMIN,
            is_trial_user=True,
            trial_expires_at=timezone.now().replace(hour=23, minute=59, second=59, microsecond=999999) + timedelta(days=6),
            referral_code=referral_code
        )

        # If coming from review analysis, convert and migrate data
        if analysis_id:
            from insights.models import ReviewAnalysis
            try:
                analysis = ReviewAnalysis.objects.get(id=analysis_id)
                # mark_converted will create brand, account, store, and migrate reviews
                analysis.mark_converted(user)

                # User's store and account should now be set by mark_converted
                # Refresh user to get the updated store
                user.refresh_from_db()

                # Create demo videos and inspections for instant value
                if user.store:
                    demo_result = create_demo_videos_and_inspections(user, user.store)

                return user
            except ReviewAnalysis.DoesNotExist:
                # Fall through to normal trial creation if analysis not found
                pass

        # Normal trial creation (no review analysis)
        # Auto-create trial brand
        brand = Brand.create_trial_brand(user)

        # Auto-create account for the brand
        from .models import Account
        account = Account.objects.create(
            name=f"{brand.name} Account",
            brand=brand,
            owner=user,
            company_name=brand.name,
            is_active=True
        )

        # Auto-create demo store
        store = Store.objects.create(
            brand=brand,
            account=account,
            name="Demo Store",
            code=f"TRIAL-{user.id}",
            address="123 Demo Street",
            city="Demo City",
            state="Demo State",
            zip_code="12345",
            manager_email=user.email
        )

        # Assign user to store and account
        user.store = store
        user.account = account
        user.increment_trial_usage('store')  # Count the auto-created store
        user.save()

        # Create demo videos and inspections for instant value
        demo_result = create_demo_videos_and_inspections(user, store)

        return user


class SmartNudgeSerializer(serializers.ModelSerializer):
    """Serializer for SmartNudge model"""
    
    class Meta:
        model = SmartNudge
        fields = [
            'id', 'nudge_type', 'title', 'message', 'cta_text', 'cta_url',
            'status', 'priority', 'show_after', 'expires_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserBehaviorEventSerializer(serializers.ModelSerializer):
    """Serializer for UserBehaviorEvent model"""
    
    class Meta:
        model = UserBehaviorEvent
        fields = [
            'id', 'event_type', 'metadata', 'timestamp', 'session_id'
        ]
        read_only_fields = ['id', 'timestamp']


class BehaviorEventCreateSerializer(serializers.Serializer):
    """Serializer for creating behavior events"""
    event_type = serializers.ChoiceField(choices=UserBehaviorEvent.EventType.choices)
    metadata = serializers.JSONField(default=dict, required=False)
    session_id = serializers.CharField(max_length=100, required=False, allow_blank=True)


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for users to update their own profile"""

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'phone')

    def validate_email(self, value):
        """Ensure email is unique (except for current user)"""
        user = self.instance
        if User.objects.filter(email=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing user password"""
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate_current_password(self, value):
        """Verify current password is correct"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        """Ensure new passwords match"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "New passwords don't match."})
        return attrs

    def save(self):
        """Update user password"""
        from django.utils import timezone
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        # Mark that user has now set their own password
        user.password_set_by_user_at = timezone.now()
        user.save()
        return user


class QuickSignupSerializer(serializers.Serializer):
    """Streamlined passwordless trial signup - account created with email + magic link"""
    phone = serializers.CharField(required=True, allow_blank=True, help_text="Phone number in E.164 format (optional for now)")
    email = serializers.EmailField(required=True, help_text="Email address for magic link delivery")
    store_name = serializers.CharField(max_length=200)
    industry = serializers.ChoiceField(choices=['RESTAURANT', 'RETAIL', 'HOSPITALITY', 'OTHER'])
    focus_areas = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)

    def validate_phone(self, value):
        """Ensure phone number is unique and properly formatted (optional for now)"""
        # Allow blank/placeholder phone numbers
        if not value or value == '+10000000000':
            return value

        # Check if phone already exists
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")

        # Basic E.164 format validation (starts with + and has 10-15 digits)
        if not value.startswith('+') or not value[1:].isdigit() or len(value) < 11 or len(value) > 16:
            raise serializers.ValidationError("Phone number must be in E.164 format (e.g., +15551234567)")

        return value

    def validate_email(self, value):
        """Validate email format - uniqueness check moved to view"""
        # Email uniqueness is now handled gracefully in the view
        # by sending magic link to existing users
        return value

    def create(self, validated_data):
        """Create trial user with passwordless magic link flow - or update existing user"""
        phone = validated_data['phone']
        email = validated_data.get('email', '')
        store_name = validated_data['store_name']
        industry = validated_data['industry']
        focus_areas = validated_data.get('focus_areas', [])

        # Check if user already exists with this email
        existing_user = None
        if email:
            try:
                existing_user = User.objects.get(email=email)
            except User.DoesNotExist:
                pass

        if existing_user:
            # User exists - update their info and create new store/brand
            user = existing_user
            if phone and phone != '+10000000000':
                user.phone = phone
            user.is_trial_user = True
            user.trial_expires_at = timezone.now().replace(hour=23, minute=59, second=59, microsecond=999999) + timedelta(days=6)
            user.save()
        else:
            # Generate secure random password (user won't need it - magic link only)
            random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))

            # Generate referral code
            referral_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

            # Generate username - use email if phone is placeholder/blank
            if not phone or phone == '+10000000000':
                # Use email as username, or generate unique username from email + random suffix
                if email:
                    username = email.split('@')[0] + '_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
                else:
                    # Fallback: generate completely random username
                    username = 'trial_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
            else:
                # Use phone as username (sanitized)
                username = phone.replace('+', '').replace('-', '').replace(' ', '')

            # Create trial user
            user = User.objects.create_user(
                username=username,
                email=email or f"{username}@trial.temp",  # Temporary email if not provided
                password=random_password,
                phone=phone if phone and phone != '+10000000000' else '',  # Don't store placeholder
                role=User.Role.TRIAL_ADMIN,
                is_trial_user=True,
                trial_expires_at=timezone.now().replace(hour=23, minute=59, second=59, microsecond=999999) + timedelta(days=6),
                referral_code=referral_code
            )

        # Auto-create trial brand - or reuse existing brand for existing users
        from django.db import IntegrityError
        import time

        # Try to get existing brand for user
        existing_brand = Brand.objects.filter(trial_created_by=user, is_trial=True).first()

        if existing_brand:
            # Reuse existing brand
            brand = existing_brand
        else:
            # Create new brand with unique name
            max_attempts = 5
            for attempt in range(max_attempts):
                try:
                    if attempt == 0:
                        brand = Brand.create_trial_brand(user)
                    else:
                        # Add timestamp to make it unique
                        timestamp = int(time.time())
                        brand_name = f"{user.first_name or user.username}'s Trial {timestamp}"
                        brand = Brand.objects.create(
                            name=brand_name,
                            is_trial=True,
                            trial_created_by=user,
                            retention_days_coaching=7,
                            inspection_config=Brand.get_default_trial_config()
                        )
                        # Seed templates
                        from micro_checks.utils import seed_default_templates
                        seed_default_templates(brand, created_by=user)
                    break
                except IntegrityError:
                    if attempt == max_attempts - 1:
                        raise
                    continue

        # Create or get Account for multi-tenancy
        # Check if user already has an account
        existing_account = Account.objects.filter(owner=user, brand=brand).first()

        if existing_account:
            # Reuse existing account
            account = existing_account
        else:
            # Create new account for this trial user
            account_name = f"{user.first_name or user.username}'s Account"
            if user.email and '@' in user.email:
                # Use email domain for more personalized name
                email_name = user.email.split('@')[0]
                account_name = f"{email_name}'s Account"

            account = Account.objects.create(
                name=account_name,
                brand=brand,
                owner=user,
                company_name=store_name if store_name else '',
                billing_email=email if email else '',
                phone=phone if phone and phone != '+10000000000' else '',
                is_active=True
            )

        # Link user to account
        user.account = account
        user.save()

        # Auto-create store with provided name
        store = Store.objects.create(
            account=account,
            brand=brand,
            name=store_name,
            code=f"TRIAL-{user.id}-{int(time.time())}",  # Make unique with timestamp
            address="",
            city="",
            state="",
            zip_code="",
            timezone="America/New_York",  # Default timezone, can be updated later
            manager_email=email or phone
        )

        # Assign user to store
        user.store = store
        user.increment_trial_usage('store')
        user.save()

        # Mark onboarding completed
        user.onboarding_completed_at = timezone.now()
        user.save()

        # Create MicroCheckDeliveryConfig with randomized cadence for better trial experience
        import random
        from datetime import date

        today = date.today()

        # Calculate next send date (1-3 days from now)
        random_gap = random.randint(1, 3)
        next_send = today + timedelta(days=random_gap)

        # Create or update delivery config
        delivery_config, created = MicroCheckDeliveryConfig.objects.get_or_create(
            account=account,
            defaults={
                'send_to_recipients': 'MANAGERS_ONLY',
                'cadence_mode': 'RANDOMIZED',
                'min_day_gap': 1,
                'max_day_gap': 3,
                'randomize_recipients': False,
                'recipient_percentage': 100,
                'last_sent_date': today,
                'next_send_date': next_send
            }
        )

        if not created:
            # Update existing config to randomized mode
            delivery_config.cadence_mode = 'RANDOMIZED'
            delivery_config.min_day_gap = 1
            delivery_config.max_day_gap = 3
            delivery_config.last_sent_date = today
            delivery_config.next_send_date = next_send
            delivery_config.save()

        # Create first MicroCheckRun with magic link
        from micro_checks.models import MicroCheckRun, MicroCheckRunItem, MicroCheckAssignment
        from micro_checks.utils import (
            generate_magic_link_token, hash_token,
            get_store_local_date, get_next_sequence_number,
            select_templates_for_run
        )

        # Get today's date in store timezone
        local_date = get_store_local_date(store)
        sequence = get_next_sequence_number(store, local_date)

        # Create the run
        run = MicroCheckRun.objects.create(
            store=store,
            scheduled_for=local_date,
            daypart='ANY',
            sequence=sequence,
            store_timezone=store.timezone,
            created_via='SMS',
            status='PENDING',
            created_by=user,
            retention_policy='COACHING'
        )

        # Select templates for the run
        selected_templates = select_templates_for_run(store, num_items=3)

        # Create run items
        for order, (template, coverage, photo_required, photo_reason) in enumerate(selected_templates, start=1):
            MicroCheckRunItem.objects.create(
                run=run,
                template=template,
                order=order,
                photo_required=photo_required,
                photo_required_reason=photo_reason or '',
                template_version=template.version,
                title_snapshot=template.title,
                success_criteria_snapshot=template.success_criteria,
                category_snapshot=template.category,
                severity_snapshot=template.severity
            )

        # Generate magic link token
        raw_token = generate_magic_link_token()
        token_hash = hash_token(raw_token)

        # Create assignment with magic link
        assignment = MicroCheckAssignment.objects.create(
            run=run,
            store=store,
            sent_to=user,
            access_token_hash=token_hash,
            token_expires_at=timezone.now() + timedelta(days=30),
            purpose='RUN_ACCESS',
            scope={'run_id': str(run.id), 'store_id': store.id},
            max_uses=999,  # Allow unlimited uses for trial
            sent_via='SMS',
            sent_at=timezone.now(),
            created_by=user,
            retention_policy='COACHING'
        )

        # Store data for response
        user._quick_signup_data = {
            'magic_token': raw_token,
            'run_id': str(run.id),
            'sms_sent': False  # Will be set by SMS sending logic
        }

        return user


class MicroCheckDeliveryConfigSerializer(serializers.ModelSerializer):
    """Serializer for micro-check delivery configuration"""

    class Meta:
        model = MicroCheckDeliveryConfig
        fields = ('id', 'account', 'send_to_recipients', 'cadence_mode',
                 'min_day_gap', 'max_day_gap', 'randomize_recipients',
                 'recipient_percentage', 'last_sent_date', 'next_send_date',
                 'created_at', 'updated_at')
        read_only_fields = ('id', 'account', 'created_at', 'updated_at')

    def validate(self, attrs):
        # Validate day gap values
        if 'min_day_gap' in attrs and 'max_day_gap' in attrs:
            if attrs['min_day_gap'] > attrs['max_day_gap']:
                raise serializers.ValidationError(
                    "Minimum day gap cannot be greater than maximum day gap"
                )
            if attrs['min_day_gap'] < 1 or attrs['max_day_gap'] > 7:
                raise serializers.ValidationError(
                    "Day gaps must be between 1 and 7 days"
                )

        # Validate recipient percentage
        if 'recipient_percentage' in attrs:
            if attrs['recipient_percentage'] < 1 or attrs['recipient_percentage'] > 100:
                raise serializers.ValidationError(
                    "Recipient percentage must be between 1 and 100"
                )

        return attrs