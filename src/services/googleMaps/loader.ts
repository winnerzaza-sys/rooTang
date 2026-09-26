import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { googleMapsConfig, GoogleMapsConfigurationError } from './config';

let configured = false;

function configureOnce() {
  if (!googleMapsConfig.apiKey) throw new GoogleMapsConfigurationError();
  if (!configured) {
    setOptions({
      key: googleMapsConfig.apiKey,
      v: 'weekly',
      language: 'th',
      region: 'TH',
      authReferrerPolicy: 'origin',
      ...(googleMapsConfig.mapId ? { mapIds: [googleMapsConfig.mapId] } : {}),
    });
    configured = true;
  }
}

export async function loadGoogleLibrary<
  T extends keyof google.maps.ImportLibraryMap,
>(name: T): Promise<google.maps.ImportLibraryMap[T]> {
  configureOnce();
  return importLibrary(name);
}
