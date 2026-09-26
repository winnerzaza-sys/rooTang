import { boundsOfPath, padBounds, unionBounds } from '../geo';
import type {
  AppBounds,
  RoadIncident,
  RouteIncidentMatch,
  RouteOption,
} from '../types';
import { matchingConfig } from './config';
import { duplicateCandidateIndex } from './deduplication';
import { isConfidentlyInactive, matchIncidentsToRoute } from './matchRoute';

/** Bounding box used to request incidents for all candidate routes. */
export function routeIncidentQuery(
  routes: RouteOption[],
): AppBounds | undefined {
  const bounds = unionBounds(
    routes
      .map((route) => boundsOfPath(route.path) ?? route.bounds)
      .filter((item): item is AppBounds => Boolean(item)),
  );
  return bounds
    ? padBounds(bounds, matchingConfig.ROUTE_QUERY_PADDING_METERS)
    : undefined;
}

/**
 * Attaches encounter-ordered matches to every route. Duplicate candidates
 * are listed per match (restricted to reports on the same route) and are
 * never merged or removed.
 */
export function analyzeRoutes(
  routes: RouteOption[],
  incidents: RoadIncident[],
  now: number,
): RouteOption[] {
  const active = incidents.filter(
    (incident) => !isConfidentlyInactive(incident, now),
  );
  const duplicates = duplicateCandidateIndex(active);
  return routes.map((route) => {
    const matches = matchIncidentsToRoute(route.id, route.path, active, now);
    const onRoute = new Set(matches.map((match) => match.incident.id));
    return {
      ...route,
      matches: matches.map((match) => ({
        ...match,
        duplicateCandidateIds: (duplicates.get(match.incident.id) ?? []).filter(
          (id) => onRoute.has(id),
        ),
      })),
    };
  });
}

export interface IncidentPin {
  incident: RoadIncident;
  match?: RouteIncidentMatch;
}

export interface RouteView {
  selectedRoute?: RouteOption;
  matches: RouteIncidentMatch[];
  pins: IncidentPin[];
  incidentCount: number;
}

/**
 * Everything that must change together when the selected route changes:
 * the selected route (polyline, ETA, distance), its findings in encounter
 * order, the visible pins and the incident count. Before any route exists
 * the pins are the viewport incidents.
 */
export function selectRouteView(
  routes: RouteOption[],
  selectedRouteId: string | undefined,
  viewportIncidents: RoadIncident[],
): RouteView {
  if (!routes.length)
    return {
      matches: [],
      pins: viewportIncidents.map((incident) => ({ incident })),
      incidentCount: viewportIncidents.length,
    };
  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) ?? routes[0]!;
  const matches = selectedRoute.matches;
  return {
    selectedRoute,
    matches,
    pins: matches.map((match) => ({ incident: match.incident, match })),
    incidentCount: matches.length,
  };
}
