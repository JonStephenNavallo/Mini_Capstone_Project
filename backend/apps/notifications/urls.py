from django.urls import path
from .views import (
    NotificationClearAllView,
    NotificationDetailView,
    NotificationListView,
    NotificationReadAllView,
    NotificationReadView,
    notification_stream_view,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications-list'),
    path('stream/', notification_stream_view, name='notifications-stream'),
    path('read-all/', NotificationReadAllView.as_view(), name='notifications-read-all'),
    path('clear/', NotificationClearAllView.as_view(), name='notifications-clear'),
    path('<uuid:pk>/', NotificationDetailView.as_view(), name='notifications-detail'),
    path('<uuid:pk>/read/', NotificationReadView.as_view(), name='notifications-read'),
]
