import {
  AllProvidersUnavailableError,
  getIncidents,
} from '../../server/incidents/getIncidents.js';
import {
  clientKey,
  FixedWindowRateLimiter,
  rateLimitPerMinute,
} from '../../server/rateLimit/rateLimiter.js';
import {
  parseIncidentQuery,
  RequestValidationError,
} from '../../server/validation/bounds.js';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: string[] };
}

export interface ApiRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(value: unknown): unknown;
}

const limiter = new FixedWindowRateLimiter(rateLimitPerMinute());

export function createHandler(rateLimiter = limiter) {
  return async function handler(request: ApiRequest, response: ApiResponse) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({
        error: { code: 'method_not_allowed', message: 'รองรับเฉพาะ GET' },
      });
    }
    const limit = rateLimiter.check(clientKey(request.headers));
    if (!limit.allowed) {
      response.setHeader('Retry-After', String(limit.retryAfterSeconds));
      return response.status(429).json({
        error: {
          code: 'rate_limited',
          message: 'มีการเรียกข้อมูลถี่เกินไป กรุณาลองใหม่ภายหลัง',
        },
      });
    }
    try {
      const query = parseIncidentQuery(request.query);
      return response.status(200).json(await getIncidents(query));
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return response.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'พารามิเตอร์ไม่ถูกต้อง',
            details: error.details,
          },
        });
      }
      if (error instanceof AllProvidersUnavailableError) {
        return response.status(503).json({
          error: {
            code: 'providers_unavailable',
            message: 'ข้อมูลเหตุการณ์ยังไม่พร้อม กรุณาลองใหม่',
          },
        });
      }
      // Never log the request query: it contains the requested area.
      if (process.env.NODE_ENV !== 'production')
        console.error('Incident API failure', error);
      return response.status(500).json({
        error: {
          code: 'internal_error',
          message: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
        },
      });
    }
  };
}

export default createHandler();
