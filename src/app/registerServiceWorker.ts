import { registerSW } from 'virtual:pwa-register';
import { notifyUpdateReady } from './serviceWorkerUpdate';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

/** Registers the app-shell worker; a failure leaves the online app usable. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const updateServiceWorker = registerSW({
    onNeedRefresh: () => notifyUpdateReady(() => updateServiceWorker(true)),
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      window.setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => undefined);
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(error) {
      if (import.meta.env.DEV)
        console.error('Service worker registration failed', error);
    },
  });
}
