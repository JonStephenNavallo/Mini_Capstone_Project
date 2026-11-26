import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';

export const NOTIFICATIONS_KEY_PREFIX = ['notifications', 'list'];
const BROADCAST_CHANNEL_NAME = 'osas_lnf_notifications_sync';

/**
 * Module-scoped singleton manager adapted from Capstone_Project_Stg2 so multiple
 * consumers (`Topbar` badge and `NotificationsDrawer` panel) share a single active
 * EventSource SSE stream, BroadcastChannel, and Web Push subscription sync per session.
 */
const streamManager = {
  eventSource: null,
  broadcastChannel: null,
  subscriberCount: 0,
  activeUserId: null,
  queryClient: null,
  knownIds: new Set(),
  initialLoadComplete: false,
  lastEventId: '',
  syncedPushKey: '',
  pushSyncPromise: null,
};

function getNotificationsQueryKey(userId) {
  return [...NOTIFICATIONS_KEY_PREFIX, userId || 'anon'];
}

function getBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function keysMatch(bufferA, arrayB) {
  if (!bufferA || !arrayB) return false;
  const viewA = new Uint8Array(bufferA);
  if (viewA.length !== arrayB.length) return false;
  for (let i = 0; i < viewA.length; i += 1) {
    if (viewA[i] !== arrayB[i]) return false;
  }
  return true;
}

/**
 * Register or refresh this device's VAPID Web Push subscription on the backend so
 * notifications still arrive when the mobile PWA is swiped away from Recent Apps.
 * Fails silently if VAPID keys are not configured or PushManager is unsupported.
 */
export async function syncWebPushSubscription(userId, { force = false } = {}) {
  if (!userId || typeof window === 'undefined') {
    return { ok: false, status: 'idle' };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, status: 'unsupported' };
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, status: 'permission-required' };
  }

  if (streamManager.pushSyncPromise && !force) {
    return streamManager.pushSyncPromise;
  }

  streamManager.pushSyncPromise = (async () => {
    try {
      const { data: vapid } = await api.get('/notifications/push/vapid-public-key/');
      if (!vapid?.enabled || !vapid?.public_key) {
        return { ok: false, status: 'unconfigured' };
      }

      const applicationServerKey = urlBase64ToUint8Array(vapid.public_key);
      const registration = await navigator.serviceWorker.ready;
      if (!registration?.pushManager) {
        return { ok: false, status: 'unsupported' };
      }

      let subscription = await registration.pushManager.getSubscription();
      if (subscription && subscription.options?.applicationServerKey) {
        if (!keysMatch(subscription.options.applicationServerKey, applicationServerKey)) {
          await subscription.unsubscribe();
          subscription = null;
        }
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const serialized = subscription.toJSON();
      if (!serialized?.endpoint || !serialized?.keys?.p256dh || !serialized?.keys?.auth) {
        return { ok: false, status: 'error' };
      }

      const cacheKey = `${userId}:${serialized.endpoint}`;
      if (!force && streamManager.syncedPushKey === cacheKey && Number(vapid.subscription_count) > 0) {
        return { ok: true, status: 'subscribed' };
      }

      // Ensure CSRF cookie is fresh before POSTing on mobile PWAs resuming from sleep
      await api.get('/auth/csrf/', { sessionControl: true });
      await api.post('/notifications/push/subscribe/', {
        endpoint: serialized.endpoint,
        keys: {
          p256dh: serialized.keys.p256dh,
          auth: serialized.keys.auth,
        },
        user_agent: navigator.userAgent || '',
      });

      streamManager.syncedPushKey = cacheKey;
      return { ok: true, status: 'subscribed' };
    } catch {
      // Keep existing SSE notifications working even if Web Push registration fails
      return { ok: false, status: 'error' };
    } finally {
      streamManager.pushSyncPromise = null;
    }
  })();

  return streamManager.pushSyncPromise;
}

/**
 * Best-effort Web Push unregistration invoked right before session logout so a shared
 * device stops receiving background pushes for the signed-out user. Never throws.
 */
export async function unsubscribeDeviceWebPush() {
  streamManager.syncedPushKey = '';
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    if (endpoint) {
      await api.post(
        '/notifications/push/unsubscribe/',
        { endpoint },
        { sessionControl: true }
      );
    }
  } catch {
    // Never block or fail logout on push cleanup errors
  }
}

