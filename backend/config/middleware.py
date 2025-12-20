from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs

User = get_user_model()

@database_sync_to_async
def get_user(token_key):
    try:
        # Check if token is valid
        access_token = AccessToken(token_key)
        user_id = access_token.payload['user_id']
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()

class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Look for token in query string
        query_string = parse_qs(scope["query_string"].decode("utf8"))
        token = query_string.get("token")

        if token:
            scope["user"] = await get_user(token[0])
        else:
            scope["user"] = AnonymousUser()

        return await self.app(scope, receive, send)
