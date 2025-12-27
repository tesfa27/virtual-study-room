from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    # API endpoints will be prefixed with 'api/'
    path('api/auth/', include('users.urls')),
    path('api/rooms/', include('rooms.urls')),  # Include Rooms API
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
