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
        fields = ['id', 'room', 'user', 'username', 'joined_at']
        read_only_fields = ['id', 'user', 'joined_at']

class MessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='sender.username', read_only=True)
    sender_id = serializers.CharField(source='sender.id', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'username', 'sender_id', 'is_edited', 'created_at']
        read_only_fields = ['id', 'username', 'sender_id', 'is_edited', 'created_at']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Decrypt content for display
        try:
            data['message'] = EncryptionService.decrypt(instance.content)
        except:
            data['message'] = '[Encrypted]'
        return data
