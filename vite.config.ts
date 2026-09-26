import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The app shows its own update prompt (src/app/serviceWorkerUpdate.ts).
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'รู้ทาง',
        short_name: 'รู้ทาง',
        description: 'ดูสิ่งที่จะเจอตลอดเส้นทาง',
        lang: 'th',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1267e8',
        background_color: '#f5f7fa',
        icons: [
          {
            src: '/icons/ru-thang-app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/ru-thang-app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/ru-thang-app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // App shell and static build assets only. Incident, map and route
      // responses are never cached by the service worker.
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', 'dist-e2e/**'],
  },
});
