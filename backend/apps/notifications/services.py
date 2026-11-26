"""Stateless notification service layer with real-time SSE broker & VAPID Web Push publishing."""
import json
import logging
import threading
import uuid

from django.conf import settings
from django.db import transaction

from .broker import notification_broker
from .models import Notification, PushSubscription

logger = logging.getLogger(__name__)


def _resolve_push_link_path(notification: Notification, role: str) -> str:
    """Resolve a role-safe internal route for tapping a background Web Push notification."""
    raw = (notification.link_path or '').strip()
    if role == 'ADMIN':
        return raw if raw.startswith('/admin/') else '/admin/directory'
    if raw.startswith('/'):
        if raw == '/claim' and notification.category == Notification.Category.CLAIM:
            return '/report-lost'
        return raw
    if notification.category in (Notification.Category.MATCH_ALERT, Notification.Category.CLAIM):
        return '/report-lost'
    if notification.category == Notification.Category.INTAKE:
        return '/leaderboard'
    return '/explore'


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


def _clean_vapid_value(raw: str, prefix: str = '') -> str:
    val = (raw or '').strip().strip('"').strip("'")
    if prefix and val.startswith(f'{prefix}='):
        val = val.split('=', 1)[1].strip().strip('"').strip("'")
    return val


def get_vapid_keys() -> tuple[str, str, str]:
    public_key = _clean_vapid_value(getattr(settings, 'VAPID_PUBLIC_KEY', ''), 'VAPID_PUBLIC_KEY')
    private_key = _clean_vapid_value(getattr(settings, 'VAPID_PRIVATE_KEY', ''), 'VAPID_PRIVATE_KEY')
    claims_sub = _clean_vapid_value(getattr(settings, 'VAPID_CLAIMS_EMAIL', ''), 'VAPID_CLAIMS_EMAIL') or 'mailto:osas@campus.edu'
    if not claims_sub.startswith('mailto:') and not claims_sub.startswith('https://'):
        claims_sub = f'mailto:{claims_sub}'
    return public_key, private_key, claims_sub


def _deliver_webpush_payload(*, subscriptions: list, payload_str: str, private_key: str, claims_sub: str) -> int:
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        return 0

    delivered = 0
    stale_ids = []
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    'endpoint': sub.endpoint,
                    'keys': {
                        'p256dh': sub.p256dh,
                        'auth': sub.auth,
                    },
                },
                data=payload_str,
                vapid_private_key=private_key,
                vapid_claims={'sub': claims_sub},
                ttl=86400,
                headers={'Urgency': 'high'},
            )
            delivered += 1
        except WebPushException as exc:
            status_code = getattr(getattr(exc, 'response', None), 'status_code', None)
            if status_code in (404, 410):
                stale_ids.append(sub.id)
            else:
                logger.warning('WebPush delivery failed (status=%s): %s', status_code, exc)
        except Exception as exc:
            logger.warning('Unexpected WebPush error: %s', exc)

    if stale_ids:
        PushSubscription.objects.filter(id__in=stale_ids).delete()

    return delivered


def send_web_push_for_notification(notification_id) -> int:
    """
    Deliver an encrypted VAPID Web Push payload to all registered devices of the
    notification recipient so closed/background mobile PWAs wake up via FCM/APNs.
    Silently no-ops when VAPID keys are not configured and prunes expired (404/410) endpoints.
    """
    public_key, private_key, claims_sub = get_vapid_keys()
    if not public_key or not private_key:
        return 0

    notification = (
        Notification.objects.select_related('recipient')
        .filter(pk=notification_id)
        .first()
    )
    if notification is None or not getattr(notification.recipient, 'is_active', False):
        return 0

    subscriptions = list(
        PushSubscription.objects.filter(user_id=notification.recipient_id)
    )
    if not subscriptions:
        return 0

    unread_count = Notification.objects.filter(
        recipient_id=notification.recipient_id,
        is_read=False,
    ).count()
    role = getattr(notification.recipient, 'role', '')
    payload_str = json.dumps(
        {
            'id': str(notification.id),
            'title': notification.title,
            'body': notification.message,
            'category': notification.category,
            'link_path': _resolve_push_link_path(notification, role),
            'tag': f'osas-lnf-notif-{notification.id}',
            'unread_count': unread_count,
        },
        separators=(',', ':'),
    )

    return _deliver_webpush_payload(
        subscriptions=subscriptions,
        payload_str=payload_str,
        private_key=private_key,
        claims_sub=claims_sub,
    )


