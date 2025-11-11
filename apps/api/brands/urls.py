from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Register ViewSets with router
router = DefaultRouter()
router.register(r'', views.BrandViewSet, basename='brand')  # /api/brands/

urlpatterns = [
    # Legacy endpoints (kept for backward compatibility)
    path('legacy/', views.BrandListCreateView.as_view(), name='brand-list-create-legacy'),
    path('legacy/<int:pk>/', views.BrandDetailView.as_view(), name='brand-detail-legacy'),

    # Store views (no ViewSet yet, using legacy views)
    path('stores/', views.StoreListCreateView.as_view(), name='store-list-create'),
    path('stores/<int:pk>/', views.StoreDetailView.as_view(), name='store-detail'),

    # Router URLs
    path('', include(router.urls)),
]