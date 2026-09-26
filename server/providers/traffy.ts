import type {
  IncidentCategory,
  IncidentStatus,
  RoadIncident,
} from '../../src/domain/types';
import {
  finiteCoordinate,
  parseProviderDate,
  safeText,
} from '../normalization/shared.js';

const CATEGORY_RULES: Array<[RegExp, IncidentCategory]> = [
  [/น้ำท่วม|อุทกภัย/, 'flood'],
  [/ก่อสร้าง/, 'construction'],
  [/ถนน|หลุม|ฝาท่อ|ผิวจราจร|วัสดุชำรุด/, 'road_damage'],
  [/กีดขวาง|ต้นไม้|สายสื่อสาร/, 'obstruction'],
  [/อุบัติเหตุ/, 'accident'],
  [/จุดเสี่ยง|ภัยทางถนน|คมนาคม/, 'caution'],
];

export function mapTraffyCategory(
  values: unknown,
): IncidentCategory | undefined {
  const categories = Array.isArray(values)
    ? values.map((value) => safeText(value)).join(' ')
    : safeText(values);
  return CATEGORY_RULES.find(([pattern]) => pattern.test(categories))?.[1];
}

export function mapTraffyStatus(value: unknown): IncidentStatus {
  const state = safeText(value).toLowerCase();
  if (['finish', 'irrelevant'].includes(state)) return 'resolved';
  if (['start', 'inprogress', 'follow', 'forward'].includes(state))
    return 'active';
  return 'unknown';
}

export function normalizeTraffyFeature(
  value: unknown,
): RoadIncident | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const feature = value as Record<string, unknown>;
  const geometry = feature.geometry as Record<string, unknown> | undefined;
  const properties = feature.properties as Record<string, unknown> | undefined;
  if (
    !geometry ||
    !properties ||
    geometry.type !== 'Point' ||
    !Array.isArray(geometry.coordinates)
  )
    return undefined;
  const longitude = finiteCoordinate(geometry.coordinates[0], -180, 180);
  const latitude = finiteCoordinate(geometry.coordinates[1], -90, 90);
  const externalId = safeText(properties.ticket_id ?? properties.message_id);
  const category = mapTraffyCategory(
    properties.problem_type_fondue ?? properties.type,
  );
  const status = mapTraffyStatus(properties.state_type_latest);
  if (
    latitude === undefined ||
    longitude === undefined ||
    !externalId ||
    !category ||
    status === 'resolved'
  )
    return undefined;
  const description = safeText(properties.description);
  const address = safeText(properties.address);
  return {
    id: `traffy:${externalId}`,
    provider: 'traffy',
    externalId,
    category,
    title:
      description ||
      `มีรายงาน${safeText(properties.type, 'เหตุการณ์')} ${address}`.trim(),
    description: address || undefined,
    latitude,
    longitude,
    status,
    freshness: status === 'unknown' ? 'unknown' : 'active',
    reportedAt: parseProviderDate(properties.timestamp),
    updatedAt: parseProviderDate(properties.last_activity),
  };
}

export function normalizeTraffyPayload(payload: unknown): RoadIncident[] {
  if (!payload || typeof payload !== 'object')
    throw new Error('Unexpected Traffy payload');
  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features)) throw new Error('Unexpected Traffy features');
  return features
    .map(normalizeTraffyFeature)
    .filter((item): item is RoadIncident => Boolean(item));
}
