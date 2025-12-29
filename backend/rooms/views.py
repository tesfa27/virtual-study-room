from rest_framework import generics, permissions, filters, exceptions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.conf import settings
from rest_framework.pagination import PageNumberPagination
from .models import Room, RoomMembership, Message, PomodoroSession, RoomFile
from .serializers import RoomSerializer, MessageSerializer, RoomMembershipSerializer, PomodoroSerializer, RoomFileSerializer
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from utils.encryption_service import EncryptionService
import os
import mimetypes
import json
from django.core.serializers.json import DjangoJSONEncoder

class RoomPomodoroView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, room_id):
        room = get_object_or_404(Room, id=room_id)
        session, created = PomodoroSession.objects.get_or_create(room=room)
        return session

    def check_write_permission(self, room_id, user):
        # Check if user is owner of the room
        room = get_object_or_404(Room, id=room_id)
        if room.owner == user:
            return

        # Check if user is admin or moderator
        if not RoomMembership.objects.filter(
            room_id=room_id, 
            user=user, 
            role__in=['admin', 'moderator']
        ).exists():
            raise exceptions.PermissionDenied("Only admins can control the timer.")

    def get(self, request, room_id):
        session = self.get_object(room_id)
        serializer = PomodoroSerializer(session)
        return Response(serializer.data)

    def post(self, request, room_id):
        action = request.data.get('action')
        session = self.get_object(room_id)
        
        # Verify user is a room member
        self.check_write_permission(room_id, request.user)

        if action == 'start':
            if not session.is_running:
                session.start_time = timezone.now()
                session.is_running = True
                session.save()
        elif action == 'pause':
            if session.is_running:
                # Calculate remaining and save
                session.remaining_seconds = session.get_current_remaining()
                session.is_running = False
                session.start_time = None
                session.save()
        elif action == 'reset':
             # Stop and reset to default for current phase
             session.is_running = False
             session.start_time = None
             if session.phase == 'work':
                 session.remaining_seconds = session.work_duration
             elif session.phase == 'short_break':
                 session.remaining_seconds = session.short_break_duration
             elif session.phase == 'long_break':
                 session.remaining_seconds = session.long_break_duration
             session.save()
        elif action == 'set_phase':
             phase = request.data.get('phase')
             if phase in dict(PomodoroSession.PHASE_CHOICES):
                 session.phase = phase
                 session.is_running = False
                 session.start_time = None
                 # Set duration based on phase
                 if phase == 'work':
                     session.remaining_seconds = session.work_duration
                 elif phase == 'short_break':
                     session.remaining_seconds = session.short_break_duration
                 elif phase == 'long_break':
                     session.remaining_seconds = session.long_break_duration
                 session.save()
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        # Broadcast update
        serializer = PomodoroSerializer(session)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"room_{room_id}",
            {
                "type": "pomodoro_update",
                "data": serializer.data
            }
        )
        
        return Response(serializer.data)

class RoomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class RoomListCreateView(generics.ListCreateAPIView):
    queryset = Room.objects.all().order_by('-created_at')
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = RoomPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'topic']

    def perform_create(self, serializer):
        room = serializer.save(owner=self.request.user)
        # Automatically create admin membership for room owner
        RoomMembership.objects.create(
            room=room,
            user=self.request.user,
            role='admin'
        )

class RoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Optional: restrict updates to owner, read to everyone/members
        return super().get_queryset()

class MessagePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

