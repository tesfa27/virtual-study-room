from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .serializers import RegisterSerializer, UserSerializer, ResetPasswordSerializer
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

            
        return response

class CustomTokenRefreshView(generics.GenericAPIView):
    """
    Custom token refresh view that reads refresh token from HttpOnly cookie
    and returns new access token as a cookie.
    """
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request, *args, **kwargs):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
        
        # Read refresh token from HttpOnly cookie
        refresh_token = request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            return Response(
                {'error': 'Refresh token not found'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            # Validate and refresh the token
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            
            # Create response
            response = Response(
                {'message': 'Token refreshed successfully'},
                status=status.HTTP_200_OK
            )
            
            # Set new access token as cookie
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=False,          # JS must be able to read this
                secure=True,             # Use HTTPS in production
                samesite='Lax',
                max_age=api_settings.ACCESS_TOKEN_LIFETIME.total_seconds(),
            )
            
            return response
            
        except (TokenError, InvalidToken) as e:
            return Response(
                {'error': 'Invalid or expired refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )

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

class LogoutView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            # Optional: Blacklist the refresh token if you want to invalidate it immediately
            refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
            if refresh_token:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception as e:
            # Even if blacklisting fails (e.g. invalid token), we still want to clear cookies
            pass

        response = Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
        response.delete_cookie('access_token')
        response.delete_cookie('refresh_token') 
        return response

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import smart_str, force_str, smart_bytes, DjangoUnicodeDecodeError
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse

class ForgotPasswordView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        email = request.data.get('email', '')
        if CustomUser.objects.filter(email=email).exists():
            user = CustomUser.objects.get(email=email)
            uidb64 = urlsafe_base64_encode(smart_bytes(user.id))
            token = PasswordResetTokenGenerator().make_token(user)
            
            # Construct the link (In production, send this via email)
            # Frontend URL construction
            # We want: http://localhost:5173/reset-password/<uidb64>/<token>
            # For now in dev we hardcode localhost:5173 or read from headers if possible
            frontend_host = request.META.get('HTTP_ORIGIN', 'http://localhost:5173')
            absurl = f"{frontend_host}/reset-password/{uidb64}/{token}"
            
            # For Development: Print to console
            print(f"\n[RESET PASSWORD LINK]: {absurl}\n")
            
        # Security: Always return success to prevent email enumeration
        return Response({'message': 'If an account exists with this email, a reset link has been sent.'}, status=status.HTTP_200_OK)

class ValidateResetTokenView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)
    
    def get(self, request, uidb64, token):
        try:
            id = smart_str(urlsafe_base64_decode(uidb64))
            user = CustomUser.objects.get(id=id)
            if not PasswordResetTokenGenerator().check_token(user, token):
                return Response({'error': 'Token is invalid or expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({'success': True, 'message': 'Token is valid', 'uidb64': uidb64, 'token': token}, status=status.HTTP_200_OK)
            
        except DjangoUnicodeDecodeError as identifier:
            return Response({'error': 'Token is invalid or expired'}, status=status.HTTP_400_BAD_REQUEST)

class ResetPasswordView(generics.GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uidb64 = serializer.validated_data.get('uidb64')
        token = serializer.validated_data.get('token')
        password = serializer.validated_data.get('password')

        try:
            id = smart_str(urlsafe_base64_decode(uidb64))
            user = CustomUser.objects.get(id=id)
            if not PasswordResetTokenGenerator().check_token(user, token):
                 return Response({'error': 'Token is invalid or expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(password)
            user.save()
            return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': 'Something went wrong'}, status=status.HTTP_400_BAD_REQUEST)