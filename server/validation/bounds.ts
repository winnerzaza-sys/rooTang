import type { AppBounds, IncidentCategory } from '../../src/domain/types';

export const incidentCategories: IncidentCategory[] = [
  'flood',
  'accident',
  'vehicle_breakdown',
  'road_damage',
  'construction',
  'obstruction',
  'traffic_incident',
  'rain',
  'fire',
  'caution',
  'other',
];

export class RequestValidationError extends Error {
  constructor(public readonly details: string[]) {
    super('Invalid request');
    this.name = 'RequestValidationError';
  }
}

function number(value: unknown, name: string, errors: string[]): number {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${name} is required`);
    return NaN;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) errors.push(`${name} must be a finite number`);
  return parsed;
}

const DEFAULT_MAX_SPAN_DEGREES = 5;

/** INCIDENT_MAX_BBOX_DEGREES; a missing or invalid value never disables the limit. */
export function maxBboxDegrees(
  value = process.env.INCIDENT_MAX_BBOX_DEGREES,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 30
    ? parsed
    : DEFAULT_MAX_SPAN_DEGREES;
}

export function parseIncidentQuery(
  query: Record<string, string | string[] | undefined>,
  maxSpanDegrees = maxBboxDegrees(),
): AppBounds & { categories?: IncidentCategory[] } {
  const errors: string[] = [];
  const north = number(query.north, 'north', errors);
  const south = number(query.south, 'south', errors);
  const east = number(query.east, 'east', errors);
  const west = number(query.west, 'west', errors);
  if (Number.isFinite(north) && (north < -90 || north > 90))
    errors.push('north is outside latitude bounds');
  if (Number.isFinite(south) && (south < -90 || south > 90))
    errors.push('south is outside latitude bounds');
  if (Number.isFinite(east) && (east < -180 || east > 180))
    errors.push('east is outside longitude bounds');
  if (Number.isFinite(west) && (west < -180 || west > 180))
    errors.push('west is outside longitude bounds');
  if (Number.isFinite(north) && Number.isFinite(south) && north <= south)
    errors.push('north must be greater than south');
  const longitudeSpan = east >= west ? east - west : 360 - west + east;
  if (
    Number.isFinite(north) &&
    Number.isFinite(south) &&
    north - south > maxSpanDegrees
  )
    errors.push('latitude span is too large');
  if (Number.isFinite(longitudeSpan) && longitudeSpan > maxSpanDegrees)
    errors.push('longitude span is too large');

  const rawCategories = Array.isArray(query.categories)
    ? query.categories.join(',')
    : query.categories;
  const categories =
    rawCategories
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? [];
  const invalid = categories.filter(
    (value) => !incidentCategories.includes(value as IncidentCategory),
  );
  if (invalid.length)
    errors.push(`unsupported categories: ${invalid.join(', ')}`);
  if (errors.length) throw new RequestValidationError(errors);
  return {
    north,
    south,
    east,
    west,
    ...(categories.length
      ? { categories: categories as IncidentCategory[] }
      : {}),
  };
}

export function coordinateInBounds(
  latitude: number,
  longitude: number,
  bounds: AppBounds,
): boolean {
  const withinLongitude =
    bounds.east >= bounds.west
      ? longitude >= bounds.west && longitude <= bounds.east
      : longitude >= bounds.west || longitude <= bounds.east;
  return (
    latitude >= bounds.south && latitude <= bounds.north && withinLongitude
  );
}
