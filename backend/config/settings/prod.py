"""Production settings for Campus Property Lost & Found Portal (Render + Vercel)."""
import os
from urllib.parse import urlparse
from django.core.exceptions import ImproperlyConfigured
from .base import *  # noqa: F403, F401


def _split_csv(value, default=''):
    raw = value if value is not None else default
    return [item.strip() for item in raw.split(',') if item.strip()]


def _env_bool(name, default=True):
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ('1', 'true', 'yes', 'on')


DEBUG = False
DEV_MODE = False

# Require a strong, non-default SECRET_KEY in production (Render's generateValue creates a 32+ char key).
SECRET_KEY = os.environ.get('SECRET_KEY', '')
if not SECRET_KEY or SECRET_KEY.startswith('django-insecure-') or len(SECRET_KEY) < 32:
    raise ImproperlyConfigured(
        'SECRET_KEY must be set in the environment to a strong random string (>= 32 chars) in production.'
    )

ALLOWED_HOSTS = _split_csv(
    os.environ.get('ALLOWED_HOSTS'),
    default='localhost,127.0.0.1',
)
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME', '').strip()
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Serve Django static assets directly via WhiteNoise on Render.
MIDDLEWARE = [
    MIDDLEWARE[0],  # noqa: F405 - django.middleware.security.SecurityMiddleware
    'whitenoise.middleware.WhiteNoiseMiddleware',
    *MIDDLEWARE[1:],  # noqa: F405
]
STATIC_ROOT = BASE_DIR / 'staticfiles'  # noqa: F405
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

# Allow serving uploaded media from Django on Render when external storage (e.g. Cloudinary) is not yet configured.
SERVE_MEDIA = _env_bool('SERVE_MEDIA', default=True)

# Optional persistent media storage via Cloudinary (recommended on Render's ephemeral free disk).
# Accepts either a single CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
# or individual CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET env vars.
_cloudinary_url = os.environ.get('CLOUDINARY_URL', '').strip().strip('"').strip("'")
if _cloudinary_url.startswith('CLOUDINARY_URL='):
    _cloudinary_url = _cloudinary_url.split('=', 1)[1].strip().strip('"').strip("'")
_cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME', '').strip()
_cloud_key = os.environ.get('CLOUDINARY_API_KEY', '').strip()
_cloud_secret = os.environ.get('CLOUDINARY_API_SECRET', '').strip()
if _cloudinary_url:
    _parsed = urlparse(_cloudinary_url)
    _cloud_name = _parsed.hostname or _cloud_name
    _cloud_key = _parsed.username or _cloud_key
    _cloud_secret = _parsed.password or _cloud_secret

if _cloud_name and _cloud_key and _cloud_secret:
    INSTALLED_APPS = [  # noqa: F405
        *INSTALLED_APPS,  # noqa: F405
        'cloudinary_storage',
        'cloudinary',
    ]
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': _cloud_name,
        'API_KEY': _cloud_key,
        'API_SECRET': _cloud_secret,
        'SECURE': True,
    }
    STORAGES['default'] = {
        'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage',
    }
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# Trust HTTPS termination performed by Render / Vercel reverse proxies.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = _env_bool('SECURE_SSL_REDIRECT', default=True)

# Cookie & CSRF hardening (Axios reads csrftoken cookie to send X-CSRFToken header).
COOKIE_SAMESITE = os.environ.get('COOKIE_SAMESITE', 'Lax')
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = COOKIE_SAMESITE

CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = COOKIE_SAMESITE

# HSTS & browser security headers.
SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True)
SECURE_HSTS_PRELOAD = _env_bool('SECURE_HSTS_PRELOAD', default=True)
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Rotate SSE streams cleanly under Vercel Hobby proxy timeout (~25s) while preserving Last-Event-ID catch-up.
SSE_MAX_DURATION = float(os.environ.get('SSE_MAX_DURATION', '20'))

# Include your Render backend URL and Vercel frontend URL(s) in environment variables.
CSRF_TRUSTED_ORIGINS = _split_csv(os.environ.get('CSRF_TRUSTED_ORIGINS'), default='')
CORS_ALLOWED_ORIGINS = _split_csv(os.environ.get('CORS_ALLOWED_ORIGINS'), default='')
if RENDER_EXTERNAL_HOSTNAME:
    render_origin = f'https://{RENDER_EXTERNAL_HOSTNAME}'
    if render_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(render_origin)
    if render_origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(render_origin)
CORS_ALLOW_CREDENTIALS = True

# Database: prefer DATABASE_URL (Render Postgres / Neon / Supabase), then explicit DB_NAME, else SQLite.
DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()
if DATABASE_URL:
    import dj_database_url

    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=_env_bool('DB_SSL_REQUIRE', default=True),
        )
    }
elif os.environ.get('DB_NAME'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER', ''),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }
