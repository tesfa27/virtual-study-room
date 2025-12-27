
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR.parent / '.env')


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "django-insecure-#w(&k$yqt=qn)57@=t&_l=57ch!c^ruh7%ssfor5$cb7gp^kyu"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'channels',
    'corsheaders', # Important for frontend-backend communication
    # Your custom apps (will be added later)
    'users',
    'rooms',
    # 'chat',
]

# Set the custom user model (CRITICAL for Django projects)
AUTH_USER_MODEL = 'users.CustomUser'

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware", # Must be at the top
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'db'),  # 'db' hostname from docker-compose
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# ASGI configuration for Django Channels
ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            # 'redis' hostname from docker-compose
            "hosts": [(os.getenv('REDIS_HOST', 'redis'), int(os.getenv('REDIS_PORT', 6379)))],
        },
    },
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": f"redis://{os.getenv('REDIS_HOST', 'redis')}:{os.getenv('REDIS_PORT', 6379)}/1",
    }
}

# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.authentication.CustomJWTAuthentication',
    ),
}

SIMPLE_JWT = {
    # 1. Access Token Lifetime (Short-lived for Security)
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),  # Recommended: 5 to 15 minutes

    # 2. Refresh Token Lifetime (Long-lived for UX)
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),   # Recommended: 7 to 60 days

    # Optional: Other common settings
    'ROTATE_REFRESH_TOKENS': True, # Enhances security upon refresh
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY, # Uses your Django Secret Key
    
    # Custom: Cookie Name
    'AUTH_COOKIE': 'access_token',
}


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = "static/"

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173", # Vite Frontend
]
CORS_ALLOW_CREDENTIALS = True # Important for cookies (access_token, refresh_token)

# Media files (User uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Allowed file types for room uploads
ALLOWED_FILE_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.txt', '.md',  # Documents
    '.jpg', '.jpeg', '.png', '.gif', '.webp',  # Images
    '.mp3', '.wav',  # Audio
    '.zip', '.rar',  # Archives
    '.py', '.js', '.ts', '.html', '.css',  # Code files
]
MAX_FILE_SIZE_MB = 10  # Maximum file size in MB

