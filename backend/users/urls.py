from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, CustomTokenObtainPairView, CustomTokenRefreshView, ManageUserView, LogoutView, 
    ForgotPasswordView, ValidateResetTokenView, ResetPasswordView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    # Token refresh is essential for long-lived sessions
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('me/', ManageUserView.as_view(), name='auth_me'),
    
    # Password Reset
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/<uidb64>/<token>/', ValidateResetTokenView.as_view(), name='password_reset_confirm'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
]