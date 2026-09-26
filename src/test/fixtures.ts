import type {
  AppBounds,
  AppCoordinate,
  RoadIncident,
  RouteOption,
} from '../domain/types';

/** Fixed clock for deterministic freshness and relative-time labels. */
export const FIXTURE_NOW = Date.parse('2026-09-26T03:00:00.000Z');

/** Mock user location used by the Nearby feed in mock mode. */
export const MOCK_USER_LOCATION: AppCoordinate = {
  latitude: 13.675,
  longitude: 100.445,
};

/** Geographic extent drawn by the mock map. */
export const MOCK_MAP_BOUNDS: AppBounds = {
  north: 13.745,
  south: 13.65,
  east: 100.505,
  west: 100.41,
};

const point = (latitude: number, longitude: number): AppCoordinate => ({
  latitude,
  longitude,
});

/**
 * Normalized incidents as returned by /api/v1/incidents. Positions are chosen
 * relative to the two mock routes below:
 * - flood-01, accident-02, road-03, flood-07 lie near the primary route
 * - construction-04, breakdown-05, obstruction-06 lie near the alternative
 * - flood-07 is a likely duplicate of flood-01 (other provider, 30 m away)
 * - road-08 sits on a parallel road ~260 m from the primary route
 * - accident-09 is on the primary route but already expired
 * - fire-10 is more than 10 km from the mock user location
 */
export const incidents: RoadIncident[] = [
  {
    id: 'longdo:flood-01',
    externalId: 'flood-01',
    provider: 'longdo',
    category: 'flood',
    title: 'มีรายงานน้ำท่วมขัง ถนนบางขุนเทียน',
    description: 'มีรายงานน้ำรอการระบายบริเวณช่องทางซ้าย โปรดเผื่อเวลาเดินทาง',
    latitude: 13.667,
    longitude: 100.43,
    status: 'active',
    freshness: 'active',
    reportedAt: '2026-09-26T02:48:00.000Z',
    updatedAt: '2026-09-26T02:48:00.000Z',
  },
  {
    id: 'longdo:accident-02',
    externalId: 'accident-02',
    provider: 'longdo',
    category: 'accident',
    title: 'มีรายงานอุบัติเหตุใกล้แยกพระราม 2',
    description: 'มีรายงานรถยนต์ชนกัน การจราจรอาจชะลอตัว',
    latitude: 13.6814,
    longitude: 100.449,
    status: 'active',
    freshness: 'active',
    reportedAt: '2026-09-26T02:41:00.000Z',
    updatedAt: '2026-09-26T02:41:00.000Z',
  },
  {
    id: 'traffy:road-03',
    externalId: 'road-03',
    provider: 'traffy',
    category: 'road_damage',
    title: 'มีรายงานผิวถนนชำรุด ถนนกัลปพฤกษ์',
    description: 'ประชาชนรายงานหลุมบนผิวจราจร ยังไม่ทราบสถานะการแก้ไข',
    latitude: 13.7015,
    longitude: 100.4665,
    status: 'unknown',
    freshness: 'unknown',
    reportedAt: '2026-09-25T07:10:00.000Z',
  },
  {
    id: 'traffy:construction-04',
    externalId: 'construction-04',
    provider: 'traffy',
    category: 'construction',
    title: 'มีรายงานงานก่อสร้างริมถนนเพชรเกษม',
    description: 'มีแนวกั้นพื้นที่ก่อสร้างใกล้ช่องทางซ้าย',
    latitude: 13.7013,
    longitude: 100.435,
    status: 'active',
    freshness: 'stale',
    reportedAt: '2026-09-24T03:00:00.000Z',
    updatedAt: '2026-09-24T03:00:00.000Z',
  },
  {
    id: 'longdo:breakdown-05',
    externalId: 'breakdown-05',
    provider: 'longdo',
    category: 'vehicle_breakdown',
    title: 'มีรายงานรถเสียบนทางคู่ขนาน',
    latitude: 13.7215,
    longitude: 100.457,
    status: 'active',
    freshness: 'active',
    reportedAt: '2026-09-26T02:36:00.000Z',
    updatedAt: '2026-09-26T02:36:00.000Z',
  },
  {
    id: 'traffy:obstruction-06',
    externalId: 'obstruction-06',
    provider: 'traffy',
    category: 'obstruction',
    title: 'มีรายงานสิ่งกีดขวางบนผิวจราจร',
    latitude: 13.7313,
    longitude: 100.4825,
    status: 'active',
    freshness: 'active',
    reportedAt: '2026-09-26T02:32:00.000Z',
    updatedAt: '2026-09-26T02:32:00.000Z',
  },
  {
    id: 'traffy:flood-07',
    externalId: 'flood-07',
    provider: 'traffy',
    category: 'flood',
    title: 'มีรายงานน้ำท่วมขังถนนบางขุนเทียน ช่องทางซ้าย',
    latitude: 13.6672,
    longitude: 100.4302,
    status: 'active',
    freshness: 'active',
    reportedAt: '2026-09-26T02:20:00.000Z',
    updatedAt: '2026-09-26T02:20:00.000Z',
  },
  {
    id: 'traffy:road-08',
    externalId: 'road-08',
    provider: 'traffy',
    category: 'road_damage',
    title: 'มีรายงานหลุมบนถนนเลียบคลอง',
    latitude: 13.6829,
    longitude: 100.4475,
    status: 'active',
    freshness: 'active',
    reportedAt: '2026-09-26T01:00:00.000Z',
    updatedAt: '2026-09-26T01:00:00.000Z',
  },
  {
    id: 'longdo:accident-09',
    externalId: 'accident-09',
    provider: 'longdo',
    category: 'accident',
    title: 'มีรายงานอุบัติเหตุที่เคลียร์แล้ว',
    latitude: 13.7235,
    longitude: 100.485,
    status: 'expired',
    freshness: 'stale',
    reportedAt: '2026-09-25T20:00:00.000Z',
    expiresAt: '2026-09-25T22:00:00.000Z',
  },
  {
    id: 'longdo:fire-10',
    externalId: 'fire-10',
    provider: 'longdo',
    category: 'fire',
    title: 'มีรายงานเพลิงไหม้นอกพื้นที่ใกล้ฉัน',
    latitude: 13.8,
    longitude: 100.6,
    status: 'active',
    freshness: 'active',
    reportedAt: '2026-09-26T02:50:00.000Z',
    updatedAt: '2026-09-26T02:50:00.000Z',
  },
];

export const mockRoutes: RouteOption[] = [
  {
    id: 'route-primary',
    label: 'เส้นทางหลัก',
    durationMinutes: 42,
    distanceKm: 11.7,
    path: [
      point(13.66, 100.42),
      point(13.672, 100.44),
      point(13.69, 100.458),
      point(13.712, 100.475),
      point(13.735, 100.495),
    ],
    matches: [],
  },
  {
    id: 'route-alternative',
    label: 'เส้นทางเลี่ยง',
    durationMinutes: 49,
    distanceKm: 12.7,
    extraMinutes: 7,
    path: [
      point(13.66, 100.42),
      point(13.69, 100.426),
      point(13.712, 100.444),
      point(13.728, 100.47),
      point(13.735, 100.495),
    ],
    matches: [],
  },
];
