from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'pulses', views.EmployeeVoicePulseViewSet, basename='employeevoicepulse')
router.register(r'invitations', views.EmployeeVoiceInvitationViewSet, basename='employeevoiceinvitation')
router.register(r'responses', views.EmployeeVoiceResponseViewSet, basename='employeevoiceresponse')
router.register(r'auto-fix-configs', views.AutoFixFlowConfigViewSet, basename='autofixflowconfig')
router.register(r'correlations', views.CrossVoiceCorrelationViewSet, basename='crossvoicecorrelation')

urlpatterns = [
    # Magic link endpoints (no authentication required)
    path('magic-link/<str:token>/', views.validate_magic_link, name='validate-magic-link'),
    path('submit/', views.submit_survey_response, name='submit-survey-response'),

    # ViewSet endpoints (authentication required)
    path('', include(router.urls)),
]
