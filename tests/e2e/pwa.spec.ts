import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from '@playwright/test';

/*
 * Runs against the production build (see playwright.config.ts) in
 * production data mode with an empty Google key. /api/v1/incidents is
 * intercepted and every non-local request is aborted, so no Google,
 * Longdo or Traffy endpoint is ever contacted.
 */

const NOW = new Date('2026-09-26T03:00:00.000Z');
const USER = { latitude: 13.7563, longitude: 100.5018 };

async function acceptLocationContext(page: Page) {
  await expect(page.getByText('ใช้ตำแหน่งของคุณ')).toBeVisible();
  await page.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }).click();
}

function incident(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `longdo:${id}`,
    provider: 'longdo',
    externalId: id,
    category: 'flood',
    title: 'มีรายงานน้ำท่วม ถนนพระราม 4',
    latitude: USER.latitude + 0.004,
    longitude: USER.longitude + 0.004,
    status: 'active',
    freshness: 'active',
    reportedAt: '2026-09-26T02:40:00.000Z',
    updatedAt: '2026-09-26T02:48:00.000Z',
    ...overrides,
  };
}

function body(data: unknown[], partial = false) {
  return {
    data,
    meta: {
      generatedAt: '2026-09-26T02:58:00.000Z',
      partial,
      providers: [
        { provider: 'longdo', status: 'ok', fetchedAt: '2026-09-26T02:58:00Z' },
        partial
          ? { provider: 'traffy', status: 'unavailable' }
          : {
              provider: 'traffy',
              status: 'ok',
              fetchedAt: '2026-09-26T02:57:00Z',
            },
      ],
    },
  };
}

/** Aborts every external request and records any Google Maps attempt. */
async function isolateNetwork(context: BrowserContext) {
  const external: string[] = [];
  await context.route(
    (url) => !['127.0.0.1', 'localhost'].includes(url.hostname),
    (route) => {
      external.push(route.request().url());
      return route.abort();
    },
  );
  return () =>
    external.filter((url) =>
      /maps\.googleapis|routes\.googleapis|places\.googleapis/.test(url),
    );
}

async function mockIncidents(
  page: Page,
  handler: (route: Route) => Promise<void> | void,
) {
  const urls: URL[] = [];
  await page.route('**/api/v1/incidents?**', (route) => {
    urls.push(new URL(route.request().url()));
    return handler(route);
  });
  return urls;
}

test.describe('installable app shell', () => {
  test('manifest, icons and head metadata are valid', async ({
    page,
    request,
  }) => {
    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBe(true);
    const manifest = (await manifestResponse.json()) as {
      name: string;
      short_name: string;
      start_url: string;
      scope: string;
      display: string;
      theme_color: string;
      background_color: string;
      lang: string;
      icons: Array<{
        src: string;
        sizes: string;
        type: string;
        purpose?: string;
      }>;
    };
    expect(manifest).toMatchObject({
      name: 'รู้ทาง',
      short_name: 'รู้ทาง',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#1267e8',
      background_color: '#f5f7fa',
      lang: 'th',
    });
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(
      true,
    );
    for (const icon of manifest.icons) {
      const response = await request.get(icon.src);
      expect(response.headers()['content-type']).toContain('image/png');
      const png = await response.body();
      // PNG IHDR: width and height are big-endian at bytes 16–23.
      const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
      expect(size).toBe(icon.sizes);
    }

    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest.webmanifest',
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#1267e8',
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /viewport-fit=cover/,
    );
  });

  test('service worker precaches only same-origin app-shell assets', async ({
    page,
    context,
  }) => {
    const googleCalls = await isolateNetwork(context);
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // First load is uncontrolled; a reload puts the page under the worker.
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);

    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        urls.push(...(await cache.keys()).map((request) => request.url));
      }
      return urls;
    });
    expect(cached.length).toBeGreaterThan(0);
    for (const url of cached) {
      const parsed = new URL(url);
      expect(parsed.origin).toBe(new URL(page.url()).origin);
      expect(parsed.pathname).not.toMatch(/^\/api\//);
      expect(parsed.pathname).toMatch(
        /^\/(index\.html|manifest\.webmanifest|icons\/.+\.png|assets\/.+\.(js|css))$/,
      );
    }

    expect(googleCalls()).toEqual([]);
  });

  test('opens the cached app shell offline, including deep links', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'Playwright WebKit fails page.reload() while context.setOffline(true) (internal error); verify offline launch on a real iOS device.',
    );
    const googleCalls = await isolateNetwork(context);
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'ใช้ตำแหน่งปัจจุบัน' }),
    ).toBeVisible();
    await expect(page.getByText('คุณกำลังออฟไลน์')).toBeVisible();
    await expect(
      page.getByText(
        'ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อค้นหาเส้นทางและอัปเดตเหตุการณ์',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'ค้นหาเส้นทาง' }),
    ).toHaveCount(0);

    // Deep links resolve to the cached shell too.
    await page.goto('/nearby');
    await expect(page.getByRole('heading', { name: 'ใกล้ฉัน' })).toBeVisible();
    await expect(page.getByText('คุณกำลังออฟไลน์').first()).toBeVisible();
    expect(googleCalls()).toEqual([]);
  });
});

test.describe('production data states', () => {
  test.use({
    serviceWorkers: 'block',
    geolocation: USER,
    permissions: ['geolocation'],
  });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW);
  });

  test('one provider unavailable keeps Nearby usable with a warning', async ({
    page,
    context,
  }) => {
    const googleCalls = await isolateNetwork(context);
    const urls = await mockIncidents(page, (route) =>
      route.fulfill({ json: body([incident('a')], true) }),
    );
    await page.goto('/nearby');
    await acceptLocationContext(page);
    const card = page.getByRole('button', { name: /^น้ำท่วม:/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Longdo/iTIC');
    await expect(card).toContainText('อัปเดต 12 นาทีที่แล้ว');
    await expect(page.getByText('ข้อมูลบางแหล่งยังไม่พร้อม')).toBeVisible();
    await expect(
      page.getByText('ข้อมูลเหตุการณ์ ณ 09:58 น. • ไม่ครบทุกแหล่ง'),
    ).toBeVisible();
    await expect(page.getByText(/เรียลไทม์|real-time/i)).toHaveCount(0);

    // The request carries a coarse grid, not the precise position.
    const params = Object.fromEntries(urls[0].searchParams);
    for (const value of Object.values(params)) {
      expect(
        Math.abs(Number(value) * 20 - Math.round(Number(value) * 20)),
      ).toBeLessThan(1e-6);
    }
    expect(page.url()).not.toContain(String(USER.latitude));
    expect(googleCalls()).toEqual([]);
  });

  test('all providers unavailable shows an error that can be retried', async ({
    page,
    context,
  }) => {
    await isolateNetwork(context);
    let fail = true;
    await mockIncidents(page, (route) =>
      fail
        ? route.fulfill({
            status: 503,
            json: { error: { code: 'providers_unavailable', message: 'x' } },
          })
        : route.fulfill({ json: body([incident('b')]) }),
    );
    await page.goto('/nearby');
    await acceptLocationContext(page);
    await expect(page.getByText('ยังโหลดรายการใกล้ฉันไม่ได้')).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'ลองใหม่' }).click();
    await expect(page.getByRole('button', { name: /^น้ำท่วม:/ })).toBeVisible();
  });

  test('a request that never answers ends in the error state', async ({
    page,
    context,
  }) => {
    await isolateNetwork(context);
    await page.clock.install({ time: NOW });
    await mockIncidents(page, () => new Promise<void>(() => undefined));
    await page.goto('/nearby');
    await acceptLocationContext(page);
    await expect(
      page.getByRole('status', { name: 'กำลังโหลดเหตุการณ์' }),
    ).toBeVisible();
    await page.clock.runFor(16_000);
    await expect(page.getByText('ยังโหลดรายการใกล้ฉันไม่ได้')).toBeVisible();
  });

  test('empty results never claim the area is clear', async ({
    page,
    context,
  }) => {
    await isolateNetwork(context);
    await mockIncidents(page, (route) => route.fulfill({ json: body([]) }));
    await page.goto('/nearby');
    await acceptLocationContext(page);
    await expect(page.getByText('ยังไม่พบรายงานในบริเวณนี้')).toBeVisible();
    await expect(
      page.getByText('ข้อมูลนี้ไม่ใช่การยืนยันว่าไม่มีเหตุการณ์', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(page.getByText(/ปลอดภัย(?!หรือ)/)).toHaveCount(0);
  });

  test('going offline keeps loaded data labelled with its time, not as live', async ({
    page,
    context,
  }) => {
    await isolateNetwork(context);
    await mockIncidents(page, (route) =>
      route.fulfill({ json: body([incident('c')]) }),
    );
    await page.goto('/nearby');
    await acceptLocationContext(page);
    await expect(page.getByRole('button', { name: /^น้ำท่วม:/ })).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByText('คุณกำลังออฟไลน์')).toBeVisible();
    await expect(
      page.getByText('ออฟไลน์ • ข้อมูลเหตุการณ์ ณ 09:58 น.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'อัปเดต', exact: true }),
    ).toBeDisabled();
  });

  test('provider text is rendered as text, never as markup', async ({
    page,
    context,
  }) => {
    await isolateNetwork(context);
    await mockIncidents(page, (route) =>
      route.fulfill({
        json: body([
          incident('d', { title: '<img src=x onerror="window.__xss=1">ถนน' }),
        ]),
      }),
    );
    await page.goto('/nearby');
    await acceptLocationContext(page);
    await expect(
      page.getByText('<img src=x onerror="window.__xss=1">ถนน'),
    ).toBeVisible();
    await expect(page.locator('.incident-list img')).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as { __xss?: number }).__xss),
    ).toBeUndefined();
  });

  test('map screen without a Google key shows a recoverable configuration state', async ({
    page,
    context,
  }) => {
    const googleCalls = await isolateNetwork(context);
    await page.goto('/');
    await expect(page.getByText('ยังไม่ได้ตั้งค่าแผนที่')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ลองใหม่' })).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'เลือกตัวอย่างสถานะหน้าจอ' }),
    ).toHaveCount(0);
    await expect(page.getByText(/2 นาทีที่แล้ว/)).toHaveCount(0);
    expect(googleCalls()).toEqual([]);
  });
});

test.describe('location permission denied', () => {
  test.use({ serviceWorkers: 'block', permissions: [] });

  test('offers location retry and area selection', async ({
    page,
    context,
  }) => {
    await isolateNetwork(context);
    await context.clearPermissions();
    await page.goto('/nearby');
    await acceptLocationContext(page);
    await expect(page.getByText('ยังดูเหตุการณ์ใกล้คุณไม่ได้')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'วิธีเปิดตำแหน่ง' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'วิธีเปิดตำแหน่ง' }).click();
    await expect(
      page.getByRole('dialog', { name: 'เปิดสิทธิ์ตำแหน่ง' }),
    ).toContainText('หลังเลือก Don’t Allow เบราว์เซอร์จะไม่ถามซ้ำ');
    await expect(
      page.getByRole('button', { name: 'เลือกพื้นที่แทน' }),
    ).toBeVisible();
  });
});
