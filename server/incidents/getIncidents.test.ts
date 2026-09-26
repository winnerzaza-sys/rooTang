import { describe, expect, it } from 'vitest';
import type { RoadIncident } from '../../src/domain/types';
import {
  AllProvidersUnavailableError,
  getIncidents,
  LONGDO_CACHE_MS,
  TRAFFY_CACHE_MS,
} from './getIncidents';

const incident = (provider: 'longdo' | 'traffy'): RoadIncident => ({
  id: `${provider}:1`,
  externalId: '1',
  provider,
  category: 'flood',
  title: 'มีรายงานน้ำท่วม',
  latitude: 13.7,
  longitude: 100.5,
  status: 'active',
  freshness: 'active',
});
const query = { north: 14, south: 13, east: 101, west: 100 };
describe('incident aggregation', () => {
  it('uses independent cache durations', () => {
    expect(LONGDO_CACHE_MS).toBe(120_000);
    expect(TRAFFY_CACHE_MS).toBe(300_000);
  });
  it('returns partial success when one provider fails', async () => {
    const result = await getIncidents(query, {
      longdo: () => Promise.resolve([incident('longdo')]),
      traffy: () => Promise.reject(new Error('down')),
    });
    expect(result.data).toHaveLength(1);
    expect(result.meta.partial).toBe(true);
    expect(result.meta.providers[1]?.status).toBe('unavailable');
  });
  it('fails when both providers fail', async () => {
    await expect(
      getIncidents(query, {
        longdo: () => Promise.reject(new Error('down')),
        traffy: () => Promise.reject(new Error('down')),
      }),
    ).rejects.toBeInstanceOf(AllProvidersUnavailableError);
  });
  it('reports stale provider cache metadata', async () => {
    const values = [incident('longdo')] as RoadIncident[] & {
      __cache?: { fetchedAt: string; stale: boolean };
    };
    values.__cache = { fetchedAt: '2026-09-26T00:00:00.000Z', stale: true };
    const result = await getIncidents(query, {
      longdo: () => Promise.resolve(values),
      traffy: () => Promise.resolve([incident('traffy')]),
    });
    expect(result.meta.partial).toBe(true);
    expect(result.meta.providers[0]).toMatchObject({
      provider: 'longdo',
      status: 'stale',
      fetchedAt: '2026-09-26T00:00:00.000Z',
    });
  });
});
