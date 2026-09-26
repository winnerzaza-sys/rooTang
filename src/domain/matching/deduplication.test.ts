import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, incidents, mockRoutes } from '../../test/fixtures';
import type { RoadIncident } from '../types';
import {
  categoriesCompatible,
  duplicateCandidateIndex,
  findDuplicateCandidates,
  textSimilarity,
} from './deduplication';
import { analyzeRoutes } from './routeAnalysis';

const base: RoadIncident = {
  id: 'longdo:a',
  provider: 'longdo',
  externalId: 'a',
  category: 'accident',
  title: 'มีรายงานอุบัติเหตุรถชนกันบนถนนพระราม 2 ขาออก',
  latitude: 13.68,
  longitude: 100.45,
  status: 'active',
  freshness: 'active',
  updatedAt: '2026-09-26T02:00:00.000Z',
};

function other(patch: Partial<RoadIncident>): RoadIncident {
  return {
    ...base,
    id: 'traffy:b',
    provider: 'traffy',
    externalId: 'b',
    // ≈ 40 m north-east of `base`.
    latitude: 13.68025,
    longitude: 100.45025,
    title: 'มีรายงานอุบัติเหตุรถชนกัน ถนนพระราม 2 ขาออก',
    updatedAt: '2026-09-26T02:30:00.000Z',
    ...patch,
  };
}

describe('candidate deduplication', () => {
  it('pairs compatible, nearby, recent reports with similar text', () => {
    const [candidate, ...rest] = findDuplicateCandidates([base, other({})]);
    expect(rest).toEqual([]);
    expect(candidate?.ids).toEqual(['longdo:a', 'traffy:b']);
    expect(candidate?.distanceMeters).toBeLessThan(100);
    expect(candidate?.textSimilarity).toBeGreaterThan(0.45);
  });

  it('accepts compatible categories across providers', () => {
    expect(categoriesCompatible('accident', 'vehicle_breakdown')).toBe(true);
    expect(categoriesCompatible('flood', 'rain')).toBe(true);
    expect(categoriesCompatible('flood', 'accident')).toBe(false);
    expect(
      findDuplicateCandidates([base, other({ category: 'vehicle_breakdown' })]),
    ).toHaveLength(1);
  });

  it.each([
    ['incompatible category', { category: 'flood' as const }],
    ['more than 100 m apart', { latitude: 13.6815 }],
    ['more than 3 hours apart', { updatedAt: '2026-09-26T06:00:00.000Z' }],
    ['unknown timestamp', { updatedAt: undefined, reportedAt: undefined }],
    ['dissimilar text', { title: 'มีรายงานรถบรรทุกเสียกีดขวางช่องทางขวา' }],
    ['invalid coordinates', { latitude: Number.NaN }],
  ])('is not a candidate with %s', (_label, patch) => {
    expect(findDuplicateCandidates([base, other(patch)])).toEqual([]);
  });

  it('never pairs a report with itself', () => {
    expect(findDuplicateCandidates([base, { ...base }])).toEqual([]);
  });

  it('ignores the shared "มีรายงาน" prefix when comparing text', () => {
    expect(textSimilarity('มีรายงานน้ำท่วม', 'มีรายงานไฟไหม้')).toBeLessThan(
      0.2,
    );
    expect(
      textSimilarity('น้ำท่วมขัง ถนนบางขุนเทียน', 'น้ำท่วมขังถนนบางขุนเทียน'),
    ).toBe(1);
    expect(textSimilarity('', 'abc')).toBe(0);
  });

  it('indexes candidates symmetrically', () => {
    const index = duplicateCandidateIndex([base, other({})]);
    expect(index.get('longdo:a')).toEqual(['traffy:b']);
    expect(index.get('traffy:b')).toEqual(['longdo:a']);
  });

  it('flags fixture duplicates on a route without merging them', () => {
    const [primary] = analyzeRoutes(mockRoutes, incidents, FIXTURE_NOW);
    const ids = primary!.matches.map((match) => match.incident.id);
    expect(ids).toContain('longdo:flood-01');
    expect(ids).toContain('traffy:flood-07');
    const flood = primary!.matches.find(
      (match) => match.incident.id === 'longdo:flood-01',
    );
    expect(flood?.duplicateCandidateIds).toEqual(['traffy:flood-07']);
  });
});
