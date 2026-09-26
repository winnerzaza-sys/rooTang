import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  browserLocationService,
  LocationServiceError,
} from './browserLocationService';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('browserLocationService', () => {
  it('returns a single current position without watching', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({
        coords: { latitude: 13.7, longitude: 100.5 },
      } as GeolocationPosition),
    );
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition },
    });
    await expect(browserLocationService.getCurrentPosition()).resolves.toEqual({
      latitude: 13.7,
      longitude: 100.5,
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
  ] as const)('maps geolocation error %s to %s', async (code, expected) => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          failure: PositionErrorCallback,
        ) => failure({ code } as GeolocationPositionError),
      },
    });
    await expect(browserLocationService.getCurrentPosition()).rejects.toEqual(
      new LocationServiceError(expected),
    );
  });
});
