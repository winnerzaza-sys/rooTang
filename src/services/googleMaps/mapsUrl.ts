import type { AppCoordinate, RouteOption } from '../../domain/types';

const MOBILE_WAYPOINT_LIMIT = 3;

function coordinateValue(coordinate: AppCoordinate): string {
  return `${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)}`;
}

function routeWaypoints(path: AppCoordinate[]): AppCoordinate[] {
  if (path.length <= 2) return [];
  const indexes = Array.from({ length: MOBILE_WAYPOINT_LIMIT }, (_, index) =>
    Math.round(((index + 1) * (path.length - 1)) / 4),
  );
  return [...new Set(indexes)]
    .filter((index) => index > 0 && index < path.length - 1)
    .map((index) => path[index]!);
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
  const waypoints = routeWaypoints(route.path);
  if (waypoints.length)
    url.searchParams.set('waypoints', waypoints.map(coordinateValue).join('|'));
  return url.toString();
}
