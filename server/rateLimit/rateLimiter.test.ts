import { describe, expect, it } from 'vitest';
import {
  clientKey,
  FixedWindowRateLimiter,
  rateLimitPerMinute,
} from './rateLimiter';

describe('FixedWindowRateLimiter', () => {
  it('allows up to the limit per window and then resets', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(2, 60_000, 100, () => now);
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
    const blocked = limiter.check('a');
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(limiter.check('b').allowed).toBe(true);
    now = 60_000;
    expect(limiter.check('a').allowed).toBe(true);
  });

  it('keeps memory bounded when many clients appear', () => {
    const now = 0;
    const limiter = new FixedWindowRateLimiter(1, 60_000, 3, () => now);
    for (const key of ['a', 'b', 'c', 'd', 'e']) limiter.check(key);
    const size = (limiter as unknown as { windows: Map<string, unknown> })
      .windows.size;
    expect(size).toBeLessThanOrEqual(3);
  });
});

describe('rate limit configuration', () => {
  it('parses the limit and falls back when invalid', () => {
    expect(rateLimitPerMinute('30')).toBe(30);
    expect(rateLimitPerMinute('0')).toBe(60);
    expect(rateLimitPerMinute('nope')).toBe(60);
  });

  it('derives the client key from forwarding headers', () => {
    expect(clientKey({ 'x-real-ip': '203.0.113.9' })).toBe('203.0.113.9');
    expect(clientKey({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })).toBe(
      '198.51.100.1',
    );
    expect(clientKey({})).toBe('unknown');
  });
});
