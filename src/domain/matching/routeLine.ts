import type { Feature, LineString } from 'geojson';
import { haversineDistanceMeters, isValidCoordinate } from '../geo';
import type { AppCoordinate } from '../types';

export interface RouteLine {
  feature: Feature<LineString>;
  lengthMeters: number;
}

/**
 * Converts a route path into a GeoJSON LineString. Invalid coordinates and
 * consecutive duplicate points are dropped; fewer than two distinct points
 * cannot form a line and return undefined.
 */
export function toRouteLine(path: AppCoordinate[]): RouteLine | undefined {
  const points: AppCoordinate[] = [];
  for (const point of path) {
    if (!isValidCoordinate(point)) continue;
    const previous = points.at(-1);
    if (
      previous &&
      previous.latitude === point.latitude &&
      previous.longitude === point.longitude
    )
      continue;
    points.push(point);
  }
  if (points.length < 2) return undefined;
  let lengthMeters = 0;
  for (let index = 1; index < points.length; index += 1)
    lengthMeters += haversineDistanceMeters(points[index - 1]!, points[index]!);
  return {
    feature: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: points.map((point) => [point.longitude, point.latitude]),
      },
    },
    lengthMeters,
  };
}
