import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  IncidentQuery,
  IncidentResponseMeta,
  RoadIncident,
} from '../../domain/types';
import type { IncidentService } from '../contracts';
import { IncidentRefreshController } from './refreshController';

export function useIncidents(
  service: IncidentService,
  query: IncidentQuery | null,
) {
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [meta, setMeta] = useState<IncidentResponseMeta>();
  /** The query the current `incidents` belong to; guards against stale use. */
  const [resolvedQuery, setResolvedQuery] = useState<IncidentQuery | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);
  const abort = useRef<AbortController | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!query || !navigator.onLine) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const result = await service.getIncidents(query, controller.signal);
      if (id !== requestId.current) return;
      setIncidents(result.incidents);
      setMeta(result.meta);
      setResolvedQuery(query);
    } catch (cause) {
      if (controller.signal.aborted || id !== requestId.current) return;
      if (import.meta.env.DEV) console.error('Incident request failed', cause);
      setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query, service]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const polling = new IncidentRefreshController(() => void refresh());
    polling.markUpdated();
    polling.start();
    const visible = () => polling.handleVisible();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => {
      window.clearTimeout(initial);
      abort.current?.abort();
      polling.stop();
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, [refresh]);
  return { incidents, meta, loading, error, refresh, resolvedQuery };
}
