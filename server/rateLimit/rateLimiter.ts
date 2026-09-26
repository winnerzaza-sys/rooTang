/**
 * Best-effort fixed-window limiter held in function-instance memory. Each
 * serverless instance counts on its own, so this only blunts bursts; a
 * platform firewall rule is still needed for a global limit. Client keys are
 * never logged or persisted and expire with their window.
 */
export class FixedWindowRateLimiter {
  private readonly windows = new Map<
    string,
    { start: number; count: number }
  >();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly maxKeys = 10_000,
    private readonly now = () => Date.now(),
  ) {}

  check(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = this.now();
    let entry = this.windows.get(key);
    if (!entry || now - entry.start >= this.windowMs) {
      if (!entry && this.windows.size >= this.maxKeys) this.prune(now);
      entry = { start: now, count: 0 };
      this.windows.set(key, entry);
    }
    entry.count += 1;
    return {
      allowed: entry.count <= this.limit,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((entry.start + this.windowMs - now) / 1000),
      ),
    };
  }

  private prune(now: number) {
    for (const [key, entry] of this.windows)
      if (now - entry.start >= this.windowMs) this.windows.delete(key);
    // Still full: drop the oldest entries rather than grow without bound.
    for (const key of this.windows.keys()) {
      if (this.windows.size < this.maxKeys) break;
      this.windows.delete(key);
    }
  }
}

/** INCIDENT_RATE_LIMIT_PER_MINUTE, default 60; invalid values fall back. */
export function rateLimitPerMinute(
  value = process.env.INCIDENT_RATE_LIMIT_PER_MINUTE,
): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

/** First address from the platform's forwarding headers, or a shared key. */
export function clientKey(
  headers: Record<string, string | string[] | undefined> = {},
): string {
  const header = (name: string) => {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  return (
    header('x-real-ip')?.trim() ||
    header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
