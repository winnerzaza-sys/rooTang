import type {
  IncidentQuery,
  IncidentResponseMeta,
  RoadIncident,
} from '../../src/domain/types';
import { ProviderCache } from '../cache/providerCache.js';
import { normalizeLongdoPayload } from '../providers/longdo.js';
import { fetchJson } from '../providers/fetchProvider.js';
import { normalizeTraffyPayload } from '../providers/traffy.js';
import { coordinateInBounds } from '../validation/bounds.js';

const LONGDO_URL = 'https://event.longdo.com/feed/json';
const TRAFFY_URL =
  'https://publicapi.traffy.in.th/teamchadchart-stat-api/geojson/v2';
export const LONGDO_CACHE_MS = 300_000;
export const TRAFFY_CACHE_MS = 300_000;

const longdoCache = new ProviderCache<RoadIncident[]>(LONGDO_CACHE_MS);
const traffyCache = new ProviderCache<RoadIncident[]>(TRAFFY_CACHE_MS);

export interface ProviderLoaders {
  longdo: () => Promise<RoadIncident[]>;
  traffy: () => Promise<RoadIncident[]>;
}

export class AllProvidersUnavailableError extends Error {
  constructor() {
    super('All incident providers are unavailable');
    this.name = 'AllProvidersUnavailableError';
  }
}

const defaultLoaders: ProviderLoaders = {
  longdo: () =>
    longdoCache
      .get(async () => normalizeLongdoPayload(await fetchJson(LONGDO_URL)))
      .then((result) => Object.assign(result.value, { __cache: result })),
  traffy: () =>
    traffyCache
      .get(async () => normalizeTraffyPayload(await fetchJson(TRAFFY_URL)))
      .then((result) => Object.assign(result.value, { __cache: result })),
};

type CachedIncidents = RoadIncident[] & {
  __cache?: { fetchedAt: string; stale: boolean };
};

export async function getIncidents(
  query: IncidentQuery,
  loaders: ProviderLoaders = defaultLoaders,
  now = new Date(),
): Promise<{ data: RoadIncident[]; meta: IncidentResponseMeta }> {
  const settled = await Promise.allSettled([
    loaders.longdo(),
    loaders.traffy(),
  ]);
  if (settled.every((result) => result.status === 'rejected'))
    throw new AllProvidersUnavailableError();
  const providers = (['longdo', 'traffy'] as const).map((provider, index) => {
    const result = settled[index];
    if (!result || result.status === 'rejected')
      return { provider, status: 'unavailable' as const };
    const cached = result.value as CachedIncidents;
    return {
      provider,
      status: cached.__cache?.stale ? ('stale' as const) : ('ok' as const),
      fetchedAt: cached.__cache?.fetchedAt ?? now.toISOString(),
    };
  });
  const seen = new Set<string>();
  const data = settled
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .filter(
      (incident) =>
        incident.status !== 'expired' && incident.status !== 'resolved',
    )
    .filter((incident) =>
      coordinateInBounds(incident.latitude, incident.longitude, query),
    )
    .filter(
      (incident) =>
        !query.categories || query.categories.includes(incident.category),
    )
    .filter((incident) =>
      seen.has(incident.id) ? false : (seen.add(incident.id), true),
    );
  return {
    data,
    meta: {
      generatedAt: now.toISOString(),
      partial: providers.some((item) => item.status !== 'ok'),
      providers,
    },
  };
}
