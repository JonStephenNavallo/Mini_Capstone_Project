import json
import time
from django.conf import settings
from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .broker import notification_broker
from .models import Notification, PushSubscription
from .serializers import (
    NotificationSerializer,
    PushSubscriptionUpsertSerializer,
    PushUnsubscribeSerializer,
)
from .services import (
    clear_all_notifications,
    delete_notification,
    get_notification_stream_snapshot,
    get_vapid_keys,
    mark_all_read,
    mark_notification_read,
    remove_push_subscription,
    schedule_test_web_push,
    upsert_push_subscription,
)


def _format_sse(event, data, event_id=None):
    """Format a Server-Sent Events frame following the WHATWG SSE specification."""
    lines = []
    if event_id:
        lines.append(f'id: {event_id}')
    if event:
        lines.append(f'event: {event}')
    payload = json.dumps(data, separators=(',', ':'))
    lines.append(f'data: {payload}')
    return '\n'.join(lines) + '\n\n'


def notification_stream_view(request):
    """
    Server-Sent Events (SSE) stream for real-time notification delivery.
    Endpoint: GET /api/notifications/stream/

    Adapted from Capstone_Project_Stg2: enforces active session auth, scopes
    strictly to request.user.id, supports Last-Event-ID catch-up, and rotates
    cleanly after 45s so synchronous WSGI dev servers never accumulate threads.
    """
    if request.method != 'GET':
        return JsonResponse(
            {'detail': f'Method "{request.method}" not allowed.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    user = getattr(request, '_force_auth_user', None) or getattr(request, 'user', None)
    if not (user and user.is_authenticated and getattr(user, 'is_active', False)):
        resp = JsonResponse(
            {'detail': 'Authentication credentials were not provided or account is inactive.'},
            status=status.HTTP_403_FORBIDDEN,
        )
        resp['Cache-Control'] = 'no-store'
        return resp

    since_id = (request.headers.get('Last-Event-ID') or request.GET.get('last_event_id') or '').strip() or None
    once_only = request.GET.get('once') in ('1', 'true', 'yes')
    default_duration = float(getattr(settings, 'SSE_MAX_DURATION', 45.0))
    try:
        max_duration = float(request.GET.get('timeout', str(default_duration)))
        max_duration = max(0.0, min(max_duration, 55.0))
    except (TypeError, ValueError):
        max_duration = default_duration

    user_id = user.id

    def event_stream():
        yield 'retry: 3000\n\n'

        last_seq = notification_broker.get_current_seq(user_id)
        snapshot = get_notification_stream_snapshot(user=user, since_id=since_id)

        for missed in snapshot['missed_notifications']:
            yield _format_sse(
                event='notification',
                data={
                    'notification': missed,
                    'unread_count': snapshot['unread_count'],
                    'latest_id': snapshot['latest_id'],
                },
                event_id=missed.get('id') or snapshot['latest_id'],
            )

        yield _format_sse(
            event='sync',
            data={
                'unread_count': snapshot['unread_count'],
                'latest_id': snapshot['latest_id'],
            },
            event_id=snapshot['latest_id'] or None,
        )

        if once_only or max_duration <= 0:
            return

        deadline = time.monotonic() + max_duration
        heartbeat_interval = 15.0

        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break

            wait_time = min(heartbeat_interval, remaining)
            last_seq, events = notification_broker.wait_for_events(
                user_id=user_id,
                last_seq=last_seq,
                timeout=wait_time,
            )

            if events:
                for evt in events:
                    data = evt.get('data') or {}
                    evt_id = data.get('latest_id')
                    yield _format_sse(
                        event=evt.get('event', 'sync'),
                        data=data,
                        event_id=evt_id or None,
                    )
            else:
                yield ': keepalive\n\n'

    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream; charset=utf-8',
    )
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['X-Accel-Buffering'] = 'no'
    return response


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)[:30]
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response(
            {
                'unread_count': unread_count,
                'results': NotificationSerializer(qs, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
        updated = mark_notification_read(notification_id=notif.pk, user=request.user)
        return Response(NotificationSerializer(updated).data, status=status.HTTP_200_OK)


class NotificationReadAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated_count = mark_all_read(user=request.user)
        return Response({'updated_count': updated_count}, status=status.HTTP_200_OK)


class NotificationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
        delete_notification(notification_id=notif.pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationClearAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        deleted_count = clear_all_notifications(user=request.user)
        return Response({'deleted_count': deleted_count}, status=status.HTTP_200_OK)


class VapidPublicKeyView(APIView):
    """Return the server's VAPID public key and current user subscription count."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        public_key, private_key, _ = get_vapid_keys()
        sub_count = PushSubscription.objects.filter(user=request.user).count()
        return Response(
            {
                'public_key': public_key,
                'enabled': bool(public_key and private_key),
                'subscription_count': sub_count,
            },
            status=status.HTTP_200_OK,
        )


class PushTestView(APIView):
    """Trigger a 5-second delayed Web Push so the user can swipe away the PWA and test background wakeup."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            delay = float(request.data.get('delay_seconds', 5))
        except (TypeError, ValueError):
            delay = 5.0
        result = schedule_test_web_push(user=request.user, delay_seconds=delay)
        if not result.get('ok'):
            return Response({'detail': result.get('reason')}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_202_ACCEPTED)


class PushSubscribeView(APIView):
    """Register or refresh the authenticated user's browser/PWA Web Push subscription."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PushSubscriptionUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        keys = validated['keys']
        user_agent = validated.get('user_agent') or request.META.get('HTTP_USER_AGENT', '')
        sub = upsert_push_subscription(
            user=request.user,
            endpoint=validated['endpoint'],
            p256dh=keys['p256dh'],
            auth=keys['auth'],
            user_agent=user_agent,
        )
        return Response({'id': str(sub.id), 'subscribed': True}, status=status.HTTP_201_CREATED)


class PushUnsubscribeView(APIView):
    """Unregister a browser/PWA Web Push subscription owned by the authenticated user."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PushUnsubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        removed = remove_push_subscription(
            user=request.user,
            endpoint=serializer.validated_data['endpoint'],
        )
        return Response({'removed': removed}, status=status.HTTP_200_OK)
