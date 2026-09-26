import { defineConfig, devices } from '@playwright/test';

const MOCK_URL = 'http://127.0.0.1:4173';
const BUILD_URL = 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    // Mock data mode on the dev server: deterministic UI flows.
    {
      name: 'mobile-chromium',
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices['Pixel 7'], baseURL: MOCK_URL },
    },
    {
      name: 'desktop-chromium',
      testIgnore: /pwa\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        baseURL: MOCK_URL,
      },
    },
    // WebKit engine at 390 × 844. An approximation of iOS Safari, not a
    // substitute for testing on a real device.
    {
      name: 'mobile-webkit',
      testIgnore: /pwa\.spec\.ts/,
      use: { ...devices['iPhone 13'], baseURL: MOCK_URL },
    },
    {
      name: 'pwa-production-build-webkit',
      testMatch: /pwa\.spec\.ts/,
      use: { ...devices['iPhone 13'], baseURL: BUILD_URL },
    },
    // Production build (service worker, production data paths) with an empty
    // Google key and intercepted /api responses: no paid or provider calls.
    {
      name: 'pwa-production-build',
      testMatch: /pwa\.spec\.ts/,
      use: { ...devices['Pixel 7'], baseURL: BUILD_URL },
    },
  ],
  webServer: [
    {
      command:
        'VITE_DATA_MODE=mock npm run dev -- --host 127.0.0.1 --port 4173',
      url: MOCK_URL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        'VITE_DATA_MODE=production VITE_GOOGLE_MAPS_API_KEY= VITE_GOOGLE_MAP_ID= npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --host 127.0.0.1 --port 4174 --strictPort',
      url: BUILD_URL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
