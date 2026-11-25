"""Test settings for Campus Property Lost & Found Portal."""
from .base import *  # noqa: F403, F401

DEBUG = False
DEV_MODE = False

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]
