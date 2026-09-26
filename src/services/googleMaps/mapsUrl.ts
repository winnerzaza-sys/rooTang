import type { AppCoordinate, RouteOption } from '../../domain/types';

function coordinateValue(coordinate: AppCoordinate): string {
  return `${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)}`;
}

/** Cross-platform URL: opens the Google Maps app when installed, web otherwise. */
export function googleMapsNavigationUrl(route: RouteOption): string {
  const origin = route.path[0];
  const destination = route.path.at(-1);
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('travelmode', 'driving');
  url.searchParams.set('dir_action', 'navigate');
  if (!origin || !destination) return url.toString();
  url.searchParams.set('origin', coordinateValue(origin));
  url.searchParams.set('destination', coordinateValue(destination));
  return url.toString();
}
