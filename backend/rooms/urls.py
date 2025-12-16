from django.urls import path
from .views import RoomListCreateView, RoomDetailView

urlpatterns = [
    path('', RoomListCreateView.as_view(), name='room-list-create'),
    path('<uuid:pk>/', RoomDetailView.as_view(), name='room-detail'),
]
