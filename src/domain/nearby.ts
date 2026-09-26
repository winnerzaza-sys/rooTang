import { boundsAround, haversineDistanceKm, isValidCoordinate } from './geo';
import { nearbyConfig } from './matching/config';
import { duplicateCandidateIndex } from './matching/deduplication';
import { isConfidentlyInactive } from './matching/matchRoute';
import { categoryOrder } from './incidentPresentation';
import type {
  AppBounds,
  AppCoordinate,
  IncidentCategory,
  NearbyIncident,
  RoadIncident,
} from './types';

export type NearbyFilter = IncidentCategory | 'all';

export function nearbyQuery(origin: AppCoordinate): AppBounds {
  return boundsAround(
    origin,
    nearbyConfig.RADIUS_KM + nearbyConfig.QUERY_PADDING_KM,
  );
}

/** Active incidents within the radius, sorted nearest first. */
export function buildNearbyFeed(
  incidents: RoadIncident[],
  origin: AppCoordinate,
  now: number,
  radiusKm: number = nearbyConfig.RADIUS_KM,
): NearbyIncident[] {
  const candidates = incidents
    .filter(isValidCoordinate)
    .filter((incident) => !isConfidentlyInactive(incident, now))
    .map((incident) => ({
      incident,
      distanceKm: haversineDistanceKm(origin, incident),
    }))
    .filter((item) => item.distanceKm <= radiusKm);
  const duplicates = duplicateCandidateIndex(
    candidates.map((item) => item.incident),
  );
  return candidates
    .map((item) => ({
      ...item,
      duplicateCandidateIds: duplicates.get(item.incident.id) ?? [],
    }))
    .sort(
      (a, b) =>
        a.distanceKm - b.distanceKm ||
        a.incident.id.localeCompare(b.incident.id),
    );
}

/** Categories actually present in the feed, in the app's display order. */
export function availableCategories(
  items: NearbyIncident[],
): IncidentCategory[] {
  const present = new Set(items.map((item) => item.incident.category));
  return categoryOrder.filter((category) => present.has(category));
}

export function filterNearbyFeed(
  items: NearbyIncident[],
  filter: NearbyFilter,
): NearbyIncident[] {
  return filter === 'all'
    ? items
    : items.filter((item) => item.incident.category === filter);
}

/** A filter chip that no longer exists falls back to "all". */
export function effectiveFilter(
  filter: NearbyFilter,
  categories: IncidentCategory[],
): NearbyFilter {
  return filter === 'all' || categories.includes(filter) ? filter : 'all';
}
