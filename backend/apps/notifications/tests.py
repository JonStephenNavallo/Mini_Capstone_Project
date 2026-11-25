from django.test import TestCase
from rest_framework.test import APIClient

from apps.notifications.models import Notification
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
