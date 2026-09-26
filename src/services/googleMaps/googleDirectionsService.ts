import type { RouteSearchRequest } from '../../domain/types';
import type { DirectionsService } from '../contracts';
import { loadGoogleLibrary } from './loader';
import { convertGoogleRoutes } from './routeConversion';

function isPlace(
  value: RouteSearchRequest['origin'],
): value is Extract<RouteSearchRequest['origin'], { placeId: string }> {
  return 'placeId' in value;
}

export const googleDirectionsService: DirectionsService = {
  async computeRoutes(input) {
    const [{ Route }, { Place }] = await Promise.all([
      loadGoogleLibrary('routes'),
      loadGoogleLibrary('places'),
    ]);
    const endpoint = (value: RouteSearchRequest['origin']) => {
      if (isPlace(value)) {
        if (value.placeId) return new Place({ id: value.placeId });
        return {
          lat: value.coordinate.latitude,
          lng: value.coordinate.longitude,
        };
      }
      return { lat: value.latitude, lng: value.longitude };
    };
    const { routes } = await Route.computeRoutes({
      origin: endpoint(input.origin),
      destination: endpoint(input.destination),
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: true,
      region: 'th',
      fields: [
        'path',
        'durationMillis',
        'distanceMeters',
        'viewport',
        'routeLabels',
      ],
    });
    return {
      routes: convertGoogleRoutes(routes ?? []),
      meta: {
        generatedAt: new Date().toISOString(),
        partial: false,
        providers: [],
      },
    };
  },
};
