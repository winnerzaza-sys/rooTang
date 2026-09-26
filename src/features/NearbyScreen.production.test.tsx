import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentResponseMeta } from '../domain/types';
import { FIXTURE_NOW, incidents, MOCK_USER_LOCATION } from '../test/fixtures';
import { NearbyScreen, type NearbyScreenProps } from './NearbyScreen';

const mocks = vi.hoisted(() => ({
  getCurrentPosition: vi.fn(),
  getIncidents: vi.fn(),
}));

vi.mock('../services/googleMaps/config', () => ({
  googleMapsConfig: { apiKey: 'test-key', enabled: true, mapId: undefined },
}));
vi.mock('../services/browserLocationService', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../services/browserLocationService')
  >()),
  browserLocationService: { getCurrentPosition: mocks.getCurrentPosition },
}));
vi.mock('../services/incidents/httpIncidentService', () => ({
  httpIncidentService: { getIncidents: mocks.getIncidents },
}));

const { LocationServiceError } =
  await import('../services/browserLocationService');

function meta(partial = false): IncidentResponseMeta {
  return {
    generatedAt: '2026-09-26T02:59:00.000Z',
    partial,
    providers: [
      { provider: 'longdo', status: 'ok' },
      { provider: 'traffy', status: partial ? 'unavailable' : 'ok' },
    ],
  };
}

function renderNearby(props: Partial<NearbyScreenProps> = {}) {
  const handlers = {
    onSelectArea: vi.fn(),
    onClearArea: vi.fn(),
    onViewIncident: vi.fn(),
  };
  render(
    <NearbyScreen
      demoState="normal"
      offline={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXTURE_NOW);
  mocks.getCurrentPosition.mockResolvedValue(MOCK_USER_LOCATION);
  mocks.getIncidents.mockResolvedValue({ incidents, meta: meta() });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  mocks.getCurrentPosition.mockReset();
  mocks.getIncidents.mockReset();
});

