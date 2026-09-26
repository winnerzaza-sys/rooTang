import { useSyncExternalStore } from 'react';

/**
 * Update prompt state for a waiting service worker. Registration lives in
 * registerServiceWorker.ts so this module stays free of the PWA virtual
 * module and can be used from components and tests.
 */
type ApplyUpdate = () => Promise<void>;

/** Reload anyway if the new worker never takes control. */
export const UPDATE_RELOAD_FALLBACK_MS = 4_000;

let needRefresh = false;
let apply: ApplyUpdate | undefined;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function notifyUpdateReady(applyUpdate: ApplyUpdate) {
  apply = applyUpdate;
  needRefresh = true;
  emit();
}

export function dismissUpdate() {
  // The waiting worker stays; the prompt returns on the next launch.
  needRefresh = false;
  emit();
}

export async function applyUpdate(reload = () => window.location.reload()) {
  const fallback = window.setTimeout(reload, UPDATE_RELOAD_FALLBACK_MS);
  try {
    // Activates the waiting worker; the page reloads once it takes control.
    await apply?.();
    if (!apply) {
      window.clearTimeout(fallback);
      reload();
    }
  } catch {
    window.clearTimeout(fallback);
    reload();
  }
}

export function resetServiceWorkerUpdateForTests() {
  needRefresh = false;
  apply = undefined;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useServiceWorkerUpdate(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => needRefresh,
    () => false,
  );
}
