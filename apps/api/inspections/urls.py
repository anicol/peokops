from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Register ViewSets with router
# Note: URLs will be /api/inspections/ (from main urls.py) + these paths
# Order matters: register more specific routes (findings, action-items) before the base route
router = DefaultRouter()
router.register(r'findings', views.FindingViewSet, basename='finding')  # /api/inspections/findings/
router.register(r'action-items', views.ActionItemViewSet, basename='action-item')  # /api/inspections/action-items/
router.register(r'', views.InspectionViewSet, basename='inspection')  # /api/inspections/

urlpatterns = [
    # Legacy endpoints (kept for backward compatibility)
    path('legacy/', views.InspectionListView.as_view(), name='inspection-list-legacy'),
    path('legacy/<int:pk>/', views.InspectionDetailView.as_view(), name='inspection-detail-legacy'),
    path('legacy/<int:inspection_id>/findings/', views.FindingListView.as_view(), name='finding-list-legacy'),
    path('legacy/actions/', views.ActionItemListCreateView.as_view(), name='action-list-create-legacy'),
    path('legacy/actions/<int:pk>/', views.ActionItemDetailView.as_view(), name='action-detail-legacy'),

    # Function-based views (not in ViewSets)
    path('<int:inspection_id>/findings/create/', views.create_manual_finding, name='create-manual-finding'),
    path('findings/<int:finding_id>/approve/', views.approve_finding, name='approve-finding'),
    path('findings/<int:finding_id>/reject/', views.reject_finding, name='reject-finding'),
    path('start/<int:video_id>/', views.start_inspection, name='start-inspection'),
    path('stats/', views.inspection_stats, name='inspection-stats'),

    # Router URLs
    path('', include(router.urls)),
]