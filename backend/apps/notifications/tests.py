from unittest.mock import MagicMock, patch
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.notifications.models import Notification, PushSubscription
from apps.notifications.services import notify_user, send_web_push_for_notification
from apps.users.models import User


class NotificationOwnershipAndDeletionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student_a = User.objects.create_user(
            email='notif_a@campus.edu',
            password='StudentPassword123!',
            role=User.RoleType.STUDENT,
        )
        self.student_b = User.objects.create_user(
            email='notif_b@campus.edu',
            password='StudentPassword123!',
            role=User.RoleType.STUDENT,
        )
        self.notif_a1 = Notification.objects.create(
            recipient=self.student_a,
            title='Match Found',
            message='A found item matches your lost report.',
            category=Notification.Category.MATCH_ALERT,
            link_path='/report-lost',
        )
        self.notif_a2 = Notification.objects.create(
            recipient=self.student_a,
            title='Item Claimed',
            message='Your item was released.',
            category=Notification.Category.CLAIM,
            link_path='/report-lost',
        )
        self.notif_b1 = Notification.objects.create(
            recipient=self.student_b,
            title='Honesty Points',
            message='Points awarded.',
            category=Notification.Category.INTAKE,
            link_path='/leaderboard',
        )

    def test_anonymous_cannot_access_or_delete_notifications(self):
        self.assertIn(self.client.get('/api/notifications/').status_code, (401, 403))
        self.assertIn(
            self.client.delete(f'/api/notifications/{self.notif_a1.id}/').status_code,
            (401, 403),
        )
        self.assertIn(self.client.delete('/api/notifications/clear/').status_code, (401, 403))
        self.assertIn(self.client.get('/api/notifications/push/vapid-public-key/').status_code, (401, 403))
        self.assertIn(self.client.post('/api/notifications/push/subscribe/', {}).status_code, (401, 403))
        self.assertIn(self.client.post('/api/notifications/push/unsubscribe/', {}).status_code, (401, 403))
        self.assertEqual(Notification.objects.count(), 3)

    def test_user_can_delete_own_notification_but_not_others(self):
        self.client.force_authenticate(user=self.student_a)

        # Cannot delete student_b's notification
        denied = self.client.delete(f'/api/notifications/{self.notif_b1.id}/')
        self.assertEqual(denied.status_code, 404)
        self.assertTrue(Notification.objects.filter(pk=self.notif_b1.id).exists())

        # Can delete own notification
        ok = self.client.delete(f'/api/notifications/{self.notif_a1.id}/')
        self.assertEqual(ok.status_code, 204)
        self.assertFalse(Notification.objects.filter(pk=self.notif_a1.id).exists())
        self.assertTrue(Notification.objects.filter(pk=self.notif_a2.id).exists())

    def test_clear_all_deletes_only_authenticated_users_notifications(self):
        self.client.force_authenticate(user=self.student_a)
        res = self.client.delete('/api/notifications/clear/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['deleted_count'], 2)
        self.assertEqual(Notification.objects.filter(recipient=self.student_a).count(), 0)
        # Other user's notifications remain intact
        self.assertEqual(Notification.objects.filter(recipient=self.student_b).count(), 1)

    def test_sse_notification_stream_enforces_auth_and_emits_sync_frame(self):
        # Anonymous caller rejected with 403
        anon = self.client.get('/api/notifications/stream/?once=1')
        self.assertEqual(anon.status_code, 403)

        # Authenticated student receives text/event-stream with retry & sync payload
        self.client.force_authenticate(user=self.student_a)
        res = self.client.get('/api/notifications/stream/?once=1')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res['Content-Type'].startswith('text/event-stream'))
        body = b''.join(res.streaming_content).decode('utf-8')
        self.assertIn('retry: 3000', body)
        self.assertIn('event: sync', body)
        self.assertIn('"unread_count":2', body)

    @override_settings(VAPID_PUBLIC_KEY='test-pub-key', VAPID_PRIVATE_KEY='test-priv-key')
    def test_web_push_subscription_ownership_rebind_and_delivery(self):
        endpoint = 'https://fcm.googleapis.com/fcm/send/example-token-1'
        payload = {
            'endpoint': endpoint,
            'keys': {'p256dh': 'key-p256dh', 'auth': 'key-auth'},
            'user_agent': 'Xiaomi Chrome Mobile PWA',
        }

        # Student A subscribes device
        self.client.force_authenticate(user=self.student_a)
        vapid_res = self.client.get('/api/notifications/push/vapid-public-key/')
        self.assertEqual(vapid_res.status_code, 200)
        self.assertTrue(vapid_res.data['enabled'])
        self.assertEqual(vapid_res.data['public_key'], 'test-pub-key')

        sub_res = self.client.post('/api/notifications/push/subscribe/', payload, format='json')
        self.assertEqual(sub_res.status_code, 201)
        self.assertEqual(PushSubscription.objects.filter(user=self.student_a).count(), 1)

        # Student B cannot unsubscribe Student A's endpoint
        self.client.force_authenticate(user=self.student_b)
        unsub_denied = self.client.post(
            '/api/notifications/push/unsubscribe/',
            {'endpoint': endpoint},
            format='json',
        )
        self.assertEqual(unsub_denied.status_code, 200)
        self.assertEqual(unsub_denied.data['removed'], 0)
        self.assertTrue(PushSubscription.objects.filter(user=self.student_a, endpoint=endpoint).exists())

        # If Student B signs in on the same device and re-subscribes, endpoint rebinds to Student B
        rebind_res = self.client.post('/api/notifications/push/subscribe/', payload, format='json')
        self.assertEqual(rebind_res.status_code, 201)
        self.assertEqual(PushSubscription.objects.count(), 1)
        self.assertTrue(PushSubscription.objects.filter(user=self.student_b, endpoint=endpoint).exists())

        # Sending Web Push delivers encrypted payload and prunes 410 Gone endpoints automatically
        notif = notify_user(
            recipient=self.student_b,
            title='Claim Verified',
            message='Your item is ready.',
            category=Notification.Category.CLAIM,
            link_path='/report-lost',
        )
        with patch('pywebpush.webpush') as mock_webpush:
            delivered = send_web_push_for_notification(notif.id)
            self.assertEqual(delivered, 1)
            mock_webpush.assert_called_once()

        # Simulate expired 410 subscription cleanup
        from pywebpush import WebPushException

        expired_resp = MagicMock(status_code=410)
        with patch('pywebpush.webpush', side_effect=WebPushException('Gone', response=expired_resp)):
            delivered = send_web_push_for_notification(notif.id)
            self.assertEqual(delivered, 0)
            self.assertEqual(PushSubscription.objects.count(), 0)

        # Delayed test push returns 400 when user has 0 active subscriptions, 202 when subscribed
        no_sub_test = self.client.post('/api/notifications/push/test/', {'delay_seconds': 0}, format='json')
        self.assertEqual(no_sub_test.status_code, 400)

        self.client.post('/api/notifications/push/subscribe/', payload, format='json')
        with patch('pywebpush.webpush'):
            ok_test = self.client.post('/api/notifications/push/test/', {'delay_seconds': 0}, format='json')
            self.assertEqual(ok_test.status_code, 202)
            self.assertTrue(ok_test.data['ok'])
