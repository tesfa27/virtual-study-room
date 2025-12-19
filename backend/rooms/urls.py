from django.urls import path
from .views import RoomListCreateView, RoomDetailView, RoomMessagesView

urlpatterns = [
    path('', RoomListCreateView.as_view(), name='room-list-create'),
    path('<uuid:pk>/', RoomDetailView.as_view(), name='room-detail'),
    path('<uuid:room_id>/messages/', RoomMessagesView.as_view(), name='room-messages'),
]
