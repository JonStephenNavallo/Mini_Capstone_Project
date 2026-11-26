import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Adapted from DannyMoerkerke/web-push-demo (whatpwacando.today):
 * Prepends `push`, `notificationclick`, and `notificationclose` listeners synchronously
 * at line 1 of `dist/sw.js` BEFORE Workbox's async `define([...])` AMD loader.
 *
 * Why this is critical on Android/iOS PWAs:
 * Per the W3C Service Worker spec, `push` event listeners MUST be registered synchronously
 * during initial worker script evaluation. Placing `importScripts()` inside Workbox's async
 * `Promise.all().then()` callback causes Chrome to miss cold-start background push wakeups
 * when the PWA is swiped away from Recent Apps.
 */
const TOP_LEVEL_PUSH_SW_PREAMBLE = `/* Top-level Web Push handlers (adapted from pwa-today / DannyMoerkerke/web-push-demo) */
const pushHandler = (event) => {
  let data = {
    id: '',
    title: 'Lost & Found Update',
    body: 'You have a new Campus Lost & Found notification.',
    link_path: '/',
    tag: '',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        ...data,
        ...parsed,
        body: parsed.body || parsed.message || data.body,
      };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const notifId = data.id ? String(data.id) : '';
  const tag = data.tag || (notifId ? 'osas-lnf-notif-' + notifId : 'osas-lnf-notif-' + Date.now());
  const targetPath = data.link_path || data.url || '/';

  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    tag,
    renotify: true,
    data: {
      dateOfArrival: Date.now(),
      linkPath: targetPath,
      id: notifId,
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
};

const notificationClickHandler = (event) => {
  event.notification.close();
  if (event.action === 'close') {
    return;
  }

  const rawPath = (event.notification && event.notification.data && event.notification.data.linkPath) || '/';
  const targetUrl = new URL(rawPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find(
        (c) => c.url && c.url.startsWith(self.location.origin) && 'focus' in c
      );
      if (existingClient) {
        if ('navigate' in existingClient && existingClient.url !== targetUrl) {
          return existingClient
            .navigate(targetUrl)
            .then((navigated) => (navigated || existingClient).focus())
            .catch(() => existingClient.focus());
        }
        return existingClient.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
};

const notificationCloseHandler = () => {};

self.addEventListener('push', pushHandler);
self.addEventListener('notificationclick', notificationClickHandler);
self.addEventListener('notificationclose', notificationCloseHandler);
`;

function prependTopLevelPushSwPlugin() {
  let outDir = 'dist';
  return {
    name: 'prepend-top-level-push-sw',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const swPath = path.resolve(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const current = fs.readFileSync(swPath, 'utf8');
      if (current.includes("self.addEventListener('push', pushHandler)")) return;
      fs.writeFileSync(swPath, `${TOP_LEVEL_PUSH_SW_PREAMBLE}\n${current}`, 'utf8');
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script',
        includeAssets: [
          'favicon.ico',
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png'
        ],
        manifest: {
          id: '/',
          name: 'Campus Property Lost & Found Portal',
          short_name: 'Lost & Found',
          description: 'OSAS Campus Property Lost & Found Log and Student Portal',
          theme_color: '#042a3f',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          shortcuts: [
            {
              name: 'Browse Found Items',
              short_name: 'Explore Items',
              description: 'Browse found campus property currently in OSAS custody',
              url: '/explore'
            },
            {
              name: 'OSAS Admin Desk',
              short_name: 'OSAS Admin',
              description: 'Manage custody items, intake, and walk-in claims',
              url: '/admin/dashboard'
            }
          ]
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/api/, /^\/media/],
        },
        devOptions: {
          enabled: false,
        }
      }),
      prependTopLevelPushSwPlugin(),
    ],
    server: {
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    optimizeDeps: {
      include: [
        'tslib',
        'lit',
        '@lit/react',
        '@m3e/web/fab',
        '@m3e/web/fab-menu',
        '@m3e/web/icon',
        '@m3e/web/nav-bar',
        '@m3e/web/loading-indicator',
        '@m3e/react/fab',
        '@m3e/react/fab-menu',
        '@m3e/react/icon',
        '@m3e/react/nav-bar',
        '@m3e/react/loading-indicator',
        '@mui/x-scheduler/event-calendar',
        'date-fns',
        '@date-fns/tz',
      ],
    },
  }
})
