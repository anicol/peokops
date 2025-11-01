from rest_framework import serializers
from .models import Brand, Store


class BrandSerializer(serializers.ModelSerializer):
    stores_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = '__all__'

    def get_stores_count(self, obj):
        return obj.stores.filter(is_active=True).count()


class StoreSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    # Accept google_location_data for creation, but don't validate it against the model
    google_location_data = serializers.JSONField(required=False, write_only=True)

    class Meta:
        model = Store
        fields = '__all__'
        # Explicitly include google_location_data so it's accepted
        extra_kwargs = {
            'google_location_data': {'required': False}
        }


class StoreListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)

    # Google location data (OneToOne relationship)
    google_rating = serializers.SerializerMethodField()
    google_review_count = serializers.SerializerMethodField()
    google_location_name = serializers.SerializerMethodField()
    google_synced_at = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = ('id', 'name', 'code', 'brand', 'brand_name', 'city', 'state', 'is_active', 'created_at', 'phone', 'manager_email', 'address', 'zip_code', 'timezone', 'updated_at', 'google_rating', 'google_review_count', 'google_location_name', 'google_synced_at')

    def get_google_rating(self, obj):
        """Get average rating from linked Google location"""
        if hasattr(obj, 'google_location') and obj.google_location:
            rating = obj.google_location.average_rating
            return float(rating) if rating is not None else None
        return None

    def get_google_review_count(self, obj):
        """Get total review count from linked Google location"""
        if hasattr(obj, 'google_location') and obj.google_location:
            return obj.google_location.total_review_count
        return None

    def get_google_location_name(self, obj):
        """Get Google business name from linked Google location"""
        if hasattr(obj, 'google_location') and obj.google_location:
            return obj.google_location.google_location_name
        return None

    def get_google_synced_at(self, obj):
        """Get last sync timestamp from linked Google location"""
        if hasattr(obj, 'google_location') and obj.google_location:
            return obj.google_location.synced_at
        return None