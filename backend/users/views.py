from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .serializers import RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import CustomUser

# Use the default SimpleJWT view for login, which handles token generation
class CustomTokenObtainPairView(TokenObtainPairView):
    # You can customize the serializer here if you want to return extra user info
    pass

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        # Optional: Log the user in immediately after registration (not shown here)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)