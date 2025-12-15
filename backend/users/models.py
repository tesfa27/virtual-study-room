from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

# We inherit from AbstractUser to get all standard fields (username, email, password)
class CustomUser(AbstractUser):
    """
    Custom User Model: The foundation of your application's security and identity.
    """
    # A cleaner approach is to use email as the unique identifier.
    email = models.EmailField(_("email address"), unique=True)

    # Optional fields for user profiles or roles
    is_room_owner = models.BooleanField(
        default=False,
        help_text=_("Designates whether this user can create and manage rooms."),
    )
    # The 'focus_streak' field will be used for your Analytics Dashboard 
    focus_streak = models.IntegerField(default=0)

    # Set the field used for logging in
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username'] # Must include 'username' for the superuser command

    def __str__(self):
        return self.email