from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import onboarding_views

# Create router for viewsets
router = DefaultRouter()
router.register(r'nudges', views.NudgeViewSet, basename='nudge')
router.register(r'behavior', views.BehaviorTrackingViewSet, basename='behavior')
router.register(r'admin/users', views.AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('trial-signup/', views.trial_signup_view, name='trial-signup'),
    path('quick-signup/', views.quick_signup_view, name='quick-signup'),
    path('trial/onboarding/', onboarding_views.complete_onboarding, name='complete-onboarding'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', views.profile_view, name='profile'),
    path('change-password/', views.change_password_view, name='change-password'),
    path('micro-check-config/', views.micro_check_delivery_config_view, name='micro-check-config'),
    path('micro-check-schedule/', views.micro_check_schedule_preview_view, name='micro-check-schedule'),
    path('users/', views.UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:pk>/reinvite/', views.reinvite_user_view, name='user-reinvite'),
    path('impersonate/<int:user_id>/', views.start_impersonation_view, name='start-impersonation'),
    path('stop-impersonation/', views.stop_impersonation_view, name='stop-impersonation'),
    path('nudges/active/', views.get_active_nudges, name='active-nudges'),
    path('', include(router.urls)),
]