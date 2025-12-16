from rest_framework import serializers
from .models import Room, RoomMembership
from django.contrib.auth import get_user_model

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
