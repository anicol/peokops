from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
import secrets
import string
from .models import User, SmartNudge, UserBehaviorEvent
from brands.models import Brand, Store
from .demo_data import create_demo_videos_and_inspections


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    trial_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name', 
                 'role', 'store', 'phone', 'is_active', 'is_trial_user', 'trial_status', 'created_at')
        read_only_fields = ('id', 'created_at', 'is_trial_user', 'trial_status')
    
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
            user = authenticate(username=username, password=password)
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
            trial_expires_at=timezone.now() + timedelta(days=7),
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