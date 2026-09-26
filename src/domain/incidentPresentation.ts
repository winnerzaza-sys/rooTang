import { freshnessConfig } from './matching/config';
import type {
  IncidentCategory,
  IncidentFreshness,
  IncidentProvider,
  RoadIncident,
  RouteIncidentMatch,
} from './types';

export const categoryPresentation: Record<
  IncidentCategory,
  { label: string; icon: string; className: string }
> = {
  flood: { label: 'น้ำท่วม', icon: '≋', className: 'flood' },
  accident: { label: 'อุบัติเหตุ', icon: '⚠', className: 'accident' },
  vehicle_breakdown: { label: 'รถเสีย', icon: '●', className: 'breakdown' },
  road_damage: { label: 'ถนนชำรุด', icon: '◇', className: 'road' },
  construction: { label: 'งานก่อสร้าง', icon: '△', className: 'construction' },
  obstruction: { label: 'สิ่งกีดขวาง', icon: '!', className: 'obstruction' },
  traffic_incident: { label: 'เหตุจราจร', icon: '!', className: 'traffic' },
  rain: { label: 'ฝน', icon: '☂', className: 'rain' },
  fire: { label: 'เพลิงไหม้', icon: '♨', className: 'fire' },
  caution: { label: 'เหตุควรระวัง', icon: '!', className: 'caution' },
  other: { label: 'เหตุการณ์อื่น', icon: '•', className: 'other' },
};

/** Display order for filter chips; only categories present are shown. */
export const categoryOrder: IncidentCategory[] = [
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

export const providerLabel: Record<IncidentProvider, string> = {
  longdo: 'Longdo/iTIC',
  traffy: 'Traffy Fondue',
};

export function freshnessLabel(freshness: IncidentFreshness): string {
  if (freshness === 'stale') return 'ข้อมูลเก่า';
  if (freshness === 'unknown') return 'ไม่ทราบเวลาอัปเดต';
  return 'อัปเดตล่าสุด';
}

function incidentTimestamp(incident: RoadIncident): number | undefined {
  const value = Date.parse(incident.updatedAt ?? incident.reportedAt ?? '');
  return Number.isFinite(value) ? value : undefined;
}

/** Server freshness, downgraded to stale when an active report is old. */
export function effectiveFreshness(
  incident: RoadIncident,
  now: number,
): IncidentFreshness {
  const timestamp = incidentTimestamp(incident);
  if (timestamp === undefined) return 'unknown';
  if (incident.freshness !== 'active') return incident.freshness;
  return now - timestamp > freshnessConfig.STALE_AFTER_MS ? 'stale' : 'active';
}

/**
 * Badge shown next to the time label. Missing timestamps are already covered
 * by "ไม่ทราบเวลาอัปเดต" in the time label, so no badge is repeated.
 */
export function freshnessBadge(
  incident: RoadIncident,
  now: number,
): string | undefined {
  if (incidentTimestamp(incident) === undefined) return undefined;
  const freshness = effectiveFreshness(incident, now);
  if (freshness === 'stale') return 'ข้อมูลเก่า';
  if (freshness === 'unknown' || incident.status === 'unknown')
    return 'ไม่ทราบสถานะล่าสุด';
  return undefined;
}

export function formatRelativeTime(timestamp: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'ไม่ถึง 1 นาทีที่แล้ว';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม. ที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

/** "อัปเดต 12 นาทีที่แล้ว", "รายงาน 3 ชม. ที่แล้ว" or the unknown label. */
export function incidentTimeLabel(incident: RoadIncident, now: number): string {
  const timestamp = incidentTimestamp(incident);
  if (timestamp === undefined) return 'ไม่ทราบเวลาอัปเดต';
  const prefix = incident.updatedAt ? 'อัปเดต' : 'รายงาน';
  return `${prefix} ${formatRelativeTime(timestamp, now)}`;
}

export function incidentAbsoluteTime(
  incident: RoadIncident,
): string | undefined {
  const timestamp = incidentTimestamp(incident);
  if (timestamp === undefined) return undefined;
  return new Date(timestamp).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  });
}

/** Bangkok clock time for a data timestamp, e.g. "10:05". */
export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  });
}

export function formatMeters(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} ม.`;
  return formatKilometers(meters / 1000);
}

export function formatKilometers(km: number): string {
  return `${km.toLocaleString('th-TH', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} กม.`;
}

function spokenMeters(meters: number): string {
  return formatMeters(meters)
    .replace(' ม.', ' เมตร')
    .replace(' กม.', ' กิโลเมตร');
}

/** Short relation shown in findings, e.g. "ข้างหน้า 3.2 กม.". */
export function routeProgressLabel(match: RouteIncidentMatch): string {
  if (match.matchReason === 'near_route_start') return 'ใกล้จุดเริ่มต้น';
  if (match.matchReason === 'near_route_end') return 'ใกล้ปลายทาง';
  return `ข้างหน้า ${formatMeters(match.distanceFromStartMeters)}`;
}

/** "ใกล้เส้นทางประมาณ 120 ม." — proximity only, never "on this road". */
export function routeProximityLabel(match: RouteIncidentMatch): string {
  return `ใกล้เส้นทางประมาณ ${formatMeters(match.distanceFromRouteMeters)}`;
}

export const PARALLEL_ROAD_COPY = 'อาจอยู่บนถนนคู่ขนานหรือถนนใกล้เคียง';
export const DUPLICATE_COPY = 'อาจเป็นรายงานเดียวกับรายการอื่นที่อยู่ใกล้กัน';

export function routeMatchSpokenLabel(
  match: RouteIncidentMatch,
  now: number,
): string {
  const { incident } = match;
  const parts = [
    `มีรายงาน${categoryPresentation[incident.category].label}`,
    `ใกล้เส้นทางประมาณ ${spokenMeters(match.distanceFromRouteMeters)}`,
    match.matchReason === 'within_corridor'
      ? `ข้างหน้า ${spokenMeters(match.distanceFromStartMeters)}`
      : routeProgressLabel(match),
    match.possibleParallelRoad ? PARALLEL_ROAD_COPY : undefined,
    providerLabel[incident.provider],
    incidentTimeLabel(incident, now),
  ];
  return parts.filter(Boolean).join(', ');
}

export function pinSpokenLabel(
  incident: RoadIncident,
  match: RouteIncidentMatch | undefined,
  now: number,
): string {
  if (match) return routeMatchSpokenLabel(match, now);
  return `มีรายงาน${categoryPresentation[incident.category].label}: ${incident.title}, ${providerLabel[incident.provider]}`;
}

export function nearbySpokenLabel(
  incident: RoadIncident,
  distanceKm: number,
  now: number,
): string {
  return [
    `${categoryPresentation[incident.category].label}: ${incident.title}`,
    `ห่างประมาณ ${formatKilometers(distanceKm).replace(' กม.', ' กิโลเมตร')}`,
    providerLabel[incident.provider],
    incidentTimeLabel(incident, now),
  ].join(', ');
}
