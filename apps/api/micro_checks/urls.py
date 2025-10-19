from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MicroCheckTemplateViewSet,
    MicroCheckRunViewSet,
    MicroCheckResponseViewSet,
    MicroCheckStreakViewSet,
    StoreStreakViewSet,
    CorrectiveActionViewSet,
    CheckCoverageViewSet,
    MediaAssetViewSet,
    get_today_checks,
    list_templates
)
from .admin_views import AdminAnalyticsViewSet

router = DefaultRouter()
router.register(r'templates', MicroCheckTemplateViewSet, basename='microcheck-template')
router.register(r'runs', MicroCheckRunViewSet, basename='microcheck-run')
router.register(r'responses', MicroCheckResponseViewSet, basename='microcheck-response')
router.register(r'streaks', MicroCheckStreakViewSet, basename='microcheck-streak')
router.register(r'store-streaks', StoreStreakViewSet, basename='store-streak')
router.register(r'actions', CorrectiveActionViewSet, basename='corrective-action')
router.register(r'coverage', CheckCoverageViewSet, basename='check-coverage')
router.register(r'media', MediaAssetViewSet, basename='media-asset')
router.register(r'admin/analytics', AdminAnalyticsViewSet, basename='admin-analytics')

app_name = 'micro_checks'

urlpatterns = [
    path('today/', get_today_checks, name='today-checks'),
    path('templates/available/', list_templates, name='list-templates'),
    path('', include(router.urls)),
]