describe('Nearby feed with backend data', () => {
  it('requests a 10 km box around the user and sorts by distance', async () => {
    const user = userEvent.setup();
    renderNearby();
    expect(mocks.getCurrentPosition).not.toHaveBeenCalled();
    expect(
      screen.getByText(/รู้ทางใช้ตำแหน่งเพื่อแสดงเหตุการณ์ใกล้คุณ/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }));
    const list = await screen.findByRole('list', {
      name: 'รายการเหตุการณ์ใกล้ฉัน',
    });
    const query = mocks.getIncidents.mock.calls[0]![0] as {
      north: number;
      south: number;
    };
    expect(query.north).toBeGreaterThan(MOCK_USER_LOCATION.latitude + 0.09);
    expect(query.south).toBeLessThan(MOCK_USER_LOCATION.latitude - 0.09);
    const cards = within(list).getAllByRole('listitem');
    expect(cards[0]).toHaveTextContent('0.8 กม.');
    expect(screen.getByText('ข้อมูลเหตุการณ์ ณ 09:59 น.')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'พบรายงาน 8 รายการภายใน 10 กิโลเมตร',
    );
  });

  it('does not request browser permission when the user chooses later', async () => {
    const user = userEvent.setup();
    renderNearby();
    await user.click(screen.getByRole('button', { name: 'ไว้ทีหลัง' }));
    expect(mocks.getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByText('เลือกดูเหตุการณ์ได้ภายหลัง')).toBeInTheDocument();
  });

  it('shows the permission-denied state with the area selection flow', async () => {
    mocks.getCurrentPosition.mockRejectedValue(
      new LocationServiceError('denied'),
    );
    const user = userEvent.setup();
    const handlers = renderNearby();
    await user.click(screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }));
    expect(
      await screen.findByText('ยังดูเหตุการณ์ใกล้คุณไม่ได้'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('อนุญาตตำแหน่ง หรือเลือกพื้นที่บนแผนที่'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'เลือกพื้นที่' }));
    expect(handlers.onSelectArea).toHaveBeenCalledOnce();
    expect(mocks.getIncidents).not.toHaveBeenCalled();
  });

  it('retries location when the user allows it', async () => {
    mocks.getCurrentPosition
      .mockRejectedValueOnce(new LocationServiceError('timeout'))
      .mockResolvedValueOnce(MOCK_USER_LOCATION);
    const user = userEvent.setup();
    renderNearby();
    await user.click(screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }));
    expect(
      await screen.findByText(/ค้นหาตำแหน่งไม่ทันเวลา/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'อนุญาตตำแหน่ง' }));
    expect(
      await screen.findByRole('list', { name: 'รายการเหตุการณ์ใกล้ฉัน' }),
    ).toBeInTheDocument();
  });

  it('uses a selected map area without requesting location', async () => {
    const area = { latitude: 13.72, longitude: 100.47 };
    renderNearby({ area });
    await screen.findByRole('list', { name: 'รายการเหตุการณ์ใกล้ฉัน' });
    expect(mocks.getCurrentPosition).not.toHaveBeenCalled();
    expect(
      screen.getByText('เหตุการณ์ภายใน 10 กม. จากพื้นที่ที่เลือก'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /^สิ่งกีดขวาง:/ })[0],
    ).toBeInTheDocument();
  });

  it('shows a partial-data warning when a provider is unavailable', async () => {
    mocks.getIncidents.mockResolvedValue({
      incidents: incidents.filter((item) => item.provider === 'longdo'),
      meta: meta(true),
    });
    const user = userEvent.setup();
    renderNearby();
    await user.click(screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }));
    expect(
      await screen.findByText('ข้อมูลบางแหล่งยังไม่พร้อม'),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('listitem')
        .every((item) => item.textContent?.includes('Longdo/iTIC')),
    ).toBe(true);
  });

  it('builds filter chips from the categories the backend returned', async () => {
    mocks.getIncidents.mockResolvedValue({
      incidents: incidents.filter((item) => item.category === 'flood'),
      meta: meta(),
    });
    const user = userEvent.setup();
    renderNearby();
    await user.click(screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }));
    const group = await screen.findByRole('group', {
      name: 'กรองประเภทเหตุการณ์',
    });
    expect(
      within(group)
        .getAllByRole('button')
        .map((chip) => chip.textContent),
    ).toEqual(['ทั้งหมด', 'น้ำท่วม']);
  });

  it('shows the empty state without claiming the area is clear', async () => {
    mocks.getIncidents.mockResolvedValue({ incidents: [], meta: meta() });
    const user = userEvent.setup();
    renderNearby();
    await user.click(screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }));
    expect(
      await screen.findByText('ยังไม่พบรายงานในบริเวณนี้'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ข้อมูลนี้ไม่ใช่การยืนยันว่าไม่มีเหตุการณ์/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'กรองประเภทเหตุการณ์' }),
    ).not.toBeInTheDocument();
  });

  it('shows a recoverable error state when all providers fail', async () => {
    mocks.getIncidents
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce({ incidents, meta: meta() });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderNearby();
    await user.click(screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('ยังโหลดรายการใกล้ฉันไม่ได้');
    await user.click(within(alert).getByRole('button', { name: 'ลองใหม่' }));
    expect(
      await screen.findByRole('list', { name: 'รายการเหตุการณ์ใกล้ฉัน' }),
    ).toBeInTheDocument();
  });

  it('shows the offline state when there is no loaded data', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderNearby({ offline: true });
    expect(await screen.findByText('ใช้ตำแหน่งของคุณ')).toBeInTheDocument();
    expect(mocks.getIncidents).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }),
    ).toBeEnabled();
  });

  it('opens details and hands the incident to the map', async () => {
    const user = userEvent.setup();
    const handlers = renderNearby();
    await user.click(screen.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }));
    await user.click(
      (await screen.findAllByRole('button', { name: /^น้ำท่วม:/ }))[0]!,
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'อาจเป็นรายงานเดียวกับรายการอื่นที่อยู่ใกล้กัน',
    );
    await user.click(screen.getByRole('button', { name: 'ดูตำแหน่งบนแผนที่' }));
    expect(handlers.onViewIncident).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'flood' }),
    );
  });
});
