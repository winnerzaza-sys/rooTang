import { describe, expect, it } from 'vitest';
import type { IncidentCategory, RoadIncident } from '../types';
import { AREA_EVENT_CATEGORIES, ROUTE_CORRIDOR_METERS } from './config';
import {
  corridorFor,
  isConfidentlyInactive,
  matchIncidentsToRoute,
} from './matchRoute';
import { toRouteLine } from './routeLine';

const NOW = Date.parse('2026-09-26T03:00:00.000Z');
/** Metres per degree of latitude on Turf's mean-radius sphere. */
const M_PER_DEG = 111_195.08;

// A straight west→east route at Bangkok's latitude, ≈ 10.8 km long.
const START = { latitude: 13.7, longitude: 100.5 };
const END = { latitude: 13.7, longitude: 100.6 };
const PATH = [START, { latitude: 13.7, longitude: 100.55 }, END];

let sequence = 0;
function incident(
  category: IncidentCategory,
  offsetNorthMeters: number,
  longitude = 100.55,
  extra: Partial<RoadIncident> = {},
): RoadIncident {
  sequence += 1;
  return {
    id: `longdo:test-${sequence}`,
    provider: 'longdo',
    externalId: `test-${sequence}`,
    category,
    title: `มีรายงาน ${category}`,
    latitude: 13.7 + offsetNorthMeters / M_PER_DEG,
    longitude,
    status: 'active',
    freshness: 'active',
    updatedAt: '2026-09-26T02:50:00.000Z',
    ...extra,
  };
}

const match = (items: RoadIncident[]) =>
  matchIncidentsToRoute('route-a', PATH, items, NOW);

describe('route line conversion', () => {
  it('builds a GeoJSON LineString in [lng, lat] order', () => {
    const line = toRouteLine(PATH)!;
    expect(line.feature.geometry.type).toBe('LineString');
    expect(line.feature.geometry.coordinates[0]).toEqual([100.5, 13.7]);
    expect(line.lengthMeters).toBeCloseTo(10_805, -2);
  });

  it('drops invalid and repeated points and rejects degenerate paths', () => {
    const line = toRouteLine([
      START,
      START,
      { latitude: Number.NaN, longitude: 100.52 },
      { latitude: 95, longitude: 100.52 },
      END,
    ])!;
    expect(line.feature.geometry.coordinates).toHaveLength(2);
    expect(toRouteLine([START])).toBeUndefined();
    expect(toRouteLine([START, START])).toBeUndefined();
    expect(match([incident('accident', 10)])).toHaveLength(1);
    expect(
      matchIncidentsToRoute('r', [START], [incident('accident', 10)], NOW),
    ).toEqual([]);
  });
});

describe('category-specific corridors', () => {
  it('keeps the agreed corridor per category in one config', () => {
    expect(ROUTE_CORRIDOR_METERS.road_damage).toBe(150);
    for (const category of [
      'accident',
      'vehicle_breakdown',
      'obstruction',
    ] as const)
      expect(ROUTE_CORRIDOR_METERS[category]).toBe(300);
    for (const category of ['flood', 'rain', 'fire'] as const)
      expect(ROUTE_CORRIDOR_METERS[category]).toBe(500);
    expect(ROUTE_CORRIDOR_METERS.other).toBe(300);
    expect(corridorFor('construction')).toBe(ROUTE_CORRIDOR_METERS.other);
  });

  it.each([
    ['road_damage', 140, 160],
    ['accident', 290, 310],
    ['vehicle_breakdown', 290, 310],
    ['obstruction', 290, 310],
    ['flood', 490, 510],
    ['rain', 490, 510],
    ['fire', 490, 510],
    ['construction', 290, 310],
    ['other', 290, 310],
  ] as const)(
    '%s matches at %i m and is excluded at %i m',
    (category, inside, outside) => {
      const near = incident(category, inside);
      const far = incident(category, -outside);
      const result = match([near, far]);
      expect(result.map((item) => item.incident.id)).toEqual([near.id]);
      expect(result[0]!.distanceFromRouteMeters).toBeCloseTo(inside, -1);
      expect(result[0]!.corridorMeters).toBe(ROUTE_CORRIDOR_METERS[category]);
    },
  );

  it('excludes unrelated incidents far from the route', () => {
    expect(match([incident('flood', 5_000)])).toEqual([]);
    expect(match([incident('accident', 0, 100.9)])).toEqual([]);
  });
});

