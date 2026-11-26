from django.urls import path
from .views import (
    NotificationClearAllView,
    NotificationDetailView,
    NotificationListView,
    NotificationReadAllView,
    NotificationReadView,
    PushSubscribeView,
    PushTestView,
    PushUnsubscribeView,
    VapidPublicKeyView,
    notification_stream_view,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications-list'),
    path('stream/', notification_stream_view, name='notifications-stream'),
    path('read-all/', NotificationReadAllView.as_view(), name='notifications-read-all'),
    path('clear/', NotificationClearAllView.as_view(), name='notifications-clear'),
    path('push/vapid-public-key/', VapidPublicKeyView.as_view(), name='notifications-vapid-key'),
    path('push/subscribe/', PushSubscribeView.as_view(), name='notifications-push-subscribe'),
    path('push/unsubscribe/', PushUnsubscribeView.as_view(), name='notifications-push-unsubscribe'),
    path('push/test/', PushTestView.as_view(), name='notifications-push-test'),
    path('<uuid:pk>/', NotificationDetailView.as_view(), name='notifications-detail'),
    path('<uuid:pk>/read/', NotificationReadView.as_view(), name='notifications-read'),
]
