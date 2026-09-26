import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  httpIncidentService,
  INCIDENT_REQUEST_TIMEOUT_MS,
  IncidentServiceError,
} from './httpIncidentService';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const meta = {
  generatedAt: '2026-09-26T00:00:00Z',
  partial: false,
  providers: [],
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('httpIncidentService', () => {
  it('maps the API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ data: [], meta })),
    );
    const result = await httpIncidentService.getIncidents({
      north: 14,
      south: 13,
      east: 101,
      west: 100,
    });
    expect(result).toEqual({ incidents: [], meta });
  });

  it('aborts the in-flight request when the caller aborts', async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        seen = init.signal ?? undefined;
        return new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          ),
        );
      }),
    );
    const request = httpIncidentService.getIncidents(
      { north: 14, south: 13, east: 101, west: 100 },
      controller.signal,
    );
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(seen?.aborted).toBe(true);
  });

  it('snaps bounds outward so the precise location is not sent', async () => {
    const fetchMock = vi.fn((url: string) => {
      void url;
      return jsonResponse({ data: [], meta });
    });
    vi.stubGlobal('fetch', fetchMock);
    await httpIncidentService.getIncidents({
      north: 13.7563,
      south: 13.6612,
      east: 100.5018,
      west: 100.4301,
    });
    const params = new URL(fetchMock.mock.calls[0]![0], 'https://example.test')
      .searchParams;
    expect(Object.fromEntries(params)).toEqual({
      north: '13.8',
      south: '13.65',
      east: '100.55',
      west: '100.4',
    });
  });

  it('drops malformed incidents and rejects malformed payloads', async () => {
    const valid = {
      id: 'longdo:1',
      title: 'มีรายงาน',
      latitude: 13.7,
      longitude: 100.5,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse({
          data: [valid, { id: 'x', title: 'bad', latitude: 'NaN' }],
          meta,
        }),
      ),
    );
    const bounds = { north: 14, south: 13, east: 101, west: 100 };
    expect((await httpIncidentService.getIncidents(bounds)).incidents).toEqual([
      valid,
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ oops: true })),
    );
    await expect(httpIncidentService.getIncidents(bounds)).rejects.toEqual(
      new IncidentServiceError(0),
    );
  });

  it('surfaces the HTTP status for rate limits and provider outages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ error: { code: 'rate_limited' } }, 429)),
    );
    await expect(
      httpIncidentService.getIncidents({
        north: 14,
        south: 13,
        east: 101,
        west: 100,
      }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('times out a request that never answers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) =>
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            ),
          ),
      ),
    );
    const request = httpIncidentService.getIncidents({
      north: 14,
      south: 13,
      east: 101,
      west: 100,
    });
    const assertion = expect(request).rejects.toMatchObject({
      name: 'IncidentServiceError',
      status: 0,
    });
    await vi.advanceTimersByTimeAsync(INCIDENT_REQUEST_TIMEOUT_MS);
    await assertion;
  });
});
