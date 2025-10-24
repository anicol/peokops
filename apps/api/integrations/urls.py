from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SevenShiftsIntegrationViewSet

router = DefaultRouter()
router.register(r'7shifts', SevenShiftsIntegrationViewSet, basename='7shifts')

urlpatterns = [
    path('', include(router.urls)),
]
