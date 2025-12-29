from django.db import models
from django.conf import settings
import uuid

class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    topic = models.CharField(max_length=100, blank=True)
    is_private = models.BooleanField(default=False)
    capacity = models.PositiveIntegerField(default=10)
    
    # Relationships
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_rooms')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class RoomMembership(models.Model):
    ROLE_CHOICES = [
        ('member', 'Member'),
        ('moderator', 'Moderator'),
        ('admin', 'Admin'),
    ]
    
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='room_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    muted_until = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('room', 'user')

    def __str__(self):
        return f"{self.user.username} in {self.room.name}"

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    content = models.TextField() # Encrypted content
    is_edited = models.BooleanField(default=False)
    
    # Reply feature: reference to the message being replied to
    replied_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    # Optional file attachment
    file = models.ForeignKey('RoomFile', on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    
    MESSAGE_TYPES = [
        ('chat', 'Chat'),
        ('file', 'File'),
        ('join', 'Join'),
        ('leave', 'Leave'),
        ('system', 'System'),
    ]
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='chat')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Message by {self.sender} in {self.room}"

class MessageSeen(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='seen_by')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='seen_messages')
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')
        indexes = [
            models.Index(fields=['user', 'message']),
        ]

    def __str__(self):
        return f"{self.user.username} saw message {self.message.id}"

class Reaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='message_reactions')
    emoji = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'message', 'emoji')
        indexes = [
            models.Index(fields=['message', 'emoji']),
        ]

    def __str__(self):
        return f"{self.user.username} reacted {self.emoji} to message {self.message.id}"

class PomodoroSession(models.Model):
    PHASE_CHOICES = (
        ('work', 'Focus'),
        ('short_break', 'Short Break'),
        ('long_break', 'Long Break'),
    )

    room = models.OneToOneField(Room, on_delete=models.CASCADE, related_name='pomodoro')
    phase = models.CharField(max_length=20, choices=PHASE_CHOICES, default='work')
    is_running = models.BooleanField(default=False)
    start_time = models.DateTimeField(null=True, blank=True)
    remaining_seconds = models.IntegerField(default=25*60) 
    
    # Settings
    work_duration = models.IntegerField(default=25*60)
    short_break_duration = models.IntegerField(default=5*60)
    long_break_duration = models.IntegerField(default=15*60)

    def get_current_remaining(self):
        if not self.is_running or not self.start_time:
            return self.remaining_seconds
        
        from django.utils import timezone
        now = timezone.now()
        elapsed = (now - self.start_time).total_seconds()
        return max(0, self.remaining_seconds - int(elapsed))

    def __str__(self):
        return f"Pomodoro for {self.room.name}"


def room_file_path(instance, filename):
    """Generate upload path: room_files/<room_id>/<uuid>_<filename>"""
    import os
    ext = os.path.splitext(filename)[1]
    new_filename = f"{uuid.uuid4()}{ext}"
    return f"room_files/{instance.room.id}/{new_filename}"


class RoomFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='files')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='uploaded_files'
    )
    
    # File info
    file = models.FileField(upload_to=room_file_path)
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()  # in bytes
    file_type = models.CharField(max_length=100)  # MIME type
    
    # Metadata
    description = models.TextField(blank=True)
    download_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room', '-created_at']),
        ]

    def __str__(self):
        return f"{self.original_filename} in {self.room.name}"

    @property
    def file_extension(self):
        import os
        return os.path.splitext(self.original_filename)[1].lower()

    @property
    def is_image(self):
        return self.file_type.startswith('image/')

    @property
    def file_size_display(self):
        """Human-readable file size"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"


# ============================================================================
# WebRTC Call Models
# ============================================================================

class CallSession(models.Model):
    """
    Represents an active voice/video call session in a room.
    Only one active call per room at a time.
    """
    CALL_TYPE_CHOICES = [
        ('audio', 'Audio Only'),
        ('video', 'Video Call'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('ended', 'Ended'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='call_sessions')
    
    # Call metadata
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES, default='video')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    
    # Who initiated the call
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='initiated_calls'
    )
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Settings
    max_participants = models.PositiveIntegerField(default=10)
    
    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['room', 'status']),
        ]
    
    def __str__(self):
        return f"Call in {self.room.name} ({self.status})"
    
    @property
    def duration_seconds(self):
        """Calculate call duration in seconds"""
        from django.utils import timezone
        end = self.ended_at or timezone.now()
        return int((end - self.started_at).total_seconds())
    
    @property
    def participant_count(self):
        return self.participants.filter(left_at__isnull=True).count()


class CallParticipant(models.Model):
    """
    Tracks individual participants in a call session.
    Stores their media state (audio/video on/off).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    call = models.ForeignKey(CallSession, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='call_participations'
    )
    
    # Media state
    is_audio_enabled = models.BooleanField(default=True)
    is_video_enabled = models.BooleanField(default=True)
    is_screen_sharing = models.BooleanField(default=False)
    
    # Connection state
    is_connected = models.BooleanField(default=False)
    
    # Timestamps
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('call', 'user')
        ordering = ['joined_at']
        indexes = [
            models.Index(fields=['call', 'user']),
        ]
    
    def __str__(self):
        status = "active" if self.left_at is None else "left"
        return f"{self.user.username} in call ({status})"
    
    @property
    def is_active(self):
        return self.left_at is None


class ICEServer(models.Model):
    """
    STUN/TURN server configuration for WebRTC.
    Allows admin to configure ICE servers without code changes.
    """
    SERVER_TYPE_CHOICES = [
        ('stun', 'STUN'),
        ('turn', 'TURN'),
        ('turns', 'TURNS'),
    ]
    
    server_type = models.CharField(max_length=5, choices=SERVER_TYPE_CHOICES)
    url = models.CharField(max_length=255, help_text="e.g., stun:stun.l.google.com:19302")
    username = models.CharField(max_length=100, blank=True)
    credential = models.CharField(max_length=255, blank=True)
    
    is_active = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=0, help_text="Higher priority servers are used first")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-priority', 'server_type']
        verbose_name = "ICE Server"
        verbose_name_plural = "ICE Servers"
    
    def __str__(self):
        return f"{self.server_type.upper()}: {self.url}"
    
    def to_ice_server_dict(self):
        """Convert to WebRTC RTCIceServer format"""
        server = {"urls": self.url}
        if self.username:
            server["username"] = self.username
        if self.credential:
            server["credential"] = self.credential
        return server

