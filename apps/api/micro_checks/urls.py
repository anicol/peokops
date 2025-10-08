from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MicroCheckTemplateViewSet,
    MicroCheckRunViewSet,
    MicroCheckResponseViewSet,
    MicroCheckStreakViewSet,
    CorrectiveActionViewSet,
    CheckCoverageViewSet
)

router = DefaultRouter()
router.register(r'templates', MicroCheckTemplateViewSet, basename='microcheck-template')
router.register(r'runs', MicroCheckRunViewSet, basename='microcheck-run')
router.register(r'responses', MicroCheckResponseViewSet, basename='microcheck-response')
router.register(r'streaks', MicroCheckStreakViewSet, basename='microcheck-streak')
router.register(r'actions', CorrectiveActionViewSet, basename='corrective-action')
router.register(r'coverage', CheckCoverageViewSet, basename='check-coverage')

app_name = 'micro_checks'

urlpatterns = [
    path('', include(router.urls)),
]
