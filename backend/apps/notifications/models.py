import uuid
from django.conf import settings
from django.db import models


class Notification(models.Model):
    """In-app & push-ready notifications for match alerts and custody updates."""

    class Category(models.TextChoices):
        MATCH_ALERT = 'MATCH_ALERT', 'Auto-Match Alert'
        INTAKE = 'INTAKE', 'Custody Intake'
        CLAIM = 'CLAIM', 'Claim Update'
        SYSTEM = 'SYSTEM', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=160)
    message = models.TextField()
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.SYSTEM,
    )
    link_path = models.CharField(max_length=255, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(
                fields=['recipient', 'is_read', '-created_at'],
                name='idx_notif_recipient_unread',
            ),
        ]

    def __str__(self):
        return f'{self.recipient_id}: {self.title}'


class PushSubscription(models.Model):
    """
    Browser/PWA Web Push subscription bound to an authenticated user's device.
    Keyed uniquely by `endpoint` so account switches on the same device cleanly
    rebind the subscription to the active user without leaking alerts across accounts.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
    )
    endpoint = models.URLField(max_length=1024, unique=True)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    user_agent = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_push_subscriptions'
        ordering = ['-updated_at']
        indexes = [
            models.Index(
                fields=['user', '-updated_at'],
                name='idx_pushsub_user_updated',
            ),
        ]

    def __str__(self):
        return f'PushSubscription(user={self.user_id}, endpoint={self.endpoint[:48]}...)'
