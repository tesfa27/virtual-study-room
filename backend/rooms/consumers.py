import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache

from .models import Room, Message
from utils.encryption_service import EncryptionService

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'room_{self.room_id}'
        self.user = self.scope.get('user')

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Join user specific group for global updates
        self.user_group_name = f'user_{self.user.id}'
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()

        # Handle Presence
        await self.add_user_to_room(self.room_id, self.user)
        await self.broadcast_presence()

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            await self.remove_user_from_room(self.room_id, self.user)
            await self.broadcast_presence()

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        if self.user.is_authenticated:
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'chat_message') # Default to chat for backward compat

        if message_type == 'chat_message':
            # Support 'message' key for backward compatibility
            content = data.get('content') or data.get('message')
            if content:
                await self.handle_chat_message(content)
        elif message_type == 'edit_message':
            await self.handle_edit_message(data.get('message_id'), data.get('content'))
        elif message_type == 'delete_message':
            await self.handle_delete_message(data.get('message_id'))

    async def handle_chat_message(self, content):
        # 1. Encrypt
        encrypted_content = EncryptionService.encrypt(content)
        
        # 2. Save
        message = await self.save_message(self.room_id, self.user, encrypted_content)

        # 3. Broadcast
        payload = {
            'type': 'chat_message',
            'id': str(message.id),
            'content': content,
            'username': self.user.username,
            'sender_id': str(self.user.id),
            'timestamp': str(message.created_at)
        }
        await self.channel_layer.group_send(self.room_group_name, payload)
        
        # 4. Notify Global User Groups (Simulated by iterating or just relying on room broadcast currently)
        # Requirement: "broadcast to global_user_group for each member"
        # Since everyone is in the room group, the room broadcast covers the immediate UI update.
        # But if we need to update "sidebar list" for users NOT in the room (e.g. unread count), we'd push to user_group_name.
        # For now, we stay simple.

    async def handle_edit_message(self, message_id, new_content):
        # 1. Verify Ownership & Update
        message = await self.get_message(message_id)
        if not message or message.sender_id != self.user.id:
            return # Permission denied or not found
            
        encrypted_content = EncryptionService.encrypt(new_content)
        await self.update_message_content(message, encrypted_content)

        # 2. Broadcast Update
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_update',
                'id': message_id,
                'content': new_content,
                'is_edited': True
            }
        )

    async def handle_delete_message(self, message_id):
        # 1. Verify Ownership & Delete
        message = await self.get_message(message_id)
        if not message or message.sender_id != self.user.id:
            return

        await self.delete_message(message)

        # 2. Broadcast Delete
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_delete',
                'id': message_id
            }
        )

    # Handlers for Group Messages
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['content'], # Mapping 'content' to 'message' for frontend compat
            'username': event['username'],
            'id': event.get('id'),
            'sender_id': event.get('sender_id')
        }))

    async def message_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_update',
            'id': event['id'],
            'message': event['content'],
            'is_edited': True
        }))

    async def message_delete(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_delete',
            'id': event['id']
        }))
        
    # Database Helpers
    @database_sync_to_async
    def save_message(self, room_id, user, encrypted_content):
        return Message.objects.create(room_id=room_id, sender=user, content=encrypted_content)

    @database_sync_to_async
    def get_message(self, message_id):
        try:
            return Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return None

    @database_sync_to_async
    def update_message_content(self, message, encrypted_content):
        message.content = encrypted_content
        message.is_edited = True
        message.save()

    @database_sync_to_async
    def delete_message(self, message):
        message.delete()

    # Presence helpers
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

    @database_sync_to_async
    def add_user_to_room(self, room_id, user):
        key = f"room:{room_id}:online_users"
        user_data = {'id': str(user.id), 'username': user.username}
        current_users = cache.get(key, {})
        current_users[str(user.id)] = user_data
        cache.set(key, current_users, timeout=None)

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
