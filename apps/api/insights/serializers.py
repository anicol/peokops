from rest_framework import serializers
from .models import ReviewAnalysis


class ReviewAnalysisCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new review analysis"""

    class Meta:
        model = ReviewAnalysis
        fields = ['business_name', 'location', 'source']

    def create(self, validated_data):
        # Create the analysis record
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
