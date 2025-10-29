from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),  # Health endpoints at root
    path('api/', include('core.urls')),  # Admin endpoints under /api/
    path('api/auth/', include('accounts.urls')),
    path('api/brands/', include('brands.urls')),
    path('api/inspections/', include('inspections.urls')),
    path('api/videos/', include('videos.urls')),
    path('api/uploads/', include('uploads.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/marketing/', include('marketing.urls')),
    path('api/micro-checks/', include('micro_checks.urls')),
    path('api/integrations/', include('integrations.urls')),
    path('api/insights/', include('insights.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)