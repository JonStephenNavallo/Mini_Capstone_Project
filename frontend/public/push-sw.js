/**
 * Background Web Push & Notification Click handlers imported into Workbox sw.js.
 * Enables mobile PWAs (Android Chrome / iOS Safari) to receive notifications even
 * when swiped away from Recent Apps, while deduplicating against foreground SSE via `tag`.
 */

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        title: 'Lost & Found Update',
        body: event.data.text(),
      };
    }
  }

  const title = payload.title || 'Lost & Found Update';
  const notifId = payload.id ? String(payload.id) : '';
  const tag =
    payload.tag || (notifId ? `osas-lnf-notif-${notifId}` : `osas-lnf-notif-${Date.now()}`);
  const linkPath = payload.link_path || '/';

  const options = {
    body: payload.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag,
    renotify: false,
    data: {
      linkPath,
      id: notifId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawPath = event.notification?.data?.linkPath || '/';
  const targetUrl = new URL(rawPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            if ('navigate' in client && client.url !== targetUrl) {
              return client
                .navigate(targetUrl)
                .then((navigated) => (navigated || client).focus())
                .catch(() => client.focus());
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
