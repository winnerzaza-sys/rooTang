import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_NOW } from '../test/fixtures';
import { App } from './App';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXTURE_NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const map = () =>
  screen.getByRole('region', { name: 'แผนที่จำลองแสดงเส้นทางและเหตุการณ์' });
const results = () => screen.getByRole('region', { name: 'ผลการค้นหาเส้นทาง' });
const findings = () =>
  within(results())
    .getAllByRole('listitem')
    .map((item) => item.textContent);
const pinLabels = () =>
  within(map())
    .queryAllByRole('button', { name: /^มีรายงาน/ })
    .map((pin) => pin.getAttribute('aria-label') ?? '');

async function searchRoute() {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: 'ค้นหาเส้นทาง' }));
  await screen.findByText('42 นาที');
  return user;
}

describe('รู้ทาง app shell', () => {
  it('has exactly two accessible primary navigation destinations', () => {
    renderApp();
    const nav = screen.getByRole('navigation', { name: 'เมนูหลัก' });
    expect(within(nav).getAllByRole('link')).toHaveLength(2);
    expect(within(nav).getByRole('link', { name: /แผนที่/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('switches to Nearby and keeps it selected', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: /ใกล้ฉัน/ }));
    expect(
      screen.getByRole('heading', { name: 'ใกล้ฉัน' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ใกล้ฉัน/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

describe('route matching on the map', () => {
  it('shows viewport incidents before a route is selected', () => {
    renderApp();
    const labels = pinLabels();
    expect(labels.some((label) => label.includes('งานก่อสร้าง'))).toBe(true);
    expect(labels.some((label) => label.includes('น้ำท่วม'))).toBe(true);
    // Expired reports are not pinned as active.
    expect(labels.some((label) => label.includes('เคลียร์แล้ว'))).toBe(false);
  });

  it('shows only selected-route pins and findings in encounter order', async () => {
    await searchRoute();
    expect(
      screen.getByText('พบรายงานเหตุการณ์ใกล้เส้นทาง 4 จุด'),
    ).toBeVisible();
    expect(findings()).toHaveLength(4);
    expect(findings()[0]).toContain('ข้างหน้า 1.3 กม.');
    expect(findings()[3]).toContain('ถนนชำรุด');
    const labels = pinLabels();
    expect(labels).toHaveLength(4);
    expect(labels.every((label) => label.includes('ใกล้เส้นทางประมาณ'))).toBe(
      true,
    );
    expect(labels.some((label) => label.includes('งานก่อสร้าง'))).toBe(false);
    expect(
      map().querySelector('[data-route-id="route-primary"]'),
    ).toHaveAttribute('data-selected', 'true');
  });

  it('changes polyline, pins, ETA, count and findings together', async () => {
    const user = await searchRoute();
    await user.click(screen.getByRole('radio', { name: /เส้นทางเลี่ยง/ }));
    expect(screen.getByText('49 นาที')).toBeInTheDocument();
    expect(screen.getByText('12.7 กม.')).toBeInTheDocument();
    expect(
      screen.getByText('พบรายงานเหตุการณ์ใกล้เส้นทาง 3 จุด'),
    ).toBeVisible();
    const ordered = findings();
    expect(ordered).toHaveLength(3);
    expect(ordered[0]).toContain('งานก่อสร้าง');
    expect(ordered[1]).toContain('รถเสีย');
    expect(ordered[2]).toContain('สิ่งกีดขวาง');
    const labels = pinLabels();
    expect(labels).toHaveLength(3);
    expect(labels.some((label) => label.includes('น้ำท่วม'))).toBe(false);
    expect(labels.some((label) => label.includes('งานก่อสร้าง'))).toBe(true);
    expect(
      map().querySelector('[data-route-id="route-alternative"]'),
    ).toHaveAttribute('data-selected', 'true');
    expect(
      map().querySelector('[data-route-id="route-primary"]'),
    ).toHaveAttribute('data-selected', 'false');
    expect(
      screen.getByRole('radio', { name: /เส้นทางเลี่ยง/ }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('moves the route selection with arrow keys from a single tab stop', async () => {
    const user = await searchRoute();
    const [primary, alternative] = screen.getAllByRole('radio');
    expect(primary).toHaveAttribute('tabindex', '0');
    expect(alternative).toHaveAttribute('tabindex', '-1');
    primary!.focus();
    await user.keyboard('{ArrowRight}');
    expect(alternative).toHaveFocus();
    expect(alternative).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByText('49 นาที', { selector: 'strong' }),
    ).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(primary).toHaveFocus();
    expect(primary).toHaveAttribute('aria-checked', 'true');
  });

  it('shows per-route report counts without a risk score', async () => {
    await searchRoute();
    const options = screen.getAllByRole('radio');
    expect(options[0]).toHaveTextContent('พบ 4 รายงาน');
    expect(options[1]).toHaveTextContent('พบ 3 รายงาน');
    expect(results()).not.toHaveTextContent(/คะแนน|ความเสี่ยง|ปลอดภัยกว่า/);
  });

  it('marks possible parallel-road and duplicate reports conservatively', async () => {
    const user = await searchRoute();
    expect(
      within(results()).getAllByText(
        'อาจเป็นรายงานเดียวกับรายการอื่นที่อยู่ใกล้กัน',
      ),
    ).toHaveLength(2);
    await user.click(screen.getByRole('radio', { name: /เส้นทางเลี่ยง/ }));
    expect(
      within(results()).getByText('อาจอยู่บนถนนคู่ขนานหรือถนนใกล้เคียง'),
    ).toBeInTheDocument();
  });

  it('opens a finding with route relation, source and time', async () => {
    const user = await searchRoute();
    await user.click(
      within(results()).getAllByRole('button', {
        name: /^มีรายงานน้ำท่วม/,
      })[0]!,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(
      'ใกล้เส้นทางประมาณ 100 ม. • ข้างหน้า 1.3 กม.',
    );
    expect(dialog).toHaveTextContent('แหล่งข้อมูล: Longdo/iTIC');
    expect(dialog).toHaveTextContent('อัปเดต 12 นาทีที่แล้ว');
    expect(dialog).toHaveTextContent(/ไม่ได้ยืนยันว่าเหตุการณ์อยู่บนถนน/);
  });

  it('shows the no-findings copy without a safety claim', () => {
    renderApp('/?state=no-incidents');
    expect(
      screen.getByText('ยังไม่พบรายงานเหตุการณ์ใกล้เส้นทางนี้'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'ข้อมูลนี้ไม่ใช่การยืนยันว่าเส้นทางปลอดภัยหรือผ่านได้แน่นอน',
      ),
    ).toBeInTheDocument();
    expect(pinLabels()).toEqual([]);
  });
});

describe('Nearby feed', () => {
  it('lists incidents within 10 km from nearest to farthest', () => {
    renderApp('/nearby');
    const cards = within(
      screen.getByRole('list', { name: 'รายการเหตุการณ์ใกล้ฉัน' }),
    ).getAllByRole('button');
    const distances = cards.map((card) =>
      Number(/ห่างประมาณ ([\d.]+)/.exec(card.getAttribute('aria-label')!)![1]),
    );
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(distances.every((km) => km <= 10)).toBe(true);
    expect(cards[0]).toHaveTextContent('0.8 กม.');
    expect(screen.queryByText(/เพลิงไหม้นอกพื้นที่/)).not.toBeInTheDocument();
    expect(screen.queryByText(/เคลียร์แล้ว/)).not.toBeInTheDocument();
    expect(cards[0]).toHaveTextContent('Longdo/iTIC • อัปเดต 19 นาทีที่แล้ว');
  });

  it('offers only category filters present in the data', async () => {
    const user = userEvent.setup();
    renderApp('/nearby');
    const group = screen.getByRole('group', { name: 'กรองประเภทเหตุการณ์' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((chip) => chip.textContent),
    ).toEqual([
      'ทั้งหมด',
      'น้ำท่วม',
      'อุบัติเหตุ',
      'รถเสีย',
      'ถนนชำรุด',
      'งานก่อสร้าง',
      'สิ่งกีดขวาง',
    ]);
    await user.click(within(group).getByRole('button', { name: 'น้ำท่วม' }));
    expect(
      within(group).getByRole('button', { name: 'น้ำท่วม' }),
    ).toHaveAttribute('aria-pressed', 'true');
    const items = within(
      screen.getByRole('list', { name: 'รายการเหตุการณ์ใกล้ฉัน' }),
    ).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('1.8 กม.');
  });

  it('opens details with the keyboard and returns focus on Escape', async () => {
    const user = userEvent.setup();
    renderApp('/nearby');
    const card = screen.getAllByRole('button', { name: /^อุบัติเหตุ:/ })[0]!;
    card.focus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('มีรายงานอุบัติเหตุใกล้แยกพระราม 2');
    expect(
      screen.getByRole('button', { name: 'ปิดรายละเอียดเหตุการณ์' }),
    ).toHaveFocus();
    expect(dialog).toHaveTextContent('ห่างจากตำแหน่งของคุณประมาณ 0.8 กม.');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(card).toHaveFocus();
  });

  it('keeps keyboard focus inside the open detail dialog', async () => {
    const user = userEvent.setup();
    renderApp('/nearby');
    await user.click(
      screen.getAllByRole('button', { name: /^อุบัติเหตุ:/ })[0]!,
    );
    const close = screen.getByRole('button', {
      name: 'ปิดรายละเอียดเหตุการณ์',
    });
    const viewMap = screen.getByRole('button', { name: 'ดูตำแหน่งบนแผนที่' });
    expect(close).toHaveFocus();
    await user.tab();
    expect(viewMap).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(viewMap).toHaveFocus();
  });

  it('views an incident on the map', async () => {
    const user = userEvent.setup();
    renderApp('/nearby');
    await user.click(
      screen.getAllByRole('button', { name: /^งานก่อสร้าง:/ })[0]!,
    );
    await user.click(screen.getByRole('button', { name: 'ดูตำแหน่งบนแผนที่' }));
    expect(
      screen.getByRole('button', { name: 'ค้นหาเส้นทาง' }),
    ).toBeInTheDocument();
    const focused = within(map()).getByRole('button', {
      name: /^มีรายงานงานก่อสร้าง/,
    });
    expect(focused).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ตำแหน่งรายงานที่เลือก')).toBeInTheDocument();
  });

  it('lets a user without location select an area on the map', async () => {
    const user = userEvent.setup();
    renderApp('/nearby?state=location-denied');
    expect(screen.getByText('ยังดูเหตุการณ์ใกล้คุณไม่ได้')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'อนุญาตตำแหน่ง' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'เลือกพื้นที่' }));
    const picker = screen.getByRole('region', { name: 'เลือกพื้นที่' });
    await user.click(
      within(picker).getByRole('button', { name: 'ใช้พื้นที่นี้' }),
    );
    expect(
      screen.getByText('เหตุการณ์ภายใน 10 กม. จากพื้นที่ที่เลือก'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'รายการเหตุการณ์ใกล้ฉัน' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }),
    ).toBeInTheDocument();
  });

  it('can cancel area selection and return to Nearby', async () => {
    const user = userEvent.setup();
    renderApp('/nearby?state=location-denied');
    await user.click(screen.getByRole('button', { name: 'เลือกพื้นที่' }));
    await user.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(screen.getByText('ยังดูเหตุการณ์ใกล้คุณไม่ได้')).toBeInTheDocument();
  });
});

describe('system states', () => {
  it('shows permission, partial, offline, error, loading and empty states', () => {
    renderApp('/nearby?state=location-denied');
    expect(screen.getByText('ยังดูเหตุการณ์ใกล้คุณไม่ได้')).toBeInTheDocument();
    cleanup();
    renderApp('/?state=partial');
    expect(screen.getByText('ข้อมูลบางแหล่งยังไม่พร้อม')).toBeInTheDocument();
    cleanup();
    renderApp('/?state=offline');
    expect(screen.getByText('คุณกำลังออฟไลน์')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ค้นหาเส้นทาง' })).toBeDisabled();
    cleanup();
    renderApp('/nearby?state=nearby-empty');
    expect(screen.getByText('ยังไม่พบรายงานในบริเวณนี้')).toBeInTheDocument();
    cleanup();
    renderApp('/nearby?state=all-unavailable');
    expect(screen.getByText('ยังโหลดรายการใกล้ฉันไม่ได้')).toBeInTheDocument();
    cleanup();
    renderApp('/nearby?state=loading');
    expect(
      screen.getByRole('status', { name: 'กำลังโหลดเหตุการณ์' }),
    ).toHaveAttribute('aria-busy', 'true');
  });

  it('reacts to the browser going offline', () => {
    renderApp();
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText('คุณกำลังออฟไลน์')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ค้นหาเส้นทาง' })).toBeDisabled();
    onLine.mockRestore();
  });
});
