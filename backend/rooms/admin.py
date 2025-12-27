from django.contrib import admin
from .models import Room, RoomMembership, Message, PomodoroSession

# Register your models here.
admin.site.register(Room)
admin.site.register(RoomMembership)
admin.site.register(Message)
admin.site.register(PomodoroSession)