/**
 * Show a native device/browser notification. Uses a deterministic `tag` matching the
 * Service Worker's Web Push handler (`osas-lnf-notif-<id>`) so the OS deduplicates
 * foreground SSE notifications and background Web Push deliveries without double banners.
 */
function triggerBrowserNotification(title, body, linkPath = '', notifId = '') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const tag = notifId ? `osas-lnf-notif-${notifId}` : undefined;
  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    ...(tag ? { tag, renotify: false } : {}),
    data: { linkPath, id: notifId ? String(notifId) : '' },
  };

  if ('serviceWorker' in navigator && navigator.serviceWorker?.ready) {
    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration && typeof registration.showNotification === 'function') {
          return registration.showNotification(title, options);
        }
        new Notification(title, options);
        return undefined;
      })
      .catch(() => {
        try {
          new Notification(title, options);
        } catch {
          // Ignore restricted contexts
        }
      });
    return;
  }

  try {
    new Notification(title, options);
  } catch {
    // Ignore browser notification errors in restricted contexts
  }
}

function broadcastCacheUpdate(userId, type, payload) {
  if (!streamManager.broadcastChannel || !userId) return;
  try {
    streamManager.broadcastChannel.postMessage({ userId, type, payload });
  } catch {
    // Ignore BroadcastChannel serialization errors
  }
}

function applyIncomingNotification(queryClient, userId, payload) {
  const incoming = payload?.notification;
  if (!incoming || !incoming.id || !userId) return;

  streamManager.lastEventId = String(incoming.id);
  const isNewId = !streamManager.knownIds.has(incoming.id);
  streamManager.knownIds.add(incoming.id);

  if (isNewId && streamManager.initialLoadComplete && !incoming.is_read) {
    triggerBrowserNotification(incoming.title, incoming.message, incoming.link_path, incoming.id);
  }

  const queryKey = getNotificationsQueryKey(userId);
  queryClient.setQueryData(queryKey, (old) => {
    const existing = Array.isArray(old?.results) ? old.results : [];
    const alreadyPresent = existing.some((n) => n.id === incoming.id);
    const nextResults = alreadyPresent
      ? existing.map((n) => (n.id === incoming.id ? { ...n, ...incoming } : n))
      : [incoming, ...existing];

    const unreadCount =
      typeof payload.unread_count === 'number'
        ? payload.unread_count
        : nextResults.filter((n) => !n.is_read).length;

    return {
      results: nextResults,
      unread_count: unreadCount,
    };
  });

  // Live-refresh Lost & Found views (Explore, My Lost Reports, Claim Guide, Directory)
  // whenever a claim, intake, or auto-match notification arrives over SSE
  queryClient.invalidateQueries({ queryKey: ['lostFound'] });
}

function applyIncomingSync(queryClient, userId, payload) {
  if (!payload || typeof payload !== 'object' || !userId) return;
  const serverUnread = payload.unread_count;
  const serverLatestId = payload.latest_id || '';

  if (serverLatestId) {
    streamManager.lastEventId = String(serverLatestId);
  }

  const queryKey = getNotificationsQueryKey(userId);
  const currentData = queryClient.getQueryData(queryKey);
  if (!currentData) return;

  const localResults = Array.isArray(currentData.results) ? currentData.results : [];
  const localLatestId = localResults[0]?.id ? String(localResults[0].id) : '';
  const localUnread = currentData.unread_count ?? localResults.filter((n) => !n.is_read).length;

  if (
    (serverLatestId && serverLatestId !== localLatestId) ||
    (typeof serverUnread === 'number' && serverUnread !== localUnread)
  ) {
    queryClient.invalidateQueries({ queryKey });
  }
}

function stopRealtimeSync(resetSessionTracking = false) {
  if (streamManager.eventSource) {
    try {
      streamManager.eventSource.close();
    } catch {
      // Ignore close errors
    }
    streamManager.eventSource = null;
  }

  if (streamManager.broadcastChannel) {
    try {
      streamManager.broadcastChannel.close();
    } catch {
      // Ignore close errors
    }
    streamManager.broadcastChannel = null;
  }

  if (resetSessionTracking) {
    streamManager.activeUserId = null;
    streamManager.knownIds.clear();
    streamManager.initialLoadComplete = false;
    streamManager.lastEventId = '';
    streamManager.syncedPushKey = '';
  }
}

