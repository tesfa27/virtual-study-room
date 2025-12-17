import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'room_{self.room_id}'
        self.user = self.scope.get('user')

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Handle Presence (if authenticated)
        if self.user.is_authenticated:
            # Add user to Redis set of online users
            await self.add_user_to_room(self.room_id, self.user)
            
            # Broadcast updated user list
            await self.broadcast_presence()

    async def disconnect(self, close_code):
        # Remove user from Redis set
        if self.user.is_authenticated:
            await self.remove_user_from_room(self.room_id, self.user)
            await self.broadcast_presence()

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # ... receive method stays the same ...

    async def broadcast_presence(self):
        users = await self.get_room_users(self.room_id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'users': users
            }
        )

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence_update',
            'users': event['users']
        }))

    # Helper methods for Redis Cache (Async wrappers)
    @database_sync_to_async
    def add_user_to_room(self, room_id, user):
        key = f"room:{room_id}:online_users"
        # We store a dict of user info to avoid DB lookups later
        user_data = {'id': str(user.id), 'username': user.username}
        # Get current list
        current_users = cache.get(key, {})
        current_users[str(user.id)] = user_data
        cache.set(key, current_users, timeout=None) # Persistent until explicit remove (or TTL strategy)

    @database_sync_to_async
    def remove_user_from_room(self, room_id, user):
        key = f"room:{room_id}:online_users"
        current_users = cache.get(key, {})
        if str(user.id) in current_users:
            del current_users[str(user.id)]
            cache.set(key, current_users, timeout=None)
            
    @database_sync_to_async
    def get_room_users(self, room_id):
        key = f"room:{room_id}:online_users"
        data = cache.get(key, {})
        return list(data.values())

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        
        # Get user from scope (populated by JWTAuthMiddleware)
        user = self.scope.get('user')
        username = user.username if user and user.is_authenticated else "Anonymous"

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'username': username
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        username = event.get('username', 'Anonymous')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'username': username
        }))
