import { nearestPointOnLine } from '@turf/nearest-point-on-line';
import {
  boundsOfPath,
  containsCoordinate,
  isValidCoordinate,
  padBounds,
} from '../geo';
import type { AppCoordinate, RoadIncident, RouteIncidentMatch } from '../types';
import {
  AREA_EVENT_CATEGORIES,
  matchingConfig,
  ROUTE_CORRIDOR_METERS,
} from './config';
import { toRouteLine } from './routeLine';

export function corridorFor(category: RoadIncident['category']): number {
  return ROUTE_CORRIDOR_METERS[category] ?? ROUTE_CORRIDOR_METERS.other;
}

/**
 * True only when the report is confidently finished: an explicit
 * resolved/expired status or a parseable expiry time in the past. Unknown
 * status is kept so the UI can show it with its timestamp.
 */
export function isConfidentlyInactive(
  incident: RoadIncident,
  now: number,
): boolean {
  if (incident.status === 'resolved' || incident.status === 'expired')
    return true;
  if (!incident.expiresAt) return false;
  const expires = Date.parse(incident.expiresAt);
  return Number.isFinite(expires) && expires <= now;
}

export function isPossibleParallelRoad(
  incident: RoadIncident,
  distanceFromRouteMeters: number,
): boolean {
  if (AREA_EVENT_CATEGORIES.has(incident.category)) return false;
  if (distanceFromRouteMeters > matchingConfig.PARALLEL_ROAD_OFFSET_METERS)
    return true;
  const text = `${incident.title} ${incident.description ?? ''}`;
  return (
    matchingConfig.PARALLEL_ROAD_TEXT.test(text) &&
    distanceFromRouteMeters > matchingConfig.PARALLEL_ROAD_TEXT_OFFSET_METERS
  );
}

export function compareEncounterOrder(
  a: RouteIncidentMatch,
  b: RouteIncidentMatch,
): number {
  return (
    a.distanceFromStartMeters - b.distanceFromStartMeters ||
    a.distanceFromRouteMeters - b.distanceFromRouteMeters ||
    a.incident.id.localeCompare(b.incident.id)
  );
}

/**
 * Matches normalized incidents to one route using category corridors and
 * returns them in encounter order. The result describes proximity only.
 */
export function matchIncidentsToRoute(
  routeId: string,
  path: AppCoordinate[],
  incidents: RoadIncident[],
  now: number,
): RouteIncidentMatch[] {
  const line = toRouteLine(path);
  const bounds = boundsOfPath(path);
  if (!line || !bounds) return [];
  const searchArea = padBounds(
    bounds,
    matchingConfig.ROUTE_QUERY_PADDING_METERS,
  );
  const matches: RouteIncidentMatch[] = [];
  for (const incident of incidents) {
    if (!isValidCoordinate(incident)) continue;
    if (isConfidentlyInactive(incident, now)) continue;
    if (!containsCoordinate(searchArea, incident)) continue;
    const corridorMeters = corridorFor(incident.category);
    const snapped = nearestPointOnLine(
      line.feature,
      [incident.longitude, incident.latitude],
      { units: 'meters' },
    );
    const distanceFromRouteMeters = Math.round(
      snapped.properties.pointDistance,
    );
    if (distanceFromRouteMeters > corridorMeters) continue;
    const distanceFromStartMeters = Math.round(
      Math.min(snapped.properties.totalDistance, line.lengthMeters),
    );
    const matchReason =
      distanceFromStartMeters <= matchingConfig.ROUTE_ENDPOINT_METERS
        ? 'near_route_start'
        : line.lengthMeters - distanceFromStartMeters <=
            matchingConfig.ROUTE_ENDPOINT_METERS
          ? 'near_route_end'
          : 'within_corridor';
    matches.push({
      incident,
      routeId,
      distanceFromRouteMeters,
      distanceFromStartMeters,
      distanceAheadMeters: distanceFromStartMeters,
      matchReason,
      corridorMeters,
      possibleParallelRoad: isPossibleParallelRoad(
        incident,
        distanceFromRouteMeters,
      ),
      duplicateCandidateIds: [],
    });
  }
  return matches.sort(compareEncounterOrder);
}
