import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/, /^\/media/],
      },
      devOptions: {
        enabled: false,
      }
    })
  ],
  server: {
    host: true, // Listen on all local IP addresses (0.0.0.0)
    allowedHosts: true, // Allow tunnel hostnames like .loca.lt
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
    host: true, // Allow preview on local IP (0.0.0.0)
    allowedHosts: true, // Allow tunnel hostnames like .loca.lt
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
}})
