import type { LocationService } from './contracts';

export type LocationErrorCode = 'denied' | 'unavailable' | 'timeout';

export class LocationServiceError extends Error {
  constructor(public readonly code: LocationErrorCode) {
    super(code);
    this.name = 'LocationServiceError';
  }
}

export const browserLocationService: LocationService = {
  getCurrentPosition() {
    if (!navigator.geolocation)
      return Promise.reject(new LocationServiceError('unavailable'));
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        (error) => {
          const code =
            error.code === 1
              ? 'denied'
              : error.code === 3
                ? 'timeout'
                : 'unavailable';
          reject(new LocationServiceError(code));
        },
        { enableHighAccuracy: false, maximumAge: 120_000, timeout: 10_000 },
      );
    });
  },
};
