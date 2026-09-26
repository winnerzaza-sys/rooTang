export const MAX_RESPONSE_BYTES = 8_000_000;
const DEFAULT_TIMEOUT_MS = 8_000;

/** INCIDENT_PROVIDER_TIMEOUT_MS, clamped to 1–20 s; invalid values fall back. */
export function providerTimeoutMs(
  value = process.env.INCIDENT_PROVIDER_TIMEOUT_MS,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(20_000, Math.max(1_000, parsed))
    : DEFAULT_TIMEOUT_MS;
}

/** Reads the body incrementally so an oversized payload is never buffered. */
async function readLimitedText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error('Upstream response too large');
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function fetchJson(
  url: string,
  timeoutMs = providerTimeoutMs(),
  maxBytes = MAX_RESPONSE_BYTES,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Upstream status ${response.status}`);
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > maxBytes) throw new Error('Upstream response too large');
    return JSON.parse(await readLimitedText(response, maxBytes)) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}
