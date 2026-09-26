import { describe, expect, it } from 'vitest';
import {
  convertGoogleRoutes,
  formatRouteDistance,
  formatRouteDuration,
} from './routeConversion';

describe('Google route conversion', () => {
  it('converts only app-owned fields and stable local identifiers', () => {
    const routes = convertGoogleRoutes([
      {
        description: 'ผ่าน กาญจนาภิเษก',
        path: [{ lat: 13.7, lng: 100.5 }],
        durationMillis: 2_520_000,
        distanceMeters: 28_140,
        viewport: { north: 13.8, south: 13.6, east: 100.7, west: 100.4 },
      },
      {
        path: [{ lat: 13.71, lng: 100.51 }],
        durationMillis: 2_940_000,
        distanceMeters: 31_600,
      },
    ]);
    expect(routes[0]).toMatchObject({
      id: 'google-route-1',
      label: 'กาญจนาภิเษก',
      durationMinutes: 42,
      distanceKm: 28.1,
      matches: [],
    });
    expect(routes[1]).toMatchObject({ id: 'google-route-2', extraMinutes: 7 });
    expect(routes[0]?.path[0]).toEqual({ latitude: 13.7, longitude: 100.5 });
  });
  it('falls back to generic labels when Google has no road description', () => {
    const routes = convertGoogleRoutes([
      { durationMillis: 60_000 },
      { durationMillis: 120_000 },
    ]);
    expect(routes.map(({ label }) => label)).toEqual([
      'เส้นทางหลัก',
      'เส้นทางเลือก 1',
    ]);
  });
  it('formats duration and distance', () => {
    expect(formatRouteDuration(75)).toBe('1 ชม. 15 นาที');
    expect(formatRouteDistance(28.1)).toContain('28.1');
  });
});
