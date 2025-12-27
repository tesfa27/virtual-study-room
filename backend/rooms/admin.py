from django.contrib import admin
from .models import Room, RoomMembership, Message, PomodoroSession, RoomFile

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