describe('route progression and encounter order', () => {
  it('measures distance from the route start and sorts by it', () => {
    const third = incident('accident', 20, 100.58);
    const first = incident('flood', -100, 100.52);
    const second = incident('road_damage', 50, 100.55);
    const result = match([third, first, second]);
    expect(result.map((item) => item.incident.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ]);
    const kmPerLngDegree = 10.805 / 0.1;
    expect(result[0]!.distanceFromStartMeters / 1000).toBeCloseTo(
      0.02 * kmPerLngDegree,
      1,
    );
    expect(result[2]!.distanceFromStartMeters / 1000).toBeCloseTo(
      0.08 * kmPerLngDegree,
      1,
    );
    expect(result[0]!.distanceAheadMeters).toBe(
      result[0]!.distanceFromStartMeters,
    );
    expect(result.every((item) => item.routeId === 'route-a')).toBe(true);
  });

  it('breaks ties deterministically by lateral distance then id', () => {
    const a = incident('accident', 80, 100.55);
    const b = incident('accident', 20, 100.55);
    expect(match([a, b]).map((item) => item.incident.id)).toEqual([b.id, a.id]);
  });

  it('marks reports that snap to the route start or end', () => {
    const beforeStart = incident('flood', 0, 100.498);
    const afterEnd = incident('flood', 0, 100.602);
    const middle = incident('flood', 0, 100.55);
    const reasons = Object.fromEntries(
      match([beforeStart, afterEnd, middle]).map((item) => [
        item.incident.id,
        item.matchReason,
      ]),
    );
    expect(reasons).toEqual({
      [beforeStart.id]: 'near_route_start',
      [afterEnd.id]: 'near_route_end',
      [middle.id]: 'within_corridor',
    });
  });
});

describe('parallel-road false positives', () => {
  it('excludes a road-damage report on a parallel road outside 150 m', () => {
    expect(match([incident('road_damage', 250)])).toEqual([]);
  });

  it('keeps a point report on a possible parallel road but flags it', () => {
    const [result] = match([incident('accident', 250)]);
    expect(result?.possibleParallelRoad).toBe(true);
  });

  it('does not flag reports close to the route line', () => {
    const [result] = match([incident('accident', 20)]);
    expect(result?.possibleParallelRoad).toBe(false);
  });

  it('flags text that mentions a frontage road even when close', () => {
    const [result] = match([
      incident('vehicle_breakdown', 40, 100.55, {
        title: 'มีรายงานรถเสียบนทางคู่ขนาน',
      }),
    ]);
    expect(result?.possibleParallelRoad).toBe(true);
  });

  it('does not flag area events such as flood', () => {
    for (const category of AREA_EVENT_CATEGORIES) {
      const [result] = match([incident(category, 400)]);
      expect(result?.possibleParallelRoad).toBe(false);
    }
  });

  it('ignores a report on a parallel road beyond the corridor', () => {
    // Parallel expressway about 400 m north of the route.
    const onParallel = [100.52, 100.55, 100.58].map((lng) =>
      incident('accident', 400, lng),
    );
    expect(match(onParallel)).toEqual([]);
  });
});

describe('resolved and expired filtering', () => {
  it('drops confidently resolved or expired reports', () => {
    const resolved = incident('flood', 10, 100.55, { status: 'resolved' });
    const expired = incident('flood', 10, 100.55, { status: 'expired' });
    const pastStop = incident('accident', 10, 100.55, {
      expiresAt: '2026-09-26T02:00:00.000Z',
    });
    const futureStop = incident('accident', 10, 100.56, {
      expiresAt: '2026-09-26T05:00:00.000Z',
    });
    const unknown = incident('road_damage', 10, 100.57, {
      status: 'unknown',
      freshness: 'unknown',
    });
    const invalidStop = incident('accident', 10, 100.58, {
      expiresAt: 'not a date',
    });
    expect(
      match([
        resolved,
        expired,
        pastStop,
        futureStop,
        unknown,
        invalidStop,
      ]).map((item) => item.incident.id),
    ).toEqual([futureStop.id, unknown.id, invalidStop.id]);
    expect(isConfidentlyInactive(pastStop, NOW)).toBe(true);
    expect(isConfidentlyInactive(unknown, NOW)).toBe(false);
  });

  it('skips incidents with invalid coordinates', () => {
    expect(
      match([
        incident('flood', 0, Number.NaN),
        { ...incident('flood', 0), latitude: 200 },
      ]),
    ).toEqual([]);
  });
});
