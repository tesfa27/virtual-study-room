from django.contrib import admin
from .models import Room, RoomMembership, Message, PomodoroSession, RoomFile, CallSession, CallParticipant, ICEServer

# Register your models here.
admin.site.register(Room)
admin.site.register(RoomMembership)
admin.site.register(Message)
admin.site.register(PomodoroSession)


@admin.register(RoomFile)
class RoomFileAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'room', 'uploaded_by', 'file_size_display', 'download_count', 'created_at']
    list_filter = ['room', 'file_type', 'created_at']
    search_fields = ['original_filename', 'description', 'room__name', 'uploaded_by__username']
    readonly_fields = ['id', 'file_size', 'file_type', 'download_count', 'created_at']
    ordering = ['-created_at']


# WebRTC Call Administration
@admin.register(CallSession)
class CallSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'call_type', 'status', 'initiated_by', 'started_at', 'participant_count']
    list_filter = ['status', 'call_type', 'started_at']
    search_fields = ['room__name', 'initiated_by__username']
    readonly_fields = ['id', 'started_at', 'ended_at', 'duration_seconds']
    ordering = ['-started_at']


@admin.register(CallParticipant)
class CallParticipantAdmin(admin.ModelAdmin):
    list_display = ['user', 'call', 'is_audio_enabled', 'is_video_enabled', 'is_connected', 'joined_at', 'left_at']
    list_filter = ['is_audio_enabled', 'is_video_enabled', 'is_connected']
    search_fields = ['user__username', 'call__room__name']
    readonly_fields = ['id', 'joined_at', 'left_at']


@admin.register(ICEServer)
class ICEServerAdmin(admin.ModelAdmin):
    list_display = ['server_type', 'url', 'is_active', 'priority']
    list_filter = ['server_type', 'is_active']
    search_fields = ['url']
    ordering = ['-priority', 'server_type']

