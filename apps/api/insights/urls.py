from django.urls import path
from . import views

app_name = 'insights'

urlpatterns = [
    # Public endpoints (no auth required)
    path('start/', views.start_analysis, name='start-analysis'),
    path('status/<uuid:analysis_id>/', views.analysis_status, name='analysis-status'),
    path('results/<uuid:analysis_id>/', views.analysis_detail, name='analysis-detail'),
    path('capture-email/<uuid:analysis_id>/', views.capture_email, name='capture-email'),
    path('share/<uuid:analysis_id>/', views.share_analysis, name='share-analysis'),

    # Authenticated endpoints
    path('store/<int:store_id>/summary/', views.insights_summary, name='insights-summary'),
    path('by-place/<str:place_id>/', views.analysis_by_place_id, name='analysis-by-place'),
]
