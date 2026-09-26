import { describe, expect, it, vi } from 'vitest';
import { ProviderCache } from './providerCache';

describe('ProviderCache', () => {
  it('deduplicates concurrent loads and marks stale fallback', async () => {
    let now = 0;
    const loader = vi.fn(() => Promise.resolve(['value']));
    const cache = new ProviderCache<string[]>(100, () => now);
    const [first, second] = await Promise.all([
      cache.get(loader),
      cache.get(loader),
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(first.value).toEqual(second.value);
    now = 101;
    const stale = await cache.get(() => Promise.reject(new Error('down')));
    expect(stale.stale).toBe(true);
  });
});
