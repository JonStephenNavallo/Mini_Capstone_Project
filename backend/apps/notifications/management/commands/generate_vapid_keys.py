"""Generate a URL-safe Base64 ECDSA P-256 VAPID keypair for Web Push notifications."""
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from django.core.management.base import BaseCommand


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


class Command(BaseCommand):
    help = 'Generate VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY for Web Push notifications.'

    def handle(self, *args, **options):
        private_key = ec.generate_private_key(ec.SECP256R1())
        private_numbers = private_key.private_numbers()
        private_bytes = private_numbers.private_value.to_bytes(32, byteorder='big')
        public_bytes = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint,
        )
        self.stdout.write(f'VAPID_PUBLIC_KEY={_b64url(public_bytes)}')
        self.stdout.write(f'VAPID_PRIVATE_KEY={_b64url(private_bytes)}')
