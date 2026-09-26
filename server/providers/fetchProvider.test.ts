import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJson, providerTimeoutMs } from './fetchProvider';

afterEach(() => vi.unstubAllGlobals());

describe('fetchJson', () => {
  it('aborts a provider after its independent timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    await expect(
      fetchJson('https://provider.invalid', 5),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects a streamed body that exceeds the size limit', async () => {
    const chunk = new TextEncoder().encode('x'.repeat(600));
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(body, { status: 200 }))),
    );
    await expect(
      fetchJson('https://provider.invalid', 1_000, 1_000),
    ).rejects.toThrow('too large');
    expect(cancelled).toBe(true);
  });

  it('rejects a declared content-length above the limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response('[]', { headers: { 'content-length': '5000' } }),
        ),
      ),
    );
    await expect(
      fetchJson('https://provider.invalid', 1_000, 1_000),
    ).rejects.toThrow('too large');
  });

  it('parses JSON within the limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('[{"a":"ก"}]'))),
    );
    await expect(fetchJson('https://provider.invalid')).resolves.toEqual([
      { a: 'ก' },
    ]);
  });
});

describe('providerTimeoutMs', () => {
  it('reads, clamps and falls back', () => {
    expect(providerTimeoutMs('5000')).toBe(5_000);
    expect(providerTimeoutMs('10')).toBe(1_000);
    expect(providerTimeoutMs('999999')).toBe(20_000);
    expect(providerTimeoutMs('abc')).toBe(8_000);
    expect(providerTimeoutMs(undefined)).toBe(8_000);
  });
});