function startRealtimeSync(queryClient, userId) {
  if (!userId) return;

  // If the signed-in user changed (e.g. Student <-> Admin), tear down the previous user's stream first
  if (streamManager.activeUserId && streamManager.activeUserId !== userId) {
    stopRealtimeSync(true);
  }

  streamManager.queryClient = queryClient;
  streamManager.activeUserId = userId;

  // 1. Cross-tab BroadcastChannel for instant 0ms tab-to-tab mutation sync
  if (
    !streamManager.broadcastChannel &&
    typeof window !== 'undefined' &&
    'BroadcastChannel' in window
  ) {
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event) => {
        const { userId: msgUserId, type, payload } = event.data || {};
        if (!streamManager.queryClient || msgUserId !== streamManager.activeUserId) return;
        const queryKey = getNotificationsQueryKey(msgUserId);
        if (type === 'CACHE_SNAPSHOT' && payload) {
          streamManager.queryClient.setQueryData(queryKey, payload);
        } else if (type === 'INVALIDATE') {
          streamManager.queryClient.invalidateQueries({ queryKey });
        }
      };
      streamManager.broadcastChannel = bc;
    } catch {
      streamManager.broadcastChannel = null;
    }
  }

  // 2. Server-Sent Events (SSE) stream for instant server-to-client push without polling
  if (
    !streamManager.eventSource &&
    typeof window !== 'undefined' &&
    'EventSource' in window
  ) {
    const streamUrl = streamManager.lastEventId
      ? `/api/notifications/stream/?last_event_id=${encodeURIComponent(streamManager.lastEventId)}`
      : '/api/notifications/stream/';

    try {
      const es = new EventSource(streamUrl, { withCredentials: true });

      es.addEventListener('notification', (event) => {
        if (!streamManager.queryClient || streamManager.activeUserId !== userId) return;
        try {
          const payload = JSON.parse(event.data);
          applyIncomingNotification(streamManager.queryClient, userId, payload);
        } catch {
          // Ignore malformed SSE payload
        }
      });

      es.addEventListener('sync', (event) => {
        if (!streamManager.queryClient || streamManager.activeUserId !== userId) return;
        try {
          const payload = JSON.parse(event.data);
          applyIncomingSync(streamManager.queryClient, userId, payload);
        } catch {
          // Ignore malformed SSE payload
        }
      });

      es.onerror = () => {
        if (!streamManager.activeUserId) {
          stopRealtimeSync(true);
        }
      };

      streamManager.eventSource = es;
    } catch {
      streamManager.eventSource = null;
    }
  }
}

/**
 * Shared TanStack Query + Server-Sent Events (SSE) + VAPID Web Push hook for user notifications.
 */
