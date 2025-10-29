from django.contrib import admin
from .models import ReviewAnalysis


@admin.register(ReviewAnalysis)
class ReviewAnalysisAdmin(admin.ModelAdmin):
    list_display = [
        'business_name',
        'location',
        'status',
        'google_rating',
        'reviews_analyzed',
        'contact_email',
        'viewed_at',
        'converted_to_trial',
        'created_at',
    ]
    list_filter = ['status', 'converted_to_trial', 'source', 'created_at']
    search_fields = ['business_name', 'location', 'contact_email', 'contact_name']
    readonly_fields = [
        'id',
        'created_at',
        'completed_at',
        'email_sent_at',
        'viewed_at',
        'converted_at',
        'progress_percentage',
    ]
    fieldsets = (
        ('Business Information', {
            'fields': ('business_name', 'location', 'google_rating', 'google_address')
        }),
        ('Contact Information', {
            'fields': ('contact_name', 'contact_email')
        }),
        ('Processing Status', {
            'fields': ('status', 'progress_message', 'progress_percentage', 'error_message')
        }),
        ('Results', {
            'fields': ('total_reviews_found', 'reviews_analyzed', 'scraped_data', 'insights', 'micro_check_suggestions'),
            'classes': ('collapse',)
        }),
        ('Account Link', {
            'fields': ('account', 'converted_to_trial', 'converted_at')
        }),
        ('Metadata', {
            'fields': ('id', 'source', 'created_at', 'completed_at', 'email_sent_at', 'viewed_at'),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        # Don't allow manual creation through admin
        return False
