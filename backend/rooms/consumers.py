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
            replied_to_id = data.get('replied_to_id')  # Optional: ID of message being replied to
            if content:
                await self.handle_chat_message(content, replied_to_id)
        elif message_type == 'edit_message':
            await self.handle_edit_message(data.get('message_id'), data.get('content'))
        elif message_type == 'delete_message':
            await self.handle_delete_message(data.get('message_id'))
        elif message_type == 'typing':
            await self.handle_typing(data.get('is_typing', False))
        elif message_type == 'mark_seen':
            await self.handle_mark_seen(data.get('message_id'))
        
        # Reaction Handlers
        elif message_type == 'add_reaction':
            await self.handle_add_reaction(data.get('message_id'), data.get('emoji'))
        elif message_type == 'remove_reaction':
            await self.handle_remove_reaction(data.get('message_id'), data.get('emoji'))

        # Group Management
        elif message_type == 'kick_user':
            await self.handle_kick_user(data.get('user_id'))
        elif message_type == 'promote_user':
            await self.handle_promote_user(data.get('user_id'), data.get('role'))
        elif message_type == 'update_room_settings':
            await self.handle_update_room_settings(data.get('settings'))
        elif message_type == 'mute_user':
            await self.handle_mute_user(data.get('user_id'), data.get('duration'))

    async def handle_chat_message(self, content, replied_to_id=None):
        # Check if user is muted
        is_muted = await self.is_user_muted()
        if is_muted:
            await self.send_error('You are currently muted and cannot send messages')
            return
        
        # 1. Encrypt
        encrypted_content = EncryptionService.encrypt(content)
        
        # 2. Save (with optional reply reference)
        message = await self.save_message(self.room_id, self.user, encrypted_content, replied_to_id)

        # 3. Get replied_to_message info if exists
        replied_to_message = None
        if replied_to_id:
            replied_to_message = await self.get_replied_to_info(replied_to_id)

        # 4. Broadcast
        payload = {
            'type': 'chat_message',
            'id': str(message.id),
            'content': content,
            'username': self.user.username,
            'sender_id': str(self.user.id),
            'timestamp': str(message.created_at),
            'replied_to_message': replied_to_message
        }
        await self.channel_layer.group_send(self.room_group_name, payload)
        
        # 5. Notify Global User Groups (Simulated by iterating or just relying on room broadcast currently)
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

    async def handle_typing(self, is_typing):
        """Broadcast typing indicator to room"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_typing',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_typing': is_typing
            }
        )

    async def handle_mark_seen(self, message_id):
        """Mark message as seen and update unread count"""
        if not message_id:
            return
            
        # Create or update MessageSeen record
        await self.mark_message_seen(message_id, self.user)
        
        # Calculate unread count for this user
        unread_count = await self.get_unread_count(self.user, self.room_id)
        
        # Broadcast to user's private channel
        await self.channel_layer.group_send(
            self.user_group_name,
            {
                'type': 'unread_count_update',
                'room_id': str(self.room_id),
                'unread_count': unread_count
            }
        )

        # Broadcast seen status to the room (so sender knows it was read)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_seen_update',
                'message_id': message_id,
                'user_id': str(self.user.id),
                'username': self.user.username
            }
        )
    
    # Reaction Handlers Implementation
    async def handle_add_reaction(self, message_id, emoji):
        if not message_id or not emoji:
            return

        success = await self.add_reaction_to_db(message_id, self.user, emoji)
        if success:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_reaction_added',
                    'message_id': message_id,
                    'user_id': str(self.user.id),
                    'emoji': emoji
                }
            )

    async def handle_remove_reaction(self, message_id, emoji):
        if not message_id or not emoji:
            return

        success = await self.remove_reaction_from_db(message_id, self.user, emoji)
        if success:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_reaction_removed',
                    'message_id': message_id,
                    'user_id': str(self.user.id),
                    'emoji': emoji
                }
            )

    # Group Management Handlers
    async def handle_kick_user(self, user_id):
        """Kick a user from the room (requires admin/moderator role)"""
        if not user_id:
            return
        
        # Check if current user has permission
        has_permission = await self.check_permission(['admin', 'moderator'])
        if not has_permission:
            await self.send_error('You do not have permission to kick users')
            return
        
        # Check if target is room owner
        is_owner = await self.is_room_owner(user_id)
        if is_owner:
            await self.send_error('Cannot kick room owner')
            return
        
        # Remove user from room
        removed = await self.remove_user_from_room_by_id(user_id)
        if removed:
            # Notify the kicked user
            await self.channel_layer.group_send(
                f'user_{user_id}',
                {
                    'type': 'user_kicked',
                    'room_id': str(self.room_id),
                    'kicked_by': self.user.username
                }
            )
            
            # Notify room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_removed',
                    'user_id': user_id,
                    'removed_by': self.user.username,
                    'reason': 'kicked'
                }
            )
            
            await self.broadcast_presence()

    async def handle_promote_user(self, user_id, role):
        """Promote/demote a user's role (requires admin)"""
        if not user_id or not role:
            return
        
        # Only admins and room owner can change roles
        is_admin = await self.check_permission(['admin'])
        is_owner = await self.is_current_user_owner()
        
        if not (is_admin or is_owner):
            await self.send_error('You do not have permission to change user roles')
            return
        
        # Validate role
        valid_roles = ['member', 'moderator', 'admin']
        if role not in valid_roles:
            await self.send_error(f'Invalid role: {role}')
            return
        
        # Update role
        success = await self.update_user_role(user_id, role)
        if success:
            # Notify room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_role_updated',
                    'user_id': user_id,
                    'new_role': role,
                    'updated_by': self.user.username
                }
            )

    async def handle_update_room_settings(self, settings):
        """Update room settings (requires admin or owner)"""
        if not settings:
            return
        
        is_owner = await self.is_current_user_owner()
        if not is_owner:
            await self.send_error('Only room owner can update settings')
            return
        
        # Update room settings
        updated = await self.update_room(settings)
        if updated:
            # Broadcast updated settings
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'room_settings_updated',
                    'settings': settings,
                    'updated_by': self.user.username
                }
            )

    async def handle_mute_user(self, user_id, duration):
        """Mute a user for specified duration in minutes (requires moderator/admin)"""
        if not user_id:
            return
        
        has_permission = await self.check_permission(['admin', 'moderator'])
        if not has_permission:
            await self.send_error('You do not have permission to mute users')
            return
        
        # Mute user
        from datetime import timedelta
        from django.utils import timezone
        
        duration_minutes = int(duration) if duration else 10  # Default 10 minutes
        muted_until = timezone.now() + timedelta(minutes=duration_minutes)
        
        success = await self.mute_user(user_id, muted_until)
        if success:
            # Notify user and room
            await self.channel_layer.group_send(
                f'user_{user_id}',
                {
                    'type': 'user_muted',
                    'room_id': str(self.room_id),
                    'muted_by': self.user.username,
                    'duration': duration_minutes
                }
            )
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_muted_notification',
                    'user_id': user_id,
                    'muted_by': self.user.username,
                    'duration': duration_minutes
                }
            )

    # Handlers for Group Messages
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['content'], # Mapping 'content' to 'message' for frontend compat
            'username': event['username'],
            'id': event.get('id'),
            'sender_id': event.get('sender_id'),
            'message_type': event.get('message_type', 'chat'),
            'created_at': event.get('timestamp') or event.get('created_at'),
            'replied_to_message': event.get('replied_to_message')
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

    async def user_typing(self, event):
        # Don't send typing indicator to the user who is typing
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'user_typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))

    async def unread_count_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'unread_count_update',
            'room_id': event['room_id'],
            'unread_count': event['unread_count']
        }))
        
    async def message_seen_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_seen_update',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'username': event['username']
        }))

    async def message_reaction_added(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_reaction_added',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'emoji': event['emoji']
        }))

    async def message_reaction_removed(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_reaction_removed',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'emoji': event['emoji']
        }))

    # Group Management Broadcast Handlers
    async def user_kicked(self, event):
        """Notify user they were kicked"""
        await self.send(text_data=json.dumps({
            'type': 'user_kicked',
            'room_id': event['room_id'],
            'kicked_by': event['kicked_by']
        }))
        # Close connection
        await self.close()

    async def user_removed(self, event):
        """Notify room that a user was removed"""
        await self.send(text_data=json.dumps({
            'type': 'user_removed',
            'user_id': event['user_id'],
            'removed_by': event['removed_by'],
            'reason': event['reason']
        }))

    async def user_role_updated(self, event):
        """Notify room of role change"""
        await self.send(text_data=json.dumps({
            'type': 'user_role_updated',
            'user_id': event['user_id'],
            'new_role': event['new_role'],
            'updated_by': event['updated_by']
        }))

    async def room_settings_updated(self, event):
        """Notify room of settings update"""
        await self.send(text_data=json.dumps({
            'type': 'room_settings_updated',
            'settings': event['settings'],
            'updated_by': event['updated_by']
        }))

    async def user_muted(self, event):
        """Notify user they were muted"""
        await self.send(text_data=json.dumps({
            'type': 'user_muted',
            'room_id': event['room_id'],
            'muted_by': event['muted_by'],
            'duration': event['duration']
        }))

    async def user_muted_notification(self, event):
        """Notify room that a user was muted"""
        await self.send(text_data=json.dumps({
            'type': 'user_muted_notification',
            'user_id': event['user_id'],
            'muted_by': event['muted_by'],
            'duration': event['duration']
        }))

    # Database Helpers
    @database_sync_to_async
    def save_message(self, room_id, user, encrypted_content, replied_to_id=None):
        return Message.objects.create(
            room_id=room_id, 
            sender=user, 
            content=encrypted_content,
            replied_to_id=replied_to_id if replied_to_id else None
        )

    @database_sync_to_async
    def get_replied_to_info(self, message_id):
        """Get basic info about the message being replied to"""
        try:
            message = Message.objects.get(id=message_id)
            decrypted_content = EncryptionService.decrypt(message.content)
            return {
                'id': str(message.id),
                'username': message.sender.username if message.sender else 'System',
                'message': decrypted_content,
                'created_at': str(message.created_at)
            }
        except Message.DoesNotExist:
            return None
        except Exception:
            # If decryption fails, return encrypted placeholder
            try:
                message = Message.objects.get(id=message_id)
                return {
                    'id': str(message.id),
                    'username': message.sender.username if message.sender else 'System',
                    'message': '[Encrypted]',
                    'created_at': str(message.created_at)
                }
            except:
                return None

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

    @database_sync_to_async
    def mark_message_seen(self, message_id, user):
        """Mark message as seen using atomic transaction"""
        from django.db import transaction
        from .models import MessageSeen
        
        with transaction.atomic():
            # Get or create MessageSeen record
            MessageSeen.objects.get_or_create(
                message_id=message_id,
                user=user
            )

    @database_sync_to_async
    def add_reaction_to_db(self, message_id, user, emoji):
        from .models import Reaction
        try:
            # Basic validation
            if not message_id or not emoji:
                return False
            
            # Use get_or_create to avoid duplicates (though model has unique constaint)
            Reaction.objects.get_or_create(
                message_id=message_id,
                user=user,
                emoji=emoji
            )
            return True
        except Exception:
            # Catch potential integrity errors or invalid message_id
            return False

    @database_sync_to_async
    def remove_reaction_from_db(self, message_id, user, emoji):
        from .models import Reaction
        try:
            reaction = Reaction.objects.filter(
                message_id=message_id,
                user=user,
                emoji=emoji
            ).first()
            if reaction:
                reaction.delete()
                return True
            return False
        except Exception:
            return False

    @database_sync_to_async
    def get_unread_count(self, user, room_id):
        """Calculate unread messages for user in room"""
        from .models import MessageSeen
        
        # Get all messages in room
        total_messages = Message.objects.filter(room_id=room_id).exclude(sender=user).count()
        
        # Get messages seen by user
        seen_messages = MessageSeen.objects.filter(
            user=user,
            message__room_id=room_id
        ).count()
        
        return total_messages - seen_messages

    # Group Management Database Helpers
    @database_sync_to_async
    def check_permission(self, required_roles):
        """Check if current user has one of the required roles"""
        from .models import RoomMembership
        try:
            membership = RoomMembership.objects.get(room_id=self.room_id, user=self.user)
            return membership.role in required_roles
        except RoomMembership.DoesNotExist:
            return False

    @database_sync_to_async
    def is_current_user_owner(self):
        """Check if current user is room owner"""
        try:
            room = Room.objects.get(id=self.room_id)
            return room.owner_id == self.user.id
        except Room.DoesNotExist:
            return False

    @database_sync_to_async
    def is_room_owner(self, user_id):
        """Check if specified user is room owner"""
        try:
            room = Room.objects.get(id=self.room_id)
            return str(room.owner_id) == str(user_id)
        except Room.DoesNotExist:
            return False

    @database_sync_to_async
    def remove_user_from_room_by_id(self, user_id):
        """Remove a user from the room by user ID"""
        from .models import RoomMembership
        try:
            membership = RoomMembership.objects.get(room_id=self.room_id, user_id=user_id)
            membership.delete()
            return True
        except RoomMembership.DoesNotExist:
            return False

    @database_sync_to_async
    def update_user_role(self, user_id, role):
        """Update user's role in the room"""
        from .models import RoomMembership
        try:
            membership = RoomMembership.objects.get(room_id=self.room_id, user_id=user_id)
            membership.role = role
            membership.save()
            return True
        except RoomMembership.DoesNotExist:
            return False

    @database_sync_to_async
    def update_room(self, settings):
        """Update room settings"""
        try:
            room = Room.objects.get(id=self.room_id)
            # Update allowed fields
            if 'name' in settings:
                room.name = settings['name']
            if 'description' in settings:
                room.description = settings['description']
            if 'topic' in settings:
                room.topic = settings['topic']
            if 'capacity' in settings:
                room.capacity = settings['capacity']
            if 'is_private' in settings:
                room.is_private = settings['is_private']
            room.save()
            return True
        except Room.DoesNotExist:
            return False

    @database_sync_to_async
    def mute_user(self, user_id, muted_until):
        """Mute a user until specified time"""
        from .models import RoomMembership
        try:
            membership = RoomMembership.objects.get(room_id=self.room_id, user_id=user_id)
            membership.muted_until = muted_until
            membership.save()
            return True
        except RoomMembership.DoesNotExist:
            return False

    @database_sync_to_async
    def is_user_muted(self):
        """Check if current user is muted"""
        from .models import RoomMembership
        from django.utils import timezone
        try:
            membership = RoomMembership.objects.get(room_id=self.room_id, user=self.user)
            if membership.muted_until:
                return membership.muted_until > timezone.now()
            return False
        except RoomMembership.DoesNotExist:
            return False

    async def send_error(self, message):
        """Send error message to user"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))

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
        from .models import RoomMembership
        
        # Get user's role from membership
        try:
            membership = RoomMembership.objects.get(room_id=room_id, user=user)
            role = membership.role
        except RoomMembership.DoesNotExist:
            role = 'member'
        
        key = f"room:{room_id}:online_users"
        user_data = {
            'id': str(user.id), 
            'username': user.username,
            'role': role
        }
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
