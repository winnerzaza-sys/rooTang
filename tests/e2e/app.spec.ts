import { expect, test, type Page } from '@playwright/test';

// Mock data mode (see playwright.config.ts); no Google or provider calls.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-26T03:00:00.000Z'));
});

const mockMap = (page: Page) =>
  page.getByRole('region', { name: 'แผนที่จำลองแสดงเส้นทางและเหตุการณ์' });
const routeResults = (page: Page) =>
  page.getByRole('region', { name: 'ผลการค้นหาเส้นทาง' });

test('switches between Map and Nearby', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'ค้นหาเส้นทาง' }),
  ).toBeVisible();
  await page.getByRole('link', { name: /ใกล้ฉัน/ }).click();
  await expect(page.getByRole('heading', { name: 'ใกล้ฉัน' })).toBeVisible();
  await page.getByRole('link', { name: /แผนที่/ }).click();
  await expect(
    page.getByRole('button', { name: 'ค้นหาเส้นทาง' }),
  ).toBeVisible();
});

test('searches a mock route and shows ordered findings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ค้นหาเส้นทาง' }).click();
  await expect(page.getByText('42 นาที', { exact: true })).toBeVisible();
  await expect(
    page.getByText('พบรายงานเหตุการณ์ใกล้เส้นทาง 4 จุด'),
  ).toBeVisible();
  const findings = routeResults(page).getByRole('listitem');
  await expect(findings).toHaveCount(4);
  await expect(findings.nth(0)).toContainText('น้ำท่วม');
  await expect(findings.nth(0)).toContainText('ข้างหน้า 1.3 กม.');
  await expect(findings.nth(3)).toContainText('ถนนชำรุด');
  await expect(
    mockMap(page).getByRole('button', { name: /^มีรายงาน.*ใกล้เส้นทาง/ }),
  ).toHaveCount(4);
});

test('changes route markers and findings together', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ค้นหาเส้นทาง' }).click();
  await page.getByRole('radio', { name: /เส้นทางเลี่ยง/ }).click();
  await expect(page.getByText('49 นาที', { exact: true })).toBeVisible();
  await expect(
    page.getByText('พบรายงานเหตุการณ์ใกล้เส้นทาง 3 จุด'),
  ).toBeVisible();
  await expect(
    routeResults(page).getByRole('button', { name: /^มีรายงานงานก่อสร้าง/ }),
  ).toBeVisible();
  const pins = mockMap(page).getByRole('button', { name: /^มีรายงาน/ });
  await expect(pins).toHaveCount(3);
  await expect(
    mockMap(page).getByRole('button', { name: /^มีรายงานงานก่อสร้าง/ }),
  ).toBeVisible();
  await expect(
    mockMap(page).getByRole('button', { name: /^มีรายงานน้ำท่วม/ }),
  ).toHaveCount(0);
  await expect(
    routeResults(page).getByText('อาจอยู่บนถนนคู่ขนานหรือถนนใกล้เคียง'),
  ).toBeVisible();
});

test('filters Nearby and opens details', async ({ page }) => {
  await page.goto('/nearby');
  await page.getByRole('button', { name: 'น้ำท่วม', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await page
    .getByRole('button', { name: /^น้ำท่วม:/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/แหล่งข้อมูล:/)).toBeVisible();
  await expect(dialog.getByText(/ห่างจากตำแหน่งของคุณประมาณ/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('views a Nearby incident on the map', async ({ page }) => {
  await page.goto('/nearby');
  await page.getByRole('button', { name: /^งานก่อสร้าง:/ }).click();
  await page.getByRole('button', { name: 'ดูตำแหน่งบนแผนที่' }).click();
  await expect(
    mockMap(page).getByRole('button', {
      name: /^มีรายงานงานก่อสร้าง/,
      pressed: true,
    }),
  ).toBeVisible();
});

test('displays location denied state and selects an area', async ({ page }) => {
  await page.goto('/nearby?state=location-denied');
  await expect(page.getByText('ยังดูเหตุการณ์ใกล้คุณไม่ได้')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'อนุญาตตำแหน่ง' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'เลือกพื้นที่' }).click();
  await page.getByRole('button', { name: 'ใช้พื้นที่นี้' }).click();
  await expect(
    page.getByText('เหตุการณ์ภายใน 10 กม. จากพื้นที่ที่เลือก'),
  ).toBeVisible();
  await expect(page.getByRole('listitem').first()).toBeVisible();
});

test('displays partial provider warning', async ({ page }) => {
  await page.goto('/?state=partial');
  await expect(page.getByText('ข้อมูลบางแหล่งยังไม่พร้อม')).toBeVisible();
  await expect(page.getByText(/ผลลัพธ์อาจไม่ครบถ้วน/)).toBeVisible();
});

test('displays both providers unavailable state', async ({ page }) => {
  await page.goto('/?state=all-unavailable');
  await expect(page.getByText('ยังโหลดข้อมูลเหตุการณ์ไม่ได้')).toBeVisible();
});

test('keeps Nearby incidents ordered by distance', async ({ page }) => {
  await page.goto('/nearby');
  const cards = page.getByRole('listitem');
  await expect(cards.nth(0)).toContainText('0.8 กม.');
  await expect(cards.nth(1)).toContainText('0.9 กม.');
  await expect(page.getByText(/เพลิงไหม้นอกพื้นที่/)).toHaveCount(0);
});

test('shows offline behavior', async ({ page }) => {
  await page.goto('/?state=offline');
  await expect(page.getByText('คุณกำลังออฟไลน์')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'ค้นหาเส้นทาง' }),
  ).toBeDisabled();
});

test('reacts to real browser offline events', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await expect(page.getByText('คุณกำลังออฟไลน์')).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('คุณกำลังออฟไลน์')).toBeHidden();
});
