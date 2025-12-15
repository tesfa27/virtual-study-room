from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .serializers import RegisterSerializer, UserSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.settings import api_settings
from .models import CustomUser

# Use the default SimpleJWT view for login, which handles token generation
class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        # 1. Call the base class logic to get the tokens
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')
            
            # --- CRITICAL: Remove tokens from the JSON response ---
            del response.data['access']
            del response.data['refresh']

            # --- 2. Set the Access Token (JS-readable) ---
            # NOTE: NOT HttpOnly, so JS can read and send in headers.
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=False,          # JS must be able to read this!
                secure=True,             # Use HTTPS in production
                samesite='Lax',
                max_age=api_settings.ACCESS_TOKEN_LIFETIME.total_seconds(), # Match expiry
            )

            # --- 3. Set the Refresh Token (HttpOnly for Security) ---
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,           # Prevents client-side JS access (XSS defense)
                secure=True,             # Use HTTPS in production
                samesite='Lax',
                max_age=api_settings.REFRESH_TOKEN_LIFETIME.total_seconds(), # Match expiry
            )

            # 4. Return a simple success message
            response.data['message'] = 'Login successful' 
            
        return response

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

class ManageUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user