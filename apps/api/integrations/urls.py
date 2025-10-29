from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SevenShiftsIntegrationViewSet, GoogleReviewsIntegrationViewSet

router = DefaultRouter()
router.register(r'7shifts', SevenShiftsIntegrationViewSet, basename='7shifts')
router.register(r'google-reviews', GoogleReviewsIntegrationViewSet, basename='google-reviews')

urlpatterns = [
    path('', include(router.urls)),
]
