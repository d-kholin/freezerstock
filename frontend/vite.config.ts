import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Prevent SW from claiming the current page mid-load on iOS standalone mode.
        // Without this, clients.claim() fires during activation and cancels in-flight
        // API requests, leaving TanStack Query with empty data on first open.
        clientsClaim: false,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // urlPattern must be a function for same-origin paths — a /^\/api\// regex
            // is tested against the full absolute URL and never matches.
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'FreezerStock',
        short_name: 'FreezerStock',
        description: 'Track your freezer inventory',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api/ws': {
        target: 'ws://backend:3001',
        ws: true,
      },
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
      },
    },
  },
});
