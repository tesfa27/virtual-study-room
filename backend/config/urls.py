from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # API endpoints will be prefixed with 'api/'
    path('api/auth/', include('users.urls')),
    path('api/rooms/', include('rooms.urls')),  # Include Rooms API
    path('api/', include('rooms.urls')), # Placeholder for room endpoints
]
