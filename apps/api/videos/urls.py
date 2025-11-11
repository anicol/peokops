from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Register ViewSets with router
# Order matters: register more specific routes (video-frames) before the base route
router = DefaultRouter()
router.register(r'video-frames', views.VideoFrameViewSet, basename='video-frame')  # /api/videos/video-frames/
router.register(r'', views.VideoViewSet, basename='video')  # /api/videos/

urlpatterns = [
    # Legacy endpoints (kept for backward compatibility)
    path('legacy/', views.VideoListCreateView.as_view(), name='video-list-create-legacy'),
    path('legacy/<int:pk>/', views.VideoDetailView.as_view(), name='video-detail-legacy'),
    path('legacy/<int:video_id>/frames/', views.VideoFrameListView.as_view(), name='video-frames-legacy'),

    # Function-based views (not in ViewSets)
    path('<int:pk>/reprocess/', views.reprocess_video, name='video-reprocess'),
    path('demo/', views.list_demo_videos, name='demo-videos-list'),
    path('demo/<str:demo_type>/', views.get_demo_video, name='demo-video-detail'),

    # Router URLs
    path('', include(router.urls)),
]