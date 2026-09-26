import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiRequest, ApiResponse } from '../../api/v1/incidents';
import { FixedWindowRateLimiter } from '../rateLimit/rateLimiter';

// A plain function (not vi.fn) so a rejected result is only observed by the handler.
let implementation: () => Promise<unknown> = () => Promise.resolve();
let calls = 0;
vi.mock('./getIncidents.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./getIncidents')>()),
  getIncidents: () => {
    calls += 1;
    return implementation();
  },
}));

const { createHandler } = await import('../../api/v1/incidents');
const { AllProvidersUnavailableError } = await import('./getIncidents.js');

function fakeResponse() {
  const result = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
  };
  const response: ApiResponse = {
    setHeader: (name, value) => {
      result.headers[name.toLowerCase()] = value;
    },
    status: (code) => {
      result.statusCode = code;
      return response;
    },
    json: (value) => {
      result.body = value;
      return value;
    },
  };
  return { response, result };
}

const validQuery = {
  north: '13.8',
  south: '13.7',
  east: '100.6',
  west: '100.5',
};

function request(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return { method: 'GET', query: validQuery, headers: {}, ...overrides };
}

beforeEach(() => {
  calls = 0;
  implementation = () =>
    Promise.resolve({ data: [], meta: { partial: false } });
});

describe('GET /api/v1/incidents handler', () => {
  it('returns incidents with no-store and nosniff headers', async () => {
    implementation = () =>
      Promise.resolve({ data: [], meta: { partial: true } });
    const { response, result } = fakeResponse();
    await createHandler(new FixedWindowRateLimiter(10))(request(), response);
    expect(result.statusCode).toBe(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['x-content-type-options']).toBe('nosniff');
    expect(result.body).toMatchObject({ meta: { partial: true } });
  });

  it('rejects other methods', async () => {
    const { response, result } = fakeResponse();
    await createHandler(new FixedWindowRateLimiter(10))(
      request({ method: 'POST' }),
      response,
    );
    expect(result.statusCode).toBe(405);
    expect(result.headers.allow).toBe('GET');
  });

  it('returns 400 for an oversized bounding box without calling providers', async () => {
    const { response, result } = fakeResponse();
    await createHandler(new FixedWindowRateLimiter(10))(
      request({
        query: { north: '20', south: '5', east: '101', west: '100' },
      }),
      response,
    );
    expect(result.statusCode).toBe(400);
    expect(calls).toBe(0);
  });

  it('returns the shared error schema when every provider fails', async () => {
    implementation = () => Promise.reject(new AllProvidersUnavailableError());
    const { response, result } = fakeResponse();
    await createHandler(new FixedWindowRateLimiter(10))(request(), response);
    expect(result.statusCode).toBe(503);
    expect(result.body).toMatchObject({
      error: { code: 'providers_unavailable' },
    });
  });

  it('rate limits a client with 429 and Retry-After', async () => {
    const handler = createHandler(new FixedWindowRateLimiter(1));
    const headers = { 'x-forwarded-for': '198.51.100.7' };
    await handler(request({ headers }), fakeResponse().response);
    const { response, result } = fakeResponse();
    await handler(request({ headers }), response);
    expect(result.statusCode).toBe(429);
    expect(Number(result.headers['retry-after'])).toBeGreaterThan(0);
    expect(result.body).toMatchObject({ error: { code: 'rate_limited' } });
    expect(calls).toBe(1);
  });
});
