from django.contrib import admin
from .models import (
    MicroCheckTemplate,
    MicroCheckRun,
    MicroCheckRunItem,
    MicroCheckAssignment,
    MediaAsset,
    MicroCheckResponse,
    CheckCoverage,
    MicroCheckStreak,
    CorrectiveAction
)


@admin.register(MicroCheckTemplate)
class MicroCheckTemplateAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'severity', 'version', 'is_active', 'created_at']
    list_filter = ['category', 'severity', 'is_active']
    search_fields = ['title', 'description']
    readonly_fields = ['id', 'created_at', 'created_by', 'updated_at', 'updated_by']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'category', 'severity', 'title', 'is_active')
        }),
        ('Content', {
            'fields': ('description', 'guidance', 'pass_criteria', 'fail_criteria', 'photo_guidance')
        }),
        ('Versioning', {
            'fields': ('version', 'parent_template')
        }),
        ('Audit', {
            'fields': ('created_at', 'created_by', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )


class MicroCheckRunItemInline(admin.TabularInline):
    model = MicroCheckRunItem
    extra = 0
    readonly_fields = ['id', 'template', 'order', 'template_version']
    fields = ['order', 'template', 'photo_required', 'photo_required_reason', 'title_snapshot']


@admin.register(MicroCheckRun)
class MicroCheckRunAdmin(admin.ModelAdmin):
    list_display = ['id', 'store', 'scheduled_for', 'sequence', 'status', 'completed_at']
    list_filter = ['status', 'retention_policy', 'scheduled_for']
    search_fields = ['store__name', 'id']
    readonly_fields = ['id', 'created_at', 'created_by', 'updated_at', 'updated_by']
    inlines = [MicroCheckRunItemInline]
    fieldsets = (
        ('Run Information', {
            'fields': ('id', 'store', 'scheduled_for', 'sequence', 'status')
        }),
        ('Configuration', {
            'fields': ('store_timezone', 'retention_policy', 'expires_at')
        }),
        ('Completion', {
            'fields': ('completed_at',)
        }),
        ('Audit', {
            'fields': ('created_at', 'created_by', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MicroCheckRunItem)
class MicroCheckRunItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'run', 'template', 'order', 'photo_required']
    list_filter = ['photo_required', 'photo_required_reason']
    search_fields = ['run__id', 'template__title']
    readonly_fields = ['id']


@admin.register(MicroCheckAssignment)
class MicroCheckAssignmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'run', 'manager', 'delivery_method', 'status', 'sent_at', 'access_count']
    list_filter = ['delivery_method', 'status', 'sent_at']
    search_fields = ['run__id', 'manager__email']
    readonly_fields = ['id', 'token_hash', 'first_accessed_at', 'access_count', 'last_access_ip', 'created_at', 'created_by', 'updated_at', 'updated_by']
    fieldsets = (
        ('Assignment', {
            'fields': ('id', 'run', 'manager', 'delivery_method')
        }),
        ('Token', {
            'fields': ('token_hash', 'expires_at', 'status')
        }),
        ('Access Tracking', {
            'fields': ('sent_at', 'first_accessed_at', 'completed_at', 'access_count', 'last_access_ip')
        }),
        ('Audit', {
            'fields': ('created_at', 'created_by', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ['id', 'store', 's3_key', 'file_size_bytes', 'mime_type', 'uploaded_at']
    list_filter = ['mime_type', 'retention_policy', 'uploaded_at']
    search_fields = ['s3_key', 'store__name', 'sha256']
    readonly_fields = ['id', 'sha256', 'uploaded_at', 'uploaded_by']


@admin.register(MicroCheckResponse)
class MicroCheckResponseAdmin(admin.ModelAdmin):
    list_display = ['id', 'run_item', 'store', 'category', 'status', 'severity', 'completed_at']
    list_filter = ['status', 'category', 'severity', 'completed_at']
    search_fields = ['run_item__run__id', 'store__name', 'responder__email']
    readonly_fields = ['id', 'completed_at', 'local_completed_date', 'ip_address', 'user_agent', 'created_at', 'created_by', 'updated_at', 'updated_by']
    fieldsets = (
        ('Response', {
            'fields': ('id', 'run_item', 'store', 'responder', 'status')
        }),
        ('Classification', {
            'fields': ('category', 'severity')
        }),
        ('Details', {
            'fields': ('notes', 'photo', 'pass_fail_override', 'override_reason', 'skip_reason')
        }),
        ('Metadata', {
            'fields': ('completed_at', 'local_completed_date', 'ip_address', 'user_agent')
        }),
        ('Audit', {
            'fields': ('created_at', 'created_by', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CheckCoverage)
class CheckCoverageAdmin(admin.ModelAdmin):
    list_display = ['id', 'store', 'template', 'category', 'last_used_date', 'times_used', 'consecutive_passes', 'consecutive_fails']
    list_filter = ['category', 'last_used_date']
    search_fields = ['store__name', 'template__title']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(MicroCheckStreak)
class MicroCheckStreakAdmin(admin.ModelAdmin):
    list_display = ['id', 'store', 'manager', 'current_streak', 'longest_streak', 'total_completed', 'last_completed_date']
    list_filter = ['last_completed_date']
    search_fields = ['store__name', 'manager__email']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(CorrectiveAction)
class CorrectiveActionAdmin(admin.ModelAdmin):
    list_display = ['id', 'store', 'category', 'severity', 'assigned_to', 'due_date', 'resolved_at']
    list_filter = ['category', 'severity', 'due_date', 'resolved_at']
    search_fields = ['store__name', 'description', 'assigned_to__email']
    readonly_fields = ['id', 'response', 'resolved_at', 'resolved_by', 'created_at', 'created_by', 'updated_at', 'updated_by']
    fieldsets = (
        ('Action', {
            'fields': ('id', 'response', 'store', 'category', 'severity')
        }),
        ('Details', {
            'fields': ('description', 'due_date', 'assigned_to')
        }),
        ('Resolution', {
            'fields': ('resolved_at', 'resolved_by', 'resolution_notes')
        }),
        ('Audit', {
            'fields': ('created_at', 'created_by', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
