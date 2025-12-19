from rest_framework import generics, permissions, filters
from rest_framework.pagination import PageNumberPagination
from .models import Room, RoomMembership, Message
from .serializers import RoomSerializer, MessageSerializer

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
        serializer.save(owner=self.request.user)

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
        return Message.objects.filter(room_id=room_id).order_by('created_at')