export function useNotifications(currentUser) {
  const queryClient = useQueryClient();
  const userId = currentUser?.id ?? null;
  const isAuthenticated = Boolean(userId);
  const queryKey = useMemo(() => getNotificationsQueryKey(userId), [userId]);
  const [notificationPermission, setNotificationPermission] = useState(getBrowserNotificationPermission);
  const [pushStatus, setPushStatus] = useState('idle');
  const [pushTestFeedback, setPushTestFeedback] = useState('');

  const requestDeviceNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted' && userId) {
        setPushStatus('syncing');
        const res = await syncWebPushSubscription(userId, { force: true });
        setPushStatus(res.status);
      }
      return result;
    } catch {
      const fallback = getBrowserNotificationPermission();
      setNotificationPermission(fallback);
      return fallback;
    }
  }, [userId]);

  const sendTestBackgroundPush = useCallback(async () => {
    if (!userId) return;
    setPushTestFeedback('Syncing push subscription...');
    const syncRes = await syncWebPushSubscription(userId, { force: true });
    setPushStatus(syncRes.status);
    if (!syncRes.ok) {
      if (syncRes.status === 'unconfigured') {
        setPushTestFeedback('Server VAPID keys are not set in Render Environment yet.');
      } else if (syncRes.status === 'unsupported') {
        setPushTestFeedback('Web Push is not supported in this browser mode.');
      } else {
        setPushTestFeedback('Could not register push subscription. Re-open installed Chrome PWA and retry.');
      }
      return;
    }
    try {
      await api.get('/auth/csrf/', { sessionControl: true });
      await api.post('/notifications/push/test/', { delay_seconds: 5 });
      setPushTestFeedback('Scheduled! Swipe the app away now — alert arrives in 5 seconds.');
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to schedule test background push.';
      setPushTestFeedback(detail);
    }
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated) {
      stopRealtimeSync(true);
      return undefined;
    }

    streamManager.subscriberCount += 1;
    startRealtimeSync(queryClient, userId);

    const runPushSync = (force = false) => {
      if (getBrowserNotificationPermission() === 'granted') {
        syncWebPushSubscription(userId, { force }).then((res) => {
          setPushStatus(res.status);
        });
      }
    };

    runPushSync(false);

    // Re-sync automatically when a newly deployed Service Worker claims this PWA client
    const handleControllerChange = () => runPushSync(true);
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    return () => {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      streamManager.subscriberCount = Math.max(0, streamManager.subscriberCount - 1);
      if (streamManager.subscriberCount === 0) {
        stopRealtimeSync(false);
      }
    };
  }, [isAuthenticated, userId, queryClient]);

  const query = useQuery({
    queryKey,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await api.get('/notifications/');
      const results = Array.isArray(data?.results) ? data.results : [];
      const unreadCount =
        typeof data?.unread_count === 'number'
          ? data.unread_count
          : results.filter((n) => !n.is_read).length;
      return { results, unread_count: unreadCount };
    },
  });

  useEffect(() => {
    const items = query.data?.results;
    if (!items || !isAuthenticated) return;

    if (items[0]?.id) {
      streamManager.lastEventId = String(items[0].id);
    }
    items.forEach((n) => {
      if (!streamManager.knownIds.has(n.id)) {
        streamManager.knownIds.add(n.id);
        if (streamManager.initialLoadComplete && !n.is_read) {
          triggerBrowserNotification(n.title, n.message, n.link_path, n.id);
        }
      }
    });
    streamManager.initialLoadComplete = true;
  }, [query.data, isAuthenticated]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/notifications/${id}/read/`);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      const updated = queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        const nextResults = old.results.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        return {
          ...old,
          results: nextResults,
          unread_count: nextResults.filter((n) => !n.is_read).length,
        };
      });
      if (updated) broadcastCacheUpdate(userId, 'CACHE_SNAPSHOT', updated);
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        broadcastCacheUpdate(userId, 'CACHE_SNAPSHOT', context.previous);
      }
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all/');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      const updated = queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          results: old.results.map((n) => ({ ...n, is_read: true })),
          unread_count: 0,
        };
      });
      if (updated) broadcastCacheUpdate(userId, 'CACHE_SNAPSHOT', updated);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        broadcastCacheUpdate(userId, 'CACHE_SNAPSHOT', context.previous);
      }
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/notifications/${id}/`);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      const updated = queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        const nextResults = old.results.filter((n) => n.id !== id);
        return {
          ...old,
          results: nextResults,
          unread_count: nextResults.filter((n) => !n.is_read).length,
        };
      });
      if (updated) broadcastCacheUpdate(userId, 'CACHE_SNAPSHOT', updated);
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        broadcastCacheUpdate(userId, 'CACHE_SNAPSHOT', context.previous);
      }
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/notifications/clear/');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      const updated = queryClient.setQueryData(queryKey, () => ({
        results: [],
        unread_count: 0,
      }));
      if (updated) broadcastCacheUpdate(userId, 'CACHE_SNAPSHOT', updated);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        broadcastCacheUpdate(userId, 'CACHE_SNAPSHOT', context.previous);
      }
    },
  });

  return {
    notifications: query.data?.results ?? [],
    unreadCount: query.data?.unread_count ?? 0,
    isLoading: query.isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    clearAllNotifications: clearAllMutation.mutate,
    isMarkingAllRead: markAllReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
    isClearingAll: clearAllMutation.isPending,
    notificationPermission,
    requestDeviceNotificationPermission,
    pushStatus,
    pushTestFeedback,
    sendTestBackgroundPush,
  };
}

export default useNotifications;