class RoomMessagesView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = MessagePagination
    
    def get_queryset(self):
        room_id = self.kwargs['room_id']
        user = self.request.user
        
        # Check if user is a member of the room
        if not RoomMembership.objects.filter(room_id=room_id, user=user).exists():
            raise exceptions.PermissionDenied("You must join this room to view messages.")
            
        return Message.objects.filter(room_id=room_id).order_by('-created_at')

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class JoinRoomView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, room_id):
        """Join a room by creating a membership"""
        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response(
                {'error': 'Room not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if room is at capacity
        current_members = RoomMembership.objects.filter(room=room).count()
        if current_members >= room.capacity:
            return Response(
                {'error': 'Room is at full capacity'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine role (admin if owner, else member)
        role = 'admin' if room.owner == request.user else 'member'
        
        # Check if user is already a member
        membership, created = RoomMembership.objects.get_or_create(
            room=room,
            user=request.user,
            defaults={'role': role}
        )
        
        if created:
            # Create system message
            try:
                content = f"{request.user.username} joined the room"
                encrypted_content = EncryptionService.encrypt(content)
                sys_msg = Message.objects.create(
                    room=room,
                    sender=None, # System Sender
                    content=encrypted_content,
                    message_type='join'
                )
                
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'room_{room.id}',
                    {
                        'type': 'chat_message',
                        'content': content,
                        'username': 'System',
                        'id': str(sys_msg.id),
                        'sender_id': None,
                        'message_type': 'join',
                        'created_at': sys_msg.created_at.isoformat()
                    }
                )
            except Exception as e:
                print(f"Failed to create join message: {e}")

            return Response({
                'message': 'Successfully joined room',
                'room_id': str(room.id),
                'role': membership.role
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'message': 'Already a member of this room',
                'room_id': str(room.id),
                'role': membership.role
            }, status=status.HTTP_200_OK)

class LeaveRoomView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        
        try:
            membership = RoomMembership.objects.get(room=room, user=request.user)
        except RoomMembership.DoesNotExist:
             return Response({'error': 'Not a member'}, status=status.HTTP_400_BAD_REQUEST)

        if room.owner == request.user:
            return Response({'error': 'Owner cannot leave room. Delete room instead.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = f"{request.user.username} left the room"
            encrypted_content = EncryptionService.encrypt(content)
            sys_msg = Message.objects.create(
                room=room,
                sender=None,
                content=encrypted_content,
                message_type='leave'
            )
            
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'room_{room.id}',
                {
                    'type': 'chat_message',
                    'content': content,
                    'username': 'System',
                    'id': str(sys_msg.id),
                    'sender_id': None,
                    'message_type': 'leave',
                    'created_at': sys_msg.created_at.isoformat()
                }
            )
        except Exception as e:
            print(f"Failed to send leave message: {e}")

        membership.delete()

        return Response({'message': 'Left room successfully'})

class RoomMembersView(generics.ListAPIView):
    serializer_class = RoomMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs['room_id']
        return RoomMembership.objects.filter(room_id=room_id).select_related('user')


class RoomFileListCreateView(APIView):
    """List and upload files for a room"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, room_id):
        """List all files in a room"""
        room = get_object_or_404(Room, id=room_id)
        
        # Check if user is a member
        if not RoomMembership.objects.filter(room=room, user=request.user).exists() and room.owner != request.user:
            raise exceptions.PermissionDenied("You must be a room member to view files.")
        
        files = RoomFile.objects.filter(room=room)
        serializer = RoomFileSerializer(files, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, room_id):
        """Upload a file to a room"""
        room = get_object_or_404(Room, id=room_id)
        
        # Check if user is a member
        if not RoomMembership.objects.filter(room=room, user=request.user).exists() and room.owner != request.user:
            raise exceptions.PermissionDenied("You must be a room member to upload files.")
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size
        max_size = getattr(settings, 'MAX_FILE_SIZE_MB', 10) * 1024 * 1024
        if file.size > max_size:
            return Response(
                {'error': f'File too large. Maximum size is {settings.MAX_FILE_SIZE_MB}MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file extension
        ext = os.path.splitext(file.name)[1].lower()
        allowed_extensions = getattr(settings, 'ALLOWED_FILE_EXTENSIONS', [])
        if allowed_extensions and ext not in allowed_extensions:
            return Response(
                {'error': f'File type not allowed. Allowed types: {allowed_extensions}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get MIME type
        mime_type, _ = mimetypes.guess_type(file.name)
        if not mime_type:
            mime_type = 'application/octet-stream'
        
        # Create file record
        room_file = RoomFile.objects.create(
            room=room,
            uploaded_by=request.user,
            file=file,
            original_filename=file.name,
            file_size=file.size,
            file_type=mime_type,
            description=request.data.get('description', '')
        )
        
        serializer = RoomFileSerializer(room_file, context={'request': request})
        
        ws_data = json.loads(json.dumps(serializer.data, cls=DjangoJSONEncoder))
        
        # Broadcast file upload to room members (for Files tab)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"room_{room_id}",
            {
                "type": "file_uploaded",
                "data": ws_data
            }
        )

        # Create and broadcast chat message (for Chat tab)
        content_text = "Shared a file"
        encrypted_content = EncryptionService.encrypt(content_text)
        
        message = Message.objects.create(
             room=room,
             sender=request.user,
             content=encrypted_content,
             file=room_file,
             message_type='file'
        )
        
        # We need full message serialization for consistency
        message_serializer = MessageSerializer(message, context={'request': request})
        message_ws_data = json.loads(json.dumps(message_serializer.data, cls=DjangoJSONEncoder))

        async_to_sync(channel_layer.group_send)(
            f"room_{room_id}",
            {
                "type": "chat_message",
                "content": content_text, # Broadcast plaintext for immediate display
                "username": request.user.username,
                "id": str(message.id),
                "sender_id": str(request.user.id),
                "message_type": "file",
                "created_at": message.created_at.isoformat(),
                "file": ws_data # Use the already serialized file data
            }
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RoomFileDetailView(APIView):
    """Download or delete a specific file"""
    permission_classes = [permissions.IsAuthenticated]

    def get_file(self, room_id, file_id):
        room = get_object_or_404(Room, id=room_id)
        return get_object_or_404(RoomFile, id=file_id, room=room)

    def check_member_permission(self, room, user):
        if not RoomMembership.objects.filter(room=room, user=user).exists() and room.owner != user:
            raise exceptions.PermissionDenied("You must be a room member to access files.")

    def check_delete_permission(self, room, user, file):
        """Only file uploader, room owner, or admins can delete"""
        if room.owner == user:
            return
        if file.uploaded_by == user:
            return
        if RoomMembership.objects.filter(room=room, user=user, role__in=['admin', 'moderator']).exists():
            return
        raise exceptions.PermissionDenied("You don't have permission to delete this file.")

    def get(self, request, room_id, file_id):
        """Download a file"""
        room_file = self.get_file(room_id, file_id)
        self.check_member_permission(room_file.room, request.user)
        
        # Increment download count
        room_file.download_count += 1
        room_file.save(update_fields=['download_count'])
        
        # Stream file response
        response = FileResponse(
            room_file.file.open('rb'),
            content_type=room_file.file_type
        )
        response['Content-Disposition'] = f'attachment; filename="{room_file.original_filename}"'
        return response

    def delete(self, request, room_id, file_id):
        """Delete a file"""
        room_file = self.get_file(room_id, file_id)
        self.check_member_permission(room_file.room, request.user)
        self.check_delete_permission(room_file.room, request.user, room_file)
        
        file_data = {
            'id': str(room_file.id),
            'original_filename': room_file.original_filename,
            'deleted_by': request.user.username
        }
        
        # Delete the actual file
        if room_file.file:
            room_file.file.delete(save=False)
        
        room_file.delete()
        
        # Broadcast file deletion to room members
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"room_{room_id}",
            {
                "type": "file_deleted",
                "data": file_data
            }
        )
        
        return Response({'message': 'File deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# WebRTC Call API Views
# ============================================================================

from .models import CallSession, CallParticipant, ICEServer
from .serializers import CallSessionSerializer, CallSessionListSerializer, ICEServerSerializer


class RoomCallView(APIView):
    """
    Manage call sessions for a room.
    GET: Get active call or call history
    POST: Start a new call
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_room(self, room_id):
        return get_object_or_404(Room, id=room_id)
    
    def check_membership(self, room, user):
        """Check if user is a member of the room"""
        is_owner = room.owner == user
        is_member = RoomMembership.objects.filter(room=room, user=user).exists()
        if not (is_owner or is_member):
            raise exceptions.PermissionDenied("You must be a member of this room.")
    
    def get(self, request, room_id):
        """Get active call session for the room"""
        room = self.get_room(room_id)
        self.check_membership(room, request.user)
        
        # Check for active call
        active_call = CallSession.objects.filter(
            room=room, 
            status='active'
        ).prefetch_related('participants', 'participants__user').first()
        
        if active_call:
            serializer = CallSessionSerializer(active_call, context={'request': request})
            return Response(serializer.data)
        
        return Response({'active_call': None})
    
    def post(self, request, room_id):
        """Start a new call or join existing call"""
        room = self.get_room(room_id)
        self.check_membership(room, request.user)
        
        call_type = request.data.get('call_type', 'video')
        
        # Check for existing active call
        active_call = CallSession.objects.filter(room=room, status='active').first()
        
        if active_call:
            # Join existing call
            participant, created = CallParticipant.objects.get_or_create(
                call=active_call,
                user=request.user,
                defaults={
                    'is_audio_enabled': request.data.get('audio_enabled', True),
                    'is_video_enabled': request.data.get('video_enabled', call_type == 'video'),
                }
            )
            
            if not created and participant.left_at:
                # Rejoin - reset state
                participant.left_at = None
                participant.is_connected = False
                participant.save()
            
            serializer = CallSessionSerializer(active_call, context={'request': request})
            
            # Broadcast participant joined
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"room_{room_id}",
                {
                    "type": "call_participant_joined",
                    "call_id": str(active_call.id),
                    "user_id": str(request.user.id),
                    "username": request.user.username,
                    "is_audio_enabled": participant.is_audio_enabled,
                    "is_video_enabled": participant.is_video_enabled,
                }
            )
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        # Create new call
        call = CallSession.objects.create(
            room=room,
            initiated_by=request.user,
            call_type=call_type,
        )
        
        # Add initiator as first participant
        CallParticipant.objects.create(
            call=call,
            user=request.user,
            is_audio_enabled=request.data.get('audio_enabled', True),
            is_video_enabled=request.data.get('video_enabled', call_type == 'video'),
        )
        
        serializer = CallSessionSerializer(call, context={'request': request})
        
        # Broadcast call started
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"room_{room_id}",
            {
                "type": "call_started",
                "call_id": str(call.id),
                "call_type": call_type,
                "initiated_by": request.user.username,
                "initiated_by_id": str(request.user.id),
            }
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RoomCallLeaveView(APIView):
    """Leave an active call"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, room_id):
        """Leave the active call"""
        room = get_object_or_404(Room, id=room_id)
        
        active_call = CallSession.objects.filter(room=room, status='active').first()
        if not active_call:
            return Response({'error': 'No active call'}, status=status.HTTP_404_NOT_FOUND)
        
        participant = CallParticipant.objects.filter(
            call=active_call, 
            user=request.user,
            left_at__isnull=True
        ).first()
        
        if not participant:
            return Response({'error': 'Not in call'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark participant as left
        participant.left_at = timezone.now()
        participant.is_connected = False
        participant.save()
        
        # Broadcast participant left
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"room_{room_id}",
            {
                "type": "call_participant_left",
                "call_id": str(active_call.id),
                "user_id": str(request.user.id),
                "username": request.user.username,
            }
        )
        
        # Check if call should end (no more participants)
        remaining = active_call.participants.filter(left_at__isnull=True).count()
        if remaining == 0:
            active_call.status = 'ended'
            active_call.ended_at = timezone.now()
            active_call.save()
            
            async_to_sync(channel_layer.group_send)(
                f"room_{room_id}",
                {
                    "type": "call_ended",
                    "call_id": str(active_call.id),
                    "reason": "all_participants_left",
                }
            )
        
        return Response({'message': 'Left call successfully'})


class RoomCallEndView(APIView):
    """End an active call (requires moderator/admin)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, room_id):
        """Force end the active call"""
        room = get_object_or_404(Room, id=room_id)
        
        # Check permissions (owner, admin, moderator, or call initiator)
        is_owner = room.owner == request.user
        is_admin = RoomMembership.objects.filter(
            room=room, user=request.user, role__in=['admin', 'moderator']
        ).exists()
        
        active_call = CallSession.objects.filter(room=room, status='active').first()
        if not active_call:
            return Response({'error': 'No active call'}, status=status.HTTP_404_NOT_FOUND)
        
        is_initiator = active_call.initiated_by == request.user
        
        if not (is_owner or is_admin or is_initiator):
            raise exceptions.PermissionDenied("You don't have permission to end this call.")
        
        # End the call
        active_call.status = 'ended'
        active_call.ended_at = timezone.now()
        active_call.save()
        
        # Mark all participants as left
        active_call.participants.filter(left_at__isnull=True).update(
            left_at=timezone.now(),
            is_connected=False
        )
        
        # Broadcast call ended
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"room_{room_id}",
            {
                "type": "call_ended",
                "call_id": str(active_call.id),
                "reason": "ended_by_host",
                "ended_by": request.user.username,
            }
        )
        
        return Response({'message': 'Call ended successfully'})


class ICEServersView(APIView):
    """Get ICE server configuration for WebRTC"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Return list of ICE servers for WebRTC configuration"""
        ice_servers = ICEServer.objects.filter(is_active=True)
        
        if ice_servers.exists():
            # Use configured servers
            servers = [server.to_ice_server_dict() for server in ice_servers]
        else:
            # Default to public STUN servers
            servers = [
                {"urls": "stun:stun.l.google.com:19302"},
                {"urls": "stun:stun1.l.google.com:19302"},
                {"urls": "stun:stun2.l.google.com:19302"},
            ]
        
        return Response({
            "iceServers": servers,
            "iceCandidatePoolSize": 10,
        })


