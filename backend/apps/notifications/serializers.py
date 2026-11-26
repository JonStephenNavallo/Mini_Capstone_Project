from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'category',
            'link_path',
            'is_read',
            'created_at',
        ]


class PushSubscriptionKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField(max_length=255)
    auth = serializers.CharField(max_length=255)


class PushSubscriptionUpsertSerializer(serializers.Serializer):
    """Validates standard PushSubscription.toJSON() payloads from the browser PushManager."""

    endpoint = serializers.URLField(max_length=1024)
    keys = PushSubscriptionKeysSerializer()
    user_agent = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    def validate_endpoint(self, value):
        cleaned = (value or '').strip()
        if not (
            cleaned.startswith('https://')
            or cleaned.startswith('http://localhost')
            or cleaned.startswith('http://127.0.0.1')
        ):
            raise serializers.ValidationError('Push subscription endpoint must use HTTPS.')
        return cleaned


class PushUnsubscribeSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=1024)
