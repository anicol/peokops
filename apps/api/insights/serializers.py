from rest_framework import serializers
from .models import ReviewAnalysis


class ReviewAnalysisCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new review analysis"""
    force_refresh = serializers.BooleanField(default=False, write_only=True, required=False)

    class Meta:
        model = ReviewAnalysis
        fields = ['business_name', 'location', 'source', 'force_refresh']

    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta

        business_name = validated_data['business_name']
        location = validated_data.get('location', '')
        force_refresh = validated_data.pop('force_refresh', False)

        # Check for recent analysis (within last 6 hours) unless force_refresh is True
        if not force_refresh:
            six_hours_ago = timezone.now() - timedelta(hours=6)

            # Look for existing completed analysis
            existing_analysis = ReviewAnalysis.objects.filter(
                business_name__iexact=business_name,
                location__iexact=location,
                status=ReviewAnalysis.Status.COMPLETED,
                created_at__gte=six_hours_ago
            ).order_by('-created_at').first()

            if existing_analysis:
                # Return existing analysis instead of creating new one
                return existing_analysis

        # No recent analysis found or force_refresh requested, create new one
        analysis = ReviewAnalysis.objects.create(**validated_data)

        # Trigger async processing
        from .tasks import process_review_analysis
        process_review_analysis.delay(str(analysis.id))

        return analysis


class EmailCaptureSerializer(serializers.Serializer):
    """Serializer for capturing email during processing"""
    contact_email = serializers.EmailField(required=True)
    contact_name = serializers.CharField(max_length=100, required=False, allow_blank=True)


class ReviewAnalysisStatusSerializer(serializers.ModelSerializer):
    """Lightweight serializer for status polling"""

    class Meta:
        model = ReviewAnalysis
        fields = [
            'id',
            'status',
            'progress_message',
            'progress_percentage',
            'error_message',
        ]


class ReviewAnalysisDetailSerializer(serializers.ModelSerializer):
    """Full serializer with all analysis results"""
    key_issues = serializers.ReadOnlyField()
    sentiment_summary = serializers.ReadOnlyField()
    review_timeframe = serializers.ReadOnlyField()
    public_url = serializers.SerializerMethodField()

    class Meta:
        model = ReviewAnalysis
        fields = [
            'id',
            'business_name',
            'location',
            'status',
            'progress_message',
            'progress_percentage',
            'google_rating',
            'google_address',
            'total_reviews_found',
            'reviews_analyzed',
            'oldest_review_date',
            'newest_review_date',
            'review_timeframe',
            'insights',
            'micro_check_suggestions',
            'key_issues',
            'sentiment_summary',
            'error_message',
            'created_at',
            'completed_at',
            'public_url',
        ]

    def get_public_url(self, obj):
        return obj.get_public_url()


class ReviewAnalysisSummarySerializer(serializers.ModelSerializer):
    """Summary for email/preview"""
    key_issues = serializers.ReadOnlyField()
    sentiment_summary = serializers.ReadOnlyField()

    class Meta:
        model = ReviewAnalysis
        fields = [
            'id',
            'business_name',
            'google_rating',
            'total_reviews_found',
            'reviews_analyzed',
            'key_issues',
            'sentiment_summary',
            'created_at',
        ]
