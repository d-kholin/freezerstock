import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Must be 'prompt' (the default), NOT 'autoUpdate': autoUpdate + injectRegister
      // 'auto' force-overrides skipWaiting/clientsClaim to true inside the plugin,
      // producing a SW that seizes control of already-open pages mid-session and
      // cancels in-flight API requests on iOS standalone. With 'prompt' the options
      // below are respected and a new SW simply waits; updates apply on the next
      // cold open after all pages of the old version are closed.
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        clientsClaim: false,
        skipWaiting: false,
        navigateFallbackDenylist: [/^\/api\//],
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
