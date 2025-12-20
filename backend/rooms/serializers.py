from rest_framework import serializers
from .models import Room, RoomMembership, Message
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

class MessageSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    sender_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'username', 'sender_id', 'is_edited', 'created_at', 'message_type']
        read_only_fields = ['id', 'username', 'sender_id', 'is_edited', 'created_at', 'message_type']
    
    def get_username(self, obj):
        return obj.sender.username if obj.sender else 'System'

    def get_sender_id(self, obj):
        return str(obj.sender.id) if obj.sender else None
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Decrypt content for display
        try:
            data['message'] = EncryptionService.decrypt(instance.content)
        except:
            data['message'] = '[Encrypted]'
            
        # Get list of user IDs who have seen this message
        data['seen_by'] = list(map(str, instance.seen_by.values_list('user_id', flat=True)))
        return data
