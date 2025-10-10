from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta, time
import secrets
import string
from .models import User, SmartNudge, UserBehaviorEvent
from brands.models import Brand, Store
from .demo_data import create_demo_videos_and_inspections


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    trial_status = serializers.SerializerMethodField()
    hours_since_signup = serializers.ReadOnlyField()
    total_inspections = serializers.ReadOnlyField()
    store_name = serializers.CharField(source='store.name', read_only=True)
    brand_name = serializers.CharField(source='store.brand.name', read_only=True)
    brand_id = serializers.IntegerField(source='store.brand.id', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name',
                 'role', 'store', 'store_name', 'brand_name', 'brand_id', 'phone',
                 'is_active', 'is_trial_user', 'trial_status', 'hours_since_signup',
                 'total_inspections', 'has_seen_demo', 'demo_completed_at', 'onboarding_completed_at',
                 'created_at', 'last_active_at')
        read_only_fields = ('id', 'created_at', 'is_trial_user', 'trial_status', 'hours_since_signup',
                           'total_inspections', 'last_active_at', 'onboarding_completed_at')

    def get_trial_status(self, obj):
        """Get trial status information"""
        return obj.get_trial_status()


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
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            # Try to authenticate with username
            user = authenticate(username=username, password=password)

            # If failed, check if it's an email and try to find the user
            if not user and '@' in username:
                try:
                    user_obj = User.objects.get(email=username)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass

            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include username and password')


class TrialSignupSerializer(serializers.Serializer):
    """Simplified trial signup - just email and password"""
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    
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
        
        # Auto-create trial brand
        brand = Brand.create_trial_brand(user)
        
        # Auto-create demo store
        store = Store.objects.create(
            brand=brand,
            name="Demo Store",
            code=f"TRIAL-{user.id}",
            address="123 Demo Street",
            city="Demo City",
            state="Demo State",
            zip_code="12345",
            manager_email=user.email
        )
        
        # Assign user to store
        user.store = store
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
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user