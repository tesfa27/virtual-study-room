from rest_framework import serializers
from .models import Room, RoomMembership, Message, MessageSeen, Reaction, PomodoroSession, RoomFile
from django.contrib.auth import get_user_model
from utils.encryption_service import EncryptionService

User = get_user_model()

class RoomSerializer(serializers.ModelSerializer):
    owner_username = serializers.ReadOnlyField(source='owner.username')
    active_members_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'name', 'description', 'topic', 'is_private', 
            'capacity', 'owner', 'owner_username', 
            'created_at', 'active_members_count'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'active_members_count']

    def get_active_members_count(self, obj):
        # For now, just count memberships. Later this can refer to Redis active users.
        return obj.memberships.count()

    def validate_capacity(self, value):
        if value > 50:
            raise serializers.ValidationError("Maximum room capacity is 50 users.")
        if value < 1:
            raise serializers.ValidationError("Capacity must be at least 1.")
        return value

class RoomMembershipSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = RoomMembership
        fields = ['id', 'room', 'user', 'username', 'role', 'joined_at']
        read_only_fields = ['id', 'user', 'joined_at']

class ReactionSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Reaction
        fields = ['id', 'emoji', 'user', 'username', 'created_at']
        read_only_fields = ['id', 'user', 'username', 'created_at']


class RoomFileSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.ReadOnlyField(source='uploaded_by.username')
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.ReadOnlyField()
    is_image = serializers.ReadOnlyField()
    file_extension = serializers.ReadOnlyField()

    class Meta:
        model = RoomFile
        fields = [
            'id', 'room', 'uploaded_by', 'uploaded_by_username',
            'file', 'file_url', 'original_filename', 'file_size', 'file_size_display',
            'file_type', 'file_extension', 'is_image',
            'description', 'download_count', 'created_at'
        ]
        read_only_fields = [
            'id', 'room', 'uploaded_by', 'uploaded_by_username',
            'file_url', 'file_size', 'file_size_display', 'file_type',
            'file_extension', 'is_image', 'download_count', 'created_at'
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class MessageSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    sender_id = serializers.SerializerMethodField()
    replied_to_message = serializers.SerializerMethodField()
    
    file = RoomFileSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'username', 'sender_id', 'is_edited', 'created_at', 'message_type', 'replied_to', 'replied_to_message', 'file']
        read_only_fields = ['id', 'username', 'sender_id', 'is_edited', 'created_at', 'message_type', 'replied_to_message']
    
    def get_username(self, obj):
        return obj.sender.username if obj.sender else 'System'

    def get_sender_id(self, obj):
        return str(obj.sender.id) if obj.sender else None
    
    def get_replied_to_message(self, obj):
        """Return basic info about the message being replied to"""
        if not obj.replied_to:
            return None
        
        try:
            from utils.encryption_service import EncryptionService
            return {
                'id': str(obj.replied_to.id),
                'username': obj.replied_to.sender.username if obj.replied_to.sender else 'System',
                'message': EncryptionService.decrypt(obj.replied_to.content),
                'created_at': obj.replied_to.created_at
            }
        except:
            return {
                'id': str(obj.replied_to.id),
                'username': obj.replied_to.sender.username if obj.replied_to.sender else 'System',
                'message': '[Encrypted]',
                'created_at': obj.replied_to.created_at
            }
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Decrypt content for display
        try:
            data['message'] = EncryptionService.decrypt(instance.content)
        except:
            data['message'] = '[Encrypted]'
            
        # Get list of user IDs who have seen this message
        data['seen_by'] = list(map(str, instance.seen_by.values_list('user_id', flat=True)))
        
        # Aggregate reactions
        reactions = {}
        for reaction in instance.reactions.all():
            if reaction.emoji not in reactions:
                reactions[reaction.emoji] = []
            reactions[reaction.emoji].append(str(reaction.user.id))
        
        data['reactions'] = reactions
        return data

class PomodoroSerializer(serializers.ModelSerializer):
    current_time = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = PomodoroSession
        fields = ['id', 'phase', 'is_running', 'start_time', 'remaining', 'work_duration', 'short_break_duration', 'long_break_duration', 'current_time']

    def get_remaining(self, obj):
        return obj.get_current_remaining()

    def get_current_time(self, obj):
        from django.utils import timezone
        return timezone.now().isoformat()


class RoomFileSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.ReadOnlyField(source='uploaded_by.username')
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.ReadOnlyField()
    is_image = serializers.ReadOnlyField()
    file_extension = serializers.ReadOnlyField()

    class Meta:
        model = RoomFile
        fields = [
            'id', 'room', 'uploaded_by', 'uploaded_by_username',
            'file', 'file_url', 'original_filename', 'file_size', 'file_size_display',
            'file_type', 'file_extension', 'is_image',
            'description', 'download_count', 'created_at'
        ]
        read_only_fields = [
            'id', 'room', 'uploaded_by', 'uploaded_by_username',
            'file_url', 'file_size', 'file_size_display', 'file_type',
            'file_extension', 'is_image', 'download_count', 'created_at'
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


# ============================================================================
# WebRTC Call Serializers
# ============================================================================

from .models import CallSession, CallParticipant, ICEServer


class CallParticipantSerializer(serializers.ModelSerializer):
    """Serializer for call participants"""
    username = serializers.ReadOnlyField(source='user.username')
    user_id = serializers.ReadOnlyField(source='user.id')
    
    class Meta:
        model = CallParticipant
        fields = [
            'id', 'user_id', 'username',
            'is_audio_enabled', 'is_video_enabled', 'is_screen_sharing',
            'is_connected', 'joined_at', 'left_at', 'is_active'
        ]
        read_only_fields = ['id', 'user_id', 'username', 'joined_at', 'left_at', 'is_active']


class CallSessionSerializer(serializers.ModelSerializer):
    """Serializer for call sessions with nested participants"""
    participants = CallParticipantSerializer(many=True, read_only=True)
    initiated_by_username = serializers.ReadOnlyField(source='initiated_by.username')
    participant_count = serializers.ReadOnlyField()
    duration_seconds = serializers.ReadOnlyField()
    
    class Meta:
        model = CallSession
        fields = [
            'id', 'room', 'call_type', 'status',
            'initiated_by', 'initiated_by_username',
            'started_at', 'ended_at', 'duration_seconds',
            'max_participants', 'participant_count', 'participants'
        ]
        read_only_fields = [
            'id', 'room', 'initiated_by', 'initiated_by_username',
            'started_at', 'ended_at', 'duration_seconds',
            'participant_count', 'participants'
        ]


class CallSessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing calls (without full participant details)"""
    initiated_by_username = serializers.ReadOnlyField(source='initiated_by.username')
    participant_count = serializers.ReadOnlyField()
    
    class Meta:
        model = CallSession
        fields = [
            'id', 'room', 'call_type', 'status',
            'initiated_by_username', 'started_at', 'participant_count'
        ]


class ICEServerSerializer(serializers.ModelSerializer):
    """Serializer for ICE server configuration"""
    
    class Meta:
        model = ICEServer
        fields = ['server_type', 'url', 'username', 'credential']
    
    def to_representation(self, instance):
        """Return in RTCIceServer format"""
        return instance.to_ice_server_dict()


