from rest_framework import generics, permissions, filters, exceptions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from .models import Room, RoomMembership, Message
from .serializers import RoomSerializer, MessageSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from utils.encryption_service import EncryptionService

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

class RoomMessagesView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        room_id = self.kwargs['room_id']
        user = self.request.user
        
        # Check if user is a member of the room
        if not RoomMembership.objects.filter(room_id=room_id, user=user).exists():
            raise exceptions.PermissionDenied("You must join this room to view messages.")
            
        return Message.objects.filter(room_id=room_id).order_by('created_at')

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
                        'message_type': 'join'
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
                    'message_type': 'leave'
                }
            )
        except Exception as e:
            print(f"Failed to send leave message: {e}")

        membership.delete()

        return Response({'message': 'Left room successfully'})
