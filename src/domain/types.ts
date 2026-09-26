export type IncidentProvider = 'longdo' | 'traffy';
export type IncidentStatus = 'active' | 'resolved' | 'expired' | 'unknown';
export type IncidentFreshness = 'active' | 'stale' | 'unknown';

export type IncidentCategory =
  | 'flood'
  | 'accident'
  | 'vehicle_breakdown'
  | 'road_damage'
  | 'construction'
  | 'obstruction'
  | 'traffic_incident'
  | 'rain'
  | 'fire'
  | 'caution'
  | 'other';

export interface RoadIncident {
  id: string;
  provider: IncidentProvider;
  externalId: string;
  category: IncidentCategory;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  status: IncidentStatus;
  freshness: IncidentFreshness;
  severity?: number;
  reportedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  sourceUrl?: string;
}

export interface RouteIncidentMatch {
  incident: RoadIncident;
  routeId: string;
  distanceFromRouteMeters: number;
  distanceFromStartMeters: number;
  distanceAheadMeters?: number;
  matchReason: 'within_corridor' | 'near_route_start' | 'near_route_end';
  /** Corridor applied for this category, kept for debugging and tests. */
  corridorMeters: number;
  /** Proximity may come from a parallel or nearby road, not this route. */
  possibleParallelRoad: boolean;
  /** Other reports that may describe the same event; never merged. */
  duplicateCandidateIds: string[];
}

export interface NearbyIncident {
  incident: RoadIncident;
  distanceKm: number;
  duplicateCandidateIds: string[];
}

export type NearbyOrigin =
  | { kind: 'user'; coordinate: AppCoordinate }
  | { kind: 'area'; coordinate: AppCoordinate };

export type ProviderAvailability = 'ok' | 'unavailable' | 'stale';

export interface ProviderStatus {
  provider: IncidentProvider;
  status: ProviderAvailability;
  fetchedAt?: string;
}

export interface IncidentResponseMeta {
  generatedAt: string;
  partial: boolean;
  providers: ProviderStatus[];
  cachedAt?: string;
}

export interface AppCoordinate {
  latitude: number;
  longitude: number;
}

export interface AppBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface AppPlace {
  placeId: string;
  label: string;
  coordinate: AppCoordinate;
}

export interface RouteOption {
  id: string;
  label: string;
  durationMinutes: number;
  distanceKm: number;
  extraMinutes?: number;
  path: AppCoordinate[];
  bounds?: AppBounds;
  matches: RouteIncidentMatch[];
}

export interface RouteSearchRequest {
  origin: AppPlace | AppCoordinate;
  destination: AppPlace | AppCoordinate;
}

export interface RouteSearchResult {
  routes: RouteOption[];
  meta: IncidentResponseMeta;
}

export interface IncidentQuery extends AppBounds {
  categories?: IncidentCategory[];
}

export type DemoState =
  | 'normal'
  | 'loading'
  | 'no-incidents'
  | 'nearby-empty'
  | 'location-denied'
  | 'partial'
  | 'all-unavailable'
  | 'offline'
  | 'map-error'
  | 'route-not-found'
  | 'stale';
