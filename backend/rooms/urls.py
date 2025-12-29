from django.urls import path
from .views import (
    RoomListCreateView, RoomDetailView, RoomMessagesView, 
    JoinRoomView, LeaveRoomView, RoomMembersView, RoomPomodoroView,
    RoomFileListCreateView, RoomFileDetailView,
    # WebRTC Call Views
    RoomCallView, RoomCallLeaveView, RoomCallEndView, ICEServersView
)

urlpatterns = [
    path('', RoomListCreateView.as_view(), name='room-list-create'),
    path('<uuid:pk>/', RoomDetailView.as_view(), name='room-detail'),
    path('<uuid:room_id>/messages/', RoomMessagesView.as_view(), name='room-messages'),
    path('<uuid:room_id>/join/', JoinRoomView.as_view(), name='room-join'),
    path('<uuid:room_id>/leave/', LeaveRoomView.as_view(), name='room-leave'),
    path('<uuid:room_id>/members/', RoomMembersView.as_view(), name='room-members'),
    path('<uuid:room_id>/pomodoro/', RoomPomodoroView.as_view(), name='room-pomodoro'),
    # File sharing
    path('<uuid:room_id>/files/', RoomFileListCreateView.as_view(), name='room-files'),
    path('<uuid:room_id>/files/<uuid:file_id>/', RoomFileDetailView.as_view(), name='room-file-detail'),
    # WebRTC Calls
    path('<uuid:room_id>/call/', RoomCallView.as_view(), name='room-call'),
    path('<uuid:room_id>/call/leave/', RoomCallLeaveView.as_view(), name='room-call-leave'),
    path('<uuid:room_id>/call/end/', RoomCallEndView.as_view(), name='room-call-end'),
    path('ice-servers/', ICEServersView.as_view(), name='ice-servers'),
]

