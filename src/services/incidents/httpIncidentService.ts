import { isValidCoordinate, snapBoundsOutward } from '../../domain/geo';
import type {
  IncidentQuery,
  IncidentResponseMeta,
  RoadIncident,
} from '../../domain/types';
import type { IncidentService } from '../contracts';

interface IncidentApiResponse {
  data: RoadIncident[];
  meta: IncidentResponseMeta;
}

/** Longer than the server's per-provider timeout, so partial data can arrive. */
export const INCIDENT_REQUEST_TIMEOUT_MS = 15_000;

export class IncidentServiceError extends Error {
  /** status 0 = timeout, network or malformed response. */
  constructor(public readonly status: number) {
    super('Incident service unavailable');
    this.name = 'IncidentServiceError';
  }
}

function isIncidentApiResponse(value: unknown): value is IncidentApiResponse {
  if (!value || typeof value !== 'object') return false;
  const { data, meta } = value as Partial<IncidentApiResponse>;
  return (
    Array.isArray(data) &&
    Boolean(meta) &&
    typeof meta?.generatedAt === 'string' &&
    typeof meta.partial === 'boolean' &&
    Array.isArray(meta.providers)
  );
}

function isRenderableIncident(value: unknown): value is RoadIncident {
  if (!isValidCoordinate(value)) return false;
  const incident = value as Partial<RoadIncident>;
  return typeof incident.id === 'string' && typeof incident.title === 'string';
}

export const httpIncidentService: IncidentService = {
  async getIncidents(query: IncidentQuery, signal?: AbortSignal) {
    // Coarse bounds keep precise locations out of URLs and request logs.
    const bounds = snapBoundsOutward(query);
    const params = new URLSearchParams({
      north: String(bounds.north),
      south: String(bounds.south),
      east: String(bounds.east),
      west: String(bounds.west),
    });
    if (query.categories?.length)
      params.set('categories', query.categories.join(','));
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, INCIDENT_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`/api/v1/incidents?${params}`, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new IncidentServiceError(response.status);
      const result: unknown = await response.json().catch(() => undefined);
      if (!isIncidentApiResponse(result)) throw new IncidentServiceError(0);
      return {
        incidents: result.data.filter(isRenderableIncident),
        meta: result.meta,
      };
    } catch (error) {
      if (signal?.aborted || error instanceof IncidentServiceError) throw error;
      throw new IncidentServiceError(0);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  },
};
