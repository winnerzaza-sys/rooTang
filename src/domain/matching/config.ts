import type { IncidentCategory } from '../types';

/**
 * Single source of truth for every distance and threshold used by route
 * matching, deduplication and the Nearby feed. Proximity never proves that
 * an incident is on the same road or direction; these values only decide
 * which reports are worth showing as "ใกล้เส้นทาง".
 */
export const ROUTE_CORRIDOR_METERS: Readonly<Record<IncidentCategory, number>> =
  {
    road_damage: 150,
    accident: 300,
    vehicle_breakdown: 300,
    obstruction: 300,
    flood: 500,
    rain: 500,
    fire: 500,
    construction: 300,
    traffic_incident: 300,
    caution: 300,
    other: 300,
  };

/**
 * Area-type events (water, rain, smoke) spread across neighbouring roads, so
 * a lateral offset does not suggest a different carriageway. Every other
 * category is a point on a specific road and is treated as possibly being on
 * a parallel road when it sits beyond PARALLEL_ROAD_OFFSET_METERS.
 */
export const AREA_EVENT_CATEGORIES: ReadonlySet<IncidentCategory> = new Set([
  'flood',
  'rain',
  'fire',
]);

export const matchingConfig = {
  /** Lateral offset beyond which a point-type report may be on another road. */
  PARALLEL_ROAD_OFFSET_METERS: 60,
  /** Text that suggests a frontage/parallel carriageway. */
  PARALLEL_ROAD_TEXT: /คู่ขนาน|ทางขนาน|frontage/i,
  /** Offset tolerated for a text-flagged parallel-road report. */
  PARALLEL_ROAD_TEXT_OFFSET_METERS: 25,
  /** Snapping to within this distance of an endpoint counts as start/end. */
  ROUTE_ENDPOINT_METERS: 50,
  /** Route incident query padding; covers the widest corridor. */
  ROUTE_QUERY_PADDING_METERS: Math.max(...Object.values(ROUTE_CORRIDOR_METERS)),
} as const;

export const deduplicationConfig = {
  MAX_DISTANCE_METERS: 100,
  MAX_TIME_DIFFERENCE_MS: 3 * 60 * 60 * 1000,
  MIN_TEXT_SIMILARITY: 0.45,
  /** Categories that providers may use for the same real-world event. */
  COMPATIBLE_CATEGORIES: [
    ['accident', 'vehicle_breakdown', 'traffic_incident'],
    ['flood', 'rain'],
    ['obstruction', 'caution', 'traffic_incident'],
  ] as ReadonlyArray<readonly IncidentCategory[]>,
} as const;

export const nearbyConfig = {
  RADIUS_KM: 10,
  /** Extra query margin so incidents near the radius edge are fetched. */
  QUERY_PADDING_KM: 0.5,
} as const;

export const freshnessConfig = {
  /** Active reports older than this are labelled as old data. */
  STALE_AFTER_MS: 24 * 60 * 60 * 1000,
} as const;
