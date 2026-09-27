import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  INCIDENT_REFRESH_MS,
  IncidentRefreshController,
} from './refreshController';

afterEach(() => vi.useRealTimers());

describe('IncidentRefreshController', () => {
  it('polls incidents every five minutes', () => {
    expect(INCIDENT_REFRESH_MS).toBe(300_000);
  });

  it('pauses while offline and refreshes when visible and stale', () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    let online = false;
    const controller = new IncidentRefreshController(refresh, () => online);
    controller.markUpdated(0);
    controller.start();
    vi.advanceTimersByTime(INCIDENT_REFRESH_MS);
    expect(refresh).not.toHaveBeenCalled();
    online = true;
    controller.handleVisible(INCIDENT_REFRESH_MS);
    expect(refresh).toHaveBeenCalledOnce();
    controller.stop();
  });
  it('pauses polling while the document is hidden', () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    const controller = new IncidentRefreshController(refresh, () => true);
    controller.start();
    vi.advanceTimersByTime(INCIDENT_REFRESH_MS * 2);
    expect(refresh).not.toHaveBeenCalled();
    controller.stop();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });
});
