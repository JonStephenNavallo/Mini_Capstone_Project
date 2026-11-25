"""
In-Process Notification Event Broker for Server-Sent Events (SSE)
=================================================================
Adapted from Capstone_Project_Stg2's zero-dependency pub/sub broker.
Provides thread-safe signaling so open SSE connections wake up immediately (<1ms)
whenever a notification is created, read, or deleted via the service layer.
"""

import threading
import time
from collections import deque


class NotificationEventBroker:
    """
    Thread-safe per-user ring-buffer pub/sub broker using a single Condition per
    active recipient user ID so multiple concurrent tabs for the same user each
    receive every published event after their cursor.
    """

    MAX_BUFFER_PER_USER = 32

    def __init__(self):
        self._lock = threading.Lock()
        self._channels = {}

    def _get_or_create_channel(self, user_id):
        with self._lock:
            channel = self._channels.get(user_id)
            if channel is None:
                channel = {
                    'cond': threading.Condition(),
                    'seq': 0,
                    'events': deque(maxlen=self.MAX_BUFFER_PER_USER),
                    'subscribers': 0,
                }
                self._channels[user_id] = channel
            return channel

    def publish(self, user_id, event_type='sync', payload=None):
        """Publish an event to all active SSE streams for `user_id`."""
        if not user_id:
            return

        channel = self._get_or_create_channel(int(user_id))
        cond = channel['cond']
        with cond:
            channel['seq'] += 1
            seq = channel['seq']
            channel['events'].append((
                seq,
                {
                    'seq': seq,
                    'event': event_type,
                    'data': payload or {},
                    'timestamp': time.time(),
                },
            ))
            cond.notify_all()

    def get_current_seq(self, user_id):
        """Return the current sequence number for `user_id` before waiting."""
        channel = self._get_or_create_channel(int(user_id))
        with channel['cond']:
            return channel['seq']

    def wait_for_events(self, user_id, last_seq, timeout=15.0):
        """Block up to `timeout` seconds until `channel['seq'] > last_seq`."""
        channel = self._get_or_create_channel(int(user_id))
        cond = channel['cond']
        with cond:
            channel['subscribers'] += 1
            try:
                if channel['seq'] <= last_seq:
                    cond.wait(timeout=timeout)

                events = [
                    evt for seq, evt in channel['events']
                    if seq > last_seq
                ]
                return channel['seq'], events
            finally:
                channel['subscribers'] = max(0, channel['subscribers'] - 1)


notification_broker = NotificationEventBroker()
