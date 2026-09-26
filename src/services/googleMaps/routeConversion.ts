import type { AppBounds, AppCoordinate, RouteOption } from '../../domain/types';

export interface GoogleRouteLike {
  path?: Array<{
    lat: number | (() => number);
    lng: number | (() => number);
  }> | null;
  durationMillis?: number | null;
  distanceMeters?: number | null;
  viewport?:
    AppBounds | { toJSON: () => google.maps.LatLngBoundsLiteral } | null;
  routeLabels?: string[] | null;
  description?: string | null;
}

function coordinate(
  point: NonNullable<GoogleRouteLike['path']>[number],
): AppCoordinate {
  return {
    latitude: typeof point.lat === 'function' ? point.lat() : point.lat,
    longitude: typeof point.lng === 'function' ? point.lng() : point.lng,
  };
}

function bounds(value: GoogleRouteLike['viewport']): AppBounds | undefined {
  if (!value) return undefined;
  if ('toJSON' in value && typeof value.toJSON === 'function') {
    const result = value.toJSON();
    return {
      north: result.north,
      south: result.south,
      east: result.east,
      west: result.west,
    };
  }
  return value as AppBounds;
}

export function convertGoogleRoutes(routes: GoogleRouteLike[]): RouteOption[] {
  const fastest = Math.min(
    ...routes.map((route) => route.durationMillis ?? Infinity),
  );
  return routes.map((route, index) => {
    const durationMinutes = Math.max(
      1,
      Math.round((route.durationMillis ?? 0) / 60000),
    );
    const fastestMinutes = Number.isFinite(fastest)
      ? Math.round(fastest / 60000)
      : durationMinutes;
    return {
      id: `google-route-${index + 1}`,
      label: index === 0 ? 'เส้นทางหลัก' : `เส้นทางเลือก ${index}`,
      durationMinutes,
      distanceKm: Math.round(((route.distanceMeters ?? 0) / 1000) * 10) / 10,
      ...(durationMinutes > fastestMinutes
        ? { extraMinutes: durationMinutes - fastestMinutes }
        : {}),
      path: (route.path ?? []).map(coordinate),
      bounds: bounds(route.viewport),
      matches: [],
    };
  });
}

export function formatRouteDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ชม. ${rest} นาที` : `${hours} ชม.`;
}

export function formatRouteDistance(kilometers: number): string {
  return `${kilometers.toLocaleString('th-TH', { maximumFractionDigits: 1 })} กม.`;
}
