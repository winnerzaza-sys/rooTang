import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyUpdate,
  notifyUpdateReady,
  resetServiceWorkerUpdateForTests,
  UPDATE_RELOAD_FALLBACK_MS,
} from './serviceWorkerUpdate';

afterEach(() => {
  vi.useRealTimers();
  resetServiceWorkerUpdateForTests();
});

describe('applyUpdate', () => {
  it('reloads immediately when activating the worker fails', async () => {
    const reload = vi.fn();
    notifyUpdateReady(() => Promise.reject(new Error('no waiting worker')));
    await applyUpdate(reload);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('falls back to a reload if the new worker never takes control', async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    notifyUpdateReady(() => Promise.resolve());
    await applyUpdate(reload);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(UPDATE_RELOAD_FALLBACK_MS);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
