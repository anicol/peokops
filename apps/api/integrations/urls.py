from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SevenShiftsIntegrationViewSet,
    GoogleReviewsIntegrationViewSet,
    YelpReviewsIntegrationViewSet
)
from . import feedback_views

router = DefaultRouter()
router.register(r'7shifts', SevenShiftsIntegrationViewSet, basename='7shifts')
router.register(r'google-reviews', GoogleReviewsIntegrationViewSet, basename='google-reviews')
router.register(r'yelp-reviews', YelpReviewsIntegrationViewSet, basename='yelp-reviews')

urlpatterns = [
    path('', include(router.urls)),
]

# Feedback Dashboard
urlpatterns += [
    path('feedback/overview/', feedback_views.feedback_overview, name='feedback_overview'),
    path('feedback/focus/', feedback_views.create_focus_period, name='create_focus_period'),
]