def schedule_test_web_push(*, user, delay_seconds: float = 5.0) -> dict:
    """
    Adapted from DannyMoerkerke/web-push-demo: schedules a delayed Web Push (default 5s)
    so the user can swipe the PWA out of Recent Apps and verify cold-start delivery.
    """
    public_key, private_key, claims_sub = get_vapid_keys()
    if not public_key or not private_key:
        return {'ok': False, 'reason': 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set on the backend.'}

    subs = list(PushSubscription.objects.filter(user=user))
    sub_count = len(subs)
    if sub_count == 0:
        return {'ok': False, 'reason': 'No active Web Push subscription registered for this device yet.'}

    delay = max(0.0, min(float(delay_seconds), 15.0))
    role = getattr(user, 'role', '')
    link_path = '/admin/dashboard' if role == 'ADMIN' else '/'

    def _send_delayed():
        from django.db import close_old_connections

        close_old_connections()
        try:
            payload_str = json.dumps(
                {
                    'id': f'test-{uuid.uuid4()}',
                    'title': 'OSAS Campus Lost & Found',
                    'body': 'Notification check complete for your campus portal account.',
                    'category': 'SYSTEM',
                    'link_path': link_path,
                },
                separators=(',', ':'),
            )
            _deliver_webpush_payload(
                subscriptions=subs,
                payload_str=payload_str,
                private_key=private_key,
                claims_sub=claims_sub,
            )
        finally:
            close_old_connections()

    timer = threading.Timer(delay, _send_delayed)
    timer.daemon = True
    timer.start()
    return {'ok': True, 'delay_seconds': delay, 'subscriptions': sub_count}


def _schedule_web_push(notification_id) -> None:
    """Dispatch Web Push asynchronously after DB commit so HTTP requests never block on FCM."""
    public_key, private_key, _ = get_vapid_keys()
    if not public_key or not private_key:
        return

    def _runner():
        from django.db import close_old_connections

        close_old_connections()
        try:
            send_web_push_for_notification(notification_id)
        finally:
            close_old_connections()

    threading.Thread(target=_runner, name=f'webpush-{notification_id}', daemon=True).start()


@transaction.atomic
def upsert_push_subscription(
    *,
    user,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: str = '',
) -> PushSubscription:
    """Register or rebind a browser PushSubscription endpoint to the authenticated user."""
    subscription, _ = PushSubscription.objects.update_or_create(
        endpoint=endpoint.strip(),
        defaults={
            'user': user,
            'p256dh': p256dh.strip(),
            'auth': auth.strip(),
            'user_agent': (user_agent or '').strip()[:255],
        },
    )
    return subscription


def remove_push_subscription(*, user, endpoint: str) -> int:
    """Remove a browser PushSubscription strictly owned by the authenticated user."""
    deleted_count, _ = PushSubscription.objects.filter(
        user=user,
        endpoint=(endpoint or '').strip(),
    ).delete()
    return deleted_count


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
    """Create a notification record for a user and push it over both SSE and VAPID Web Push."""
    instance = Notification.objects.create(
        recipient=recipient,
        title=title[:160],
        message=message,
        category=category,
        link_path=link_path[:255],
    )
    _publish_notification_created(instance)
    notif_id = instance.id
    transaction.on_commit(lambda: _schedule_web_push(notif_id))
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
