"""Development Django settings for Campus Property Lost & Found Portal."""
import socket
from rest_framework.authentication import SessionAuthentication
from .base import *  # noqa: F403, F401

SECRET_KEY = 'django-insecure-mini-capstone-dev-secret-key'
DEBUG = True
ALLOWED_HOSTS = ['*']
DEV_MODE = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',  # noqa: F405
    }
}

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Development-only SessionAuthentication relaxing CSRF checks for local testing."""

    def enforce_csrf(self, request):
        return


REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'config.settings.dev.CsrfExemptSessionAuthentication',
    ],
}

SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False

dev_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:4173',
]

try:
    hostname = socket.gethostname()
    _, _, ip_addresses = socket.gethostbyname_ex(hostname)
    for ip in ip_addresses:
        for port in (5173, 5174, 4173, 3000, 8000):
            dev_origins.append(f'http://{ip}:{port}')
except Exception:
    pass

CSRF_TRUSTED_ORIGINS = dev_origins
