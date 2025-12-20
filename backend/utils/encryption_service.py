from cryptography.fernet import Fernet
from django.conf import settings
import base64

# Ensure we have an encryption key (in a real app, load from env)
# For this demo, we can derive one from SECRET_KEY or generate a new one
# Fernet keys must be 32 url-safe base64-encoded bytes
def get_cipher_suite():
    # Use a fixed key for dev derived from SECRET_KEY (hashed then b64 encoded)
    # In PROD, use os.environ['ENCRYPTION_KEY']
    key = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode().ljust(32, b'X'))
    return Fernet(key)

class EncryptionService:
    @staticmethod
    def encrypt(message: str) -> str:
        f = get_cipher_suite()
        return f.encrypt(message.encode()).decode()

    @staticmethod
    def decrypt(token: str) -> str:
        try:
            f = get_cipher_suite()
            return f.decrypt(token.encode()).decode()
        except:
            return "[Decryption Error]"
