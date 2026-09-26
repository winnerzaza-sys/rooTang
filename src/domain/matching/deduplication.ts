import { haversineDistanceMeters, isValidCoordinate } from '../geo';
import type { IncidentCategory, RoadIncident } from '../types';
import { deduplicationConfig } from './config';

export interface DuplicateCandidate {
  ids: [string, string];
  distanceMeters: number;
  timeDifferenceMs: number;
  textSimilarity: number;
}

/** 1° latitude ≈ 111 km; used only to bound the sweep window. */
const LATITUDE_WINDOW = deduplicationConfig.MAX_DISTANCE_METERS / 1000 / 110.5;

export function categoriesCompatible(
  a: IncidentCategory,
  b: IncidentCategory,
): boolean {
  if (a === b) return true;
  return deduplicationConfig.COMPATIBLE_CATEGORIES.some(
    (group) => group.includes(a) && group.includes(b),
  );
}

function incidentTime(incident: RoadIncident): number | undefined {
  const value = Date.parse(incident.updatedAt ?? incident.reportedAt ?? '');
  return Number.isFinite(value) ? value : undefined;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/มีรายงาน/g, '')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function bigrams(value: string): Map<string, number> {
  const result = new Map<string, number>();
  const characters = [...value];
  for (let index = 0; index < characters.length - 1; index += 1) {
    const key = characters[index]! + characters[index + 1]!;
    result.set(key, (result.get(key) ?? 0) + 1);
  }
  return result;
}

/** Sørensen–Dice coefficient over character bigrams (works without spaces). */
export function textSimilarity(a: string, b: string): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  let overlap = 0;
  let total = 0;
  for (const count of leftGrams.values()) total += count;
  for (const count of rightGrams.values()) total += count;
  for (const [gram, count] of leftGrams)
    overlap += Math.min(count, rightGrams.get(gram) ?? 0);
  return total ? (2 * overlap) / total : 0;
}

function incidentText(incident: RoadIncident): string {
  return `${incident.title} ${incident.description ?? ''}`;
}

/**
 * Pairs of reports that may describe the same event. Every criterion must
 * hold — compatible category, nearby coordinates, known and similar
 * timestamps, and similar text. Missing data means "not a candidate"; the
 * caller shows candidates side by side and never merges them.
 */
export function findDuplicateCandidates(
  incidents: RoadIncident[],
): DuplicateCandidate[] {
  const items = incidents
    .filter(isValidCoordinate)
    .map((incident) => ({ incident, time: incidentTime(incident) }))
    .filter(
      (item): item is { incident: RoadIncident; time: number } =>
        item.time !== undefined,
    )
    .sort(
      (a, b) =>
        a.incident.latitude - b.incident.latitude ||
        a.incident.id.localeCompare(b.incident.id),
    );
  const candidates: DuplicateCandidate[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const a = items[i]!;
    for (let j = i + 1; j < items.length; j += 1) {
      const b = items[j]!;
      if (b.incident.latitude - a.incident.latitude > LATITUDE_WINDOW) break;
      if (a.incident.id === b.incident.id) continue;
      if (!categoriesCompatible(a.incident.category, b.incident.category))
        continue;
      const distanceMeters = haversineDistanceMeters(a.incident, b.incident);
      if (distanceMeters > deduplicationConfig.MAX_DISTANCE_METERS) continue;
      const timeDifferenceMs = Math.abs(a.time - b.time);
      if (timeDifferenceMs > deduplicationConfig.MAX_TIME_DIFFERENCE_MS)
        continue;
      const similarity = textSimilarity(
        incidentText(a.incident),
        incidentText(b.incident),
      );
      if (similarity < deduplicationConfig.MIN_TEXT_SIMILARITY) continue;
      const ids = [a.incident.id, b.incident.id].sort() as [string, string];
      candidates.push({
        ids,
        distanceMeters: Math.round(distanceMeters),
        timeDifferenceMs,
        textSimilarity: Math.round(similarity * 100) / 100,
      });
    }
  }
  return candidates.sort((a, b) =>
    `${a.ids[0]}|${a.ids[1]}`.localeCompare(`${b.ids[0]}|${b.ids[1]}`),
  );
}

/** Maps each incident id to the ids it may duplicate, sorted for stability. */
export function duplicateCandidateIndex(
  incidents: RoadIncident[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const { ids } of findDuplicateCandidates(incidents)) {
    const [a, b] = ids;
    index.set(a, [...(index.get(a) ?? []), b].sort());
    index.set(b, [...(index.get(b) ?? []), a].sort());
  }
  return index;
}
