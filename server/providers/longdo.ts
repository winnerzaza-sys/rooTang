import type { IncidentCategory, RoadIncident } from '../../src/domain/types';
import {
  finiteCoordinate,
  parseProviderDate,
  safeText,
} from '../normalization/shared.js';

const LONGDO_TYPES: Record<number, IncidentCategory> = {
  1: 'vehicle_breakdown',
  2: 'construction',
  3: 'accident',
  5: 'rain',
  6: 'flood',
  10: 'traffic_incident',
  12: 'caution',
  15: 'fire',
};

export function mapLongdoType(value: unknown): IncidentCategory {
  return LONGDO_TYPES[Number(value)] ?? 'other';
}

export function normalizeLongdoRecord(
  value: unknown,
  now = new Date(),
): RoadIncident | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const externalId = safeText(record.eid);
  const latitude = finiteCoordinate(record.latitude, -90, 90);
  const longitude = finiteCoordinate(record.longitude, -180, 180);
  const title = safeText(record.title);
  if (
    !externalId ||
    latitude === undefined ||
    longitude === undefined ||
    !title
  )
    return undefined;
  const reportedAt = parseProviderDate(record.start);
  const expiresAt = parseProviderDate(record.stop);
  const expired =
    expiresAt !== undefined && Date.parse(expiresAt) <= now.getTime();
  return {
    id: `longdo:${externalId}`,
    provider: 'longdo',
    externalId,
    category: mapLongdoType(record.type),
    title,
    description: safeText(record.description) || undefined,
    latitude,
    longitude,
    status: expired ? 'expired' : 'active',
    freshness: expired ? 'stale' : 'active',
    reportedAt,
    updatedAt: reportedAt,
    expiresAt,
    severity: typeof record.severity === 'number' ? record.severity : undefined,
  };
}

export function normalizeLongdoPayload(
  payload: unknown,
  now = new Date(),
): RoadIncident[] {
  if (!Array.isArray(payload)) throw new Error('Unexpected Longdo payload');
  return payload
    .map((item) => normalizeLongdoRecord(item, now))
    .filter((item): item is RoadIncident => Boolean(item));
}
