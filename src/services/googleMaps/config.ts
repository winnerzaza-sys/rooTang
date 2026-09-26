export const googleMapsConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '',
  mapId: import.meta.env.VITE_GOOGLE_MAP_ID?.trim() || undefined,
  enabled: import.meta.env.VITE_DATA_MODE === 'production',
};

export class GoogleMapsConfigurationError extends Error {
  constructor() {
    super('Google Maps API key is missing');
    this.name = 'GoogleMapsConfigurationError';
  }
}
