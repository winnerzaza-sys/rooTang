import type { AppBounds, AppCoordinate } from './types';

const EARTH_RADIUS_KM = 6371.0088;
const KM_PER_DEGREE_LATITUDE = (EARTH_RADIUS_KM * Math.PI) / 180;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineDistanceKm(
  origin: AppCoordinate,
  target: AppCoordinate,
): number {
  const dLat = radians(target.latitude - origin.latitude);
  const dLng = radians(target.longitude - origin.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(target.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineDistanceMeters(
  origin: AppCoordinate,
  target: AppCoordinate,
): number {
  return haversineDistanceKm(origin, target) * 1000;
}

export function isValidCoordinate(value: unknown): value is AppCoordinate {
  if (!value || typeof value !== 'object') return false;
  const { latitude, longitude } = value as Partial<AppCoordinate>;
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function clampLatitude(value: number) {
  return Math.max(-90, Math.min(90, value));
}

function clampLongitude(value: number) {
  return Math.max(-180, Math.min(180, value));
}

/** Pads bounds by a distance; longitude padding widens with latitude. */
export function padBounds(bounds: AppBounds, meters: number): AppBounds {
  const dLat = meters / 1000 / KM_PER_DEGREE_LATITUDE;
  const widestLatitude = Math.min(
    89,
    Math.max(Math.abs(bounds.north), Math.abs(bounds.south)),
  );
  const dLng = dLat / Math.cos(radians(widestLatitude));
  return {
    north: clampLatitude(bounds.north + dLat),
    south: clampLatitude(bounds.south - dLat),
    east: clampLongitude(bounds.east + dLng),
    west: clampLongitude(bounds.west - dLng),
  };
}

export function boundsAround(center: AppCoordinate, km: number): AppBounds {
  return padBounds(
    {
      north: center.latitude,
      south: center.latitude,
      east: center.longitude,
      west: center.longitude,
    },
    km * 1000,
  );
}

export function boundsOfPath(path: AppCoordinate[]): AppBounds | undefined {
  const valid = path.filter(isValidCoordinate);
  if (!valid.length) return undefined;
  return {
    north: Math.max(...valid.map((point) => point.latitude)),
    south: Math.min(...valid.map((point) => point.latitude)),
    east: Math.max(...valid.map((point) => point.longitude)),
    west: Math.min(...valid.map((point) => point.longitude)),
  };
}

export function unionBounds(items: AppBounds[]): AppBounds | undefined {
  if (!items.length) return undefined;
  return {
    north: Math.max(...items.map((item) => item.north)),
    south: Math.min(...items.map((item) => item.south)),
    east: Math.max(...items.map((item) => item.east)),
    west: Math.min(...items.map((item) => item.west)),
  };
}

/**
 * Expands bounds outward to a coarse grid (default 0.05° ≈ 5.5 km) so a
 * request never reveals the precise location it was built from. Coverage
 * only grows; callers still filter by exact distance or route corridor.
 */
export function snapBoundsOutward(bounds: AppBounds, step = 0.05): AppBounds {
  // The epsilon keeps values already on the grid (e.g. 13.7) from moving.
  const down = (value: number) =>
    Number((Math.floor(value / step + 1e-9) * step).toFixed(6));
  const up = (value: number) =>
    Number((Math.ceil(value / step - 1e-9) * step).toFixed(6));
  return {
    north: clampLatitude(up(bounds.north)),
    south: clampLatitude(down(bounds.south)),
    east: clampLongitude(up(bounds.east)),
    west: clampLongitude(down(bounds.west)),
  };
}

export function boundsCenter(bounds: AppBounds): AppCoordinate {
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2,
  };
}

export function containsCoordinate(
  bounds: AppBounds,
  point: AppCoordinate,
): boolean {
  return (
    point.latitude >= bounds.south &&
    point.latitude <= bounds.north &&
    point.longitude >= bounds.west &&
    point.longitude <= bounds.east
  );
}
