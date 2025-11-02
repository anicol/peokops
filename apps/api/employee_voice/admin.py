from django.contrib import admin
from .models import (
    EmployeeVoicePulse,
    EmployeeVoiceInvitation,
    EmployeeVoiceResponse,
    AutoFixFlowConfig,
    CrossVoiceCorrelation
)


@admin.register(EmployeeVoicePulse)
class EmployeeVoicePulseAdmin(admin.ModelAdmin):
    list_display = ['title', 'store', 'status', 'shift_window', 'language', 'unlocked_at', 'is_active', 'created_at']
    list_filter = ['status', 'shift_window', 'language', 'is_active', 'auto_fix_flow_enabled']
    search_fields = ['title', 'description', 'store__name', 'account__name']
    readonly_fields = ['id', 'unlocked_at', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'description', 'store', 'account')
        }),
        ('Schedule', {
            'fields': ('shift_window', 'language', 'send_time')
        }),
        ('Status', {
            'fields': ('status', 'unlocked_at', 'is_active')
        }),
        ('Privacy Settings', {
            'fields': ('min_respondents_for_display', 'consent_text')
        }),
        ('Features', {
            'fields': ('auto_fix_flow_enabled',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EmployeeVoiceInvitation)
class EmployeeVoiceInvitationAdmin(admin.ModelAdmin):
    list_display = ['id', 'pulse', 'delivery_method', 'status', 'sent_at', 'opened_at', 'completed_at', 'expires_at']
    list_filter = ['delivery_method', 'status']
    search_fields = ['pulse__title', 'recipient_phone', 'recipient_email']
    readonly_fields = ['id', 'sent_at', 'opened_at', 'completed_at', 'created_at', 'updated_at']
    fieldsets = (
        ('Invitation', {
            'fields': ('id', 'pulse', 'token')
        }),
        ('Delivery', {
            'fields': ('delivery_method', 'recipient_phone', 'recipient_email')
        }),
        ('Status', {
            'fields': ('status', 'sent_at', 'opened_at', 'completed_at', 'expires_at')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EmployeeVoiceResponse)
class EmployeeVoiceResponseAdmin(admin.ModelAdmin):
    list_display = ['id', 'pulse', 'mood', 'confidence', 'bottlenecks', 'completed_at']
    list_filter = ['mood', 'confidence', 'completed_at']
    search_fields = ['pulse__title', 'comment']
    readonly_fields = ['id', 'anonymous_hash', 'submitted_at', 'completed_at', 'ip_address', 'user_agent']
    fieldsets = (
        ('Response', {
            'fields': ('id', 'pulse', 'invitation', 'anonymous_hash')
        }),
        ('Survey Answers', {
            'fields': ('mood', 'confidence', 'bottlenecks', 'comment')
        }),
        ('Metadata', {
            'fields': ('submitted_at', 'completed_at', 'ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        """Limit anonymous_hash visibility"""
        qs = super().get_queryset(request)
        return qs


@admin.register(AutoFixFlowConfig)
class AutoFixFlowConfigAdmin(admin.ModelAdmin):
    list_display = ['pulse', 'bottleneck_threshold', 'time_window_days', 'is_enabled', 'notify_on_creation']
    list_filter = ['is_enabled', 'notify_on_creation']
    search_fields = ['pulse__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Configuration', {
            'fields': ('id', 'pulse')
        }),
        ('Thresholds', {
            'fields': ('bottleneck_threshold', 'time_window_days', 'bottleneck_to_category_map')
        }),
        ('Settings', {
            'fields': ('is_enabled', 'notify_on_creation')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CrossVoiceCorrelation)
class CrossVoiceCorrelationAdmin(admin.ModelAdmin):
    list_display = ['pulse', 'correlation_type', 'strength', 'bottleneck_type', 'is_actionable', 'is_resolved', 'created_at']
    list_filter = ['correlation_type', 'strength', 'is_actionable', 'is_resolved']
    search_fields = ['pulse__title', 'recommendation_text']
    readonly_fields = ['id', 'created_at', 'updated_at', 'resolved_at']
    fieldsets = (
        ('Correlation', {
            'fields': ('id', 'pulse', 'correlation_type', 'strength')
        }),
        ('Voice Data', {
            'fields': ('bottleneck_type', 'avg_mood_score', 'avg_confidence_score')
        }),
        ('Check Data', {
            'fields': ('check_category', 'check_fail_rate')
        }),
        ('Recommendation', {
            'fields': ('recommendation_text', 'is_actionable', 'action_item')
        }),
        ('Time Window', {
            'fields': ('time_window_start', 'time_window_end')
        }),
        ('Status', {
            'fields': ('is_resolved', 'resolved_at')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
