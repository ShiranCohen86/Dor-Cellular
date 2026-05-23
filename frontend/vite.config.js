import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Vite config.
 *
 *  - React fast-refresh plugin.
 *  - Dev proxy for /api and /socket.io → backend on :5000.
 *  - VitePWA: generates a service worker that pre-caches the app shell and
 *    runtime-caches public storefront responses so the shop works offline once
 *    the user has visited it at least once.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
        manifest: {
          name: 'דור הסלולר',
          short_name: 'דור הסלולר',
          description: 'חנות סלולר ומחשבים ומעבדת תיקונים',
          theme_color: '#d41f1f',
          background_color: '#0d0d0d',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          dir: 'auto',
          lang: 'he',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // Cache the public storefront API + categories so the shop renders offline
          // after the first visit. Admin endpoints are NOT cached.
          runtimeCaching: [
            {
              urlPattern: /\/api\/public\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'public-api-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false }, // service worker off during `vite dev` to avoid cache headaches
      }),
    ],
    build: {
      outDir: '../backend/public',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: env.VITE_API_URL || 'http://localhost:5000', changeOrigin: true },
        '/socket.io': { target: env.VITE_API_URL || 'http://localhost:5000', ws: true, changeOrigin: true },
      },
    },
  };
});
