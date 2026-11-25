"""Stateless notification service layer with real-time SSE broker publishing."""
import uuid
from .broker import notification_broker
from .models import Notification


def _publish_notification_created(notification: Notification) -> None:
    """Push a newly created Notification instance to the recipient's live SSE stream."""
    try:
        from .serializers import NotificationSerializer

        serialized = NotificationSerializer(notification).data
        unread_count = Notification.objects.filter(
            recipient_id=notification.recipient_id,
            is_read=False,
        ).count()
        notification_broker.publish(
            user_id=notification.recipient_id,
            event_type='notification',
            payload={
                'notification': serialized,
                'unread_count': unread_count,
                'latest_id': str(notification.id),
            },
        )
    except Exception:
        pass


def publish_user_sync(user_id) -> None:
    """Notify all active SSE streams for `user_id` that read/delete state changed."""
    try:
        qs = Notification.objects.filter(recipient_id=user_id)
        unread_count = qs.filter(is_read=False).count()
        latest = qs.order_by('-created_at').values_list('id', flat=True).first()
        notification_broker.publish(
            user_id=user_id,
            event_type='sync',
            payload={
                'unread_count': unread_count,
                'latest_id': str(latest) if latest else '',
            },
        )
    except Exception:
        pass


def get_notification_stream_snapshot(*, user, since_id: str | None = None) -> dict:
    """
    Compute the current unread count, latest notification UUID, and any newly created
    notifications after `since_id` (for initial SSE handshake and Last-Event-ID catch-up).
    """
    from .serializers import NotificationSerializer

    base_qs = Notification.objects.filter(recipient=user).order_by('-created_at')
    unread_count = base_qs.filter(is_read=False).count()
    latest = base_qs.values_list('id', flat=True).first()
    latest_id = str(latest) if latest else ''

    missed_notifications = []
    if since_id:
        try:
            parsed_uuid = uuid.UUID(str(since_id))
            anchor = Notification.objects.filter(pk=parsed_uuid, recipient=user).first()
            if anchor is not None:
                missed_qs = (
                    Notification.objects.filter(
                        recipient=user,
                        created_at__gt=anchor.created_at,
                    )
                    .order_by('created_at')[:25]
                )
                missed_notifications = NotificationSerializer(missed_qs, many=True).data
        except (ValueError, TypeError):
            missed_notifications = []

    return {
        'unread_count': unread_count,
        'latest_id': latest_id,
        'missed_notifications': missed_notifications,
    }


def notify_user(
    *,
    recipient,
    title: str,
    message: str,
    category: str = Notification.Category.SYSTEM,
    link_path: str = '',
) -> Notification:
    """Create a notification record for a user and push it over SSE."""
    instance = Notification.objects.create(
        recipient=recipient,
        title=title[:160],
        message=message,
        category=category,
        link_path=link_path[:255],
    )
    _publish_notification_created(instance)
    return instance


def mark_notification_read(*, notification_id, user) -> Notification:
    """Mark a single notification owned by user as read and broadcast SSE sync."""
    notif = Notification.objects.get(pk=notification_id, recipient=user)
    if not notif.is_read:
        notif.is_read = True
        notif.save(update_fields=['is_read'])
    publish_user_sync(user.id)
    return notif


def mark_all_read(*, user) -> int:
    """Mark all unread notifications for user as read and broadcast SSE sync."""
    updated_count = Notification.objects.filter(recipient=user, is_read=False).update(is_read=True)
    publish_user_sync(user.id)
    return updated_count


def delete_notification(*, notification_id, user) -> None:
    """Permanently delete a single notification owned by user and broadcast SSE sync."""
    notif = Notification.objects.get(pk=notification_id, recipient=user)
    notif.delete()
    publish_user_sync(user.id)


def clear_all_notifications(*, user) -> int:
    """Delete all notifications owned by user, broadcast SSE sync, and return count."""
    deleted_count, _ = Notification.objects.filter(recipient=user).delete()
    publish_user_sync(user.id)
    return deleted_count
