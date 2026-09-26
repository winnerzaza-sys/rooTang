import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentPin } from '../domain/matching/routeAnalysis';
import type { AppBounds, IncidentResponseMeta } from '../domain/types';
import { FIXTURE_NOW, incidents, mockRoutes } from '../test/fixtures';
import { MapScreen } from './MapScreen';

const mocks = vi.hoisted(() => ({
  computeRoutes: vi.fn(),
  getIncidents: vi.fn(),
  getCurrentPosition: vi.fn(),
}));

vi.mock('../services/googleMaps/config', () => ({
  googleMapsConfig: { apiKey: 'test-key', enabled: true, mapId: undefined },
}));
vi.mock('../services/googleMaps/googleDirectionsService', () => ({
  googleDirectionsService: { computeRoutes: mocks.computeRoutes },
}));
vi.mock('../services/incidents/httpIncidentService', () => ({
  httpIncidentService: { getIncidents: mocks.getIncidents },
}));
vi.mock('../services/browserLocationService', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../services/browserLocationService')
  >()),
  browserLocationService: { getCurrentPosition: mocks.getCurrentPosition },
}));
vi.mock('../services/googleMaps/googlePlacesService', () => ({
  googlePlacesService: {
    createAutocomplete: (
      _host: HTMLElement,
      options: {
        placeholder: string;
        initialValue?: string;
        onSelect: (place: unknown) => void;
      },
    ) => {
      options.onSelect({
        placeId: options.placeholder,
        label: options.initialValue ?? options.placeholder,
        coordinate: { latitude: 13.66, longitude: 100.42 },
      });
      return Promise.resolve(() => undefined);
    },
  },
}));
// Stand-in for Google Maps: exposes exactly what the map would draw.
vi.mock('../components/GoogleMapCanvas', () => ({
  GoogleMapCanvas: ({
    selectedRouteId,
    pins,
    currentLocation,
  }: {
    selectedRouteId?: string;
    pins: IncidentPin[];
    currentLocation?: { latitude: number; longitude: number };
  }) => (
    <ul
      aria-label="google-map-pins"
      data-selected-route={selectedRouteId}
      data-current-location={
        currentLocation
          ? `${currentLocation.latitude},${currentLocation.longitude}`
          : undefined
      }
    >
      {pins.map((pin) => (
        <li key={pin.incident.id}>{pin.incident.id}</li>
      ))}
    </ul>
  ),
}));

const meta: IncidentResponseMeta = {
  generatedAt: '2026-09-26T02:59:00.000Z',
  partial: false,
  providers: [],
};

function renderMap() {
  render(
    <MapScreen
      demoState="normal"
      offline={false}
      onClearFocus={() => undefined}
      areaSelecting={false}
      onAreaSelected={() => undefined}
      onCancelAreaSelect={() => undefined}
    />,
  );
}

const pins = () =>
  within(screen.getByRole('list', { name: 'google-map-pins' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent);

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXTURE_NOW);
  mocks.computeRoutes.mockResolvedValue({ routes: mockRoutes, meta });
  mocks.getCurrentPosition.mockResolvedValue({
    latitude: 13.7563,
    longitude: 100.5018,
  });
});
afterEach(() => {
  vi.useRealTimers();
  mocks.computeRoutes.mockReset();
  mocks.getIncidents.mockReset();
  mocks.getCurrentPosition.mockReset();
});

describe('MapScreen with mocked Google and backend services', () => {
  it('shows context before requesting browser location permission', async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(
      screen.getByRole('button', { name: 'ใช้ตำแหน่งปัจจุบัน' }),
    );
    expect(mocks.getCurrentPosition).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'ใช้ตำแหน่งของคุณ' });
    expect(dialog).toHaveTextContent(
      'รู้ทางใช้ตำแหน่งเพื่อแสดงเหตุการณ์ใกล้คุณ',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }),
    );
    expect(mocks.getCurrentPosition).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(
        screen.getByRole('list', { name: 'google-map-pins' }),
      ).toHaveAttribute('data-current-location', '13.7563,100.5018'),
    );
  });

  it('queries the route box, matches, and keeps pins in sync with the selection', async () => {
    let resolveRouteIncidents: (value: unknown) => void = () => undefined;
    mocks.getIncidents.mockImplementation((query: AppBounds) =>
      query.north < 13.8
        ? new Promise((resolve) => {
            resolveRouteIncidents = resolve;
          })
        : Promise.resolve({ incidents, meta }),
    );
    const user = userEvent.setup();
    renderMap();
    await screen.findByText('ต้นทาง: ตำแหน่งปัจจุบัน');
    await user.click(screen.getByRole('button', { name: 'ค้นหาเส้นทาง' }));

    // Route incidents are still loading: no findings, no "none found" claim.
    expect(
      await screen.findByText('กำลังตรวจสอบรายงานใกล้เส้นทาง…'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('ยังไม่พบรายงานเหตุการณ์ใกล้เส้นทางนี้'),
    ).not.toBeInTheDocument();
    expect(pins()).toEqual([]);
    const routeQuery = mocks.getIncidents.mock.calls.at(-1)![0] as AppBounds;
    expect(routeQuery.north).toBeGreaterThan(13.735);
    expect(routeQuery.south).toBeLessThan(13.66);

    resolveRouteIncidents({ incidents, meta });
    expect(
      await screen.findByText('พบรายงานเหตุการณ์ใกล้เส้นทาง 4 จุด'),
    ).toBeInTheDocument();
    expect(pins()).toEqual([
      'longdo:flood-01',
      'traffy:flood-07',
      'longdo:accident-02',
      'traffy:road-03',
    ]);
    expect(screen.getByText(/ไม่ใช่ข้อมูลสด/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /กาญจนาภิเษก/ }));
    expect(screen.getByText('49 นาที')).toBeInTheDocument();
    expect(
      screen.getByText('พบรายงานเหตุการณ์ใกล้เส้นทาง 3 จุด'),
    ).toBeInTheDocument();
    expect(pins()).toEqual([
      'traffy:construction-04',
      'longdo:breakdown-05',
      'traffy:obstruction-06',
    ]);
    expect(
      screen.getByRole('list', { name: 'google-map-pins' }),
    ).toHaveAttribute('data-selected-route', 'route-alternative');
  });

  it('shows partial data inside the route results', async () => {
    mocks.getIncidents.mockResolvedValue({
      incidents,
      meta: { ...meta, partial: true },
    });
    const user = userEvent.setup();
    renderMap();
    await screen.findByText('ต้นทาง: ตำแหน่งปัจจุบัน');
    await user.click(screen.getByRole('button', { name: 'ค้นหาเส้นทาง' }));
    const results = await screen.findByRole('region', {
      name: 'ผลการค้นหาเส้นทาง',
    });
    expect(
      await within(results).findByText('ข้อมูลบางแหล่งยังไม่พร้อม'),
    ).toBeInTheDocument();
  });

  it('reports a route analysis error instead of "no incidents"', async () => {
    mocks.getIncidents.mockImplementation((query: AppBounds) =>
      query.north < 13.8
        ? Promise.reject(new Error('503'))
        : Promise.resolve({ incidents, meta }),
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderMap();
    await screen.findByText('ต้นทาง: ตำแหน่งปัจจุบัน');
    await user.click(screen.getByRole('button', { name: 'ค้นหาเส้นทาง' }));
    expect(
      await screen.findByText('ยังตรวจสอบรายงานเหตุการณ์ตามเส้นทางไม่ได้'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ผลนี้ไม่ได้หมายความว่าไม่มีเหตุการณ์บนเส้นทาง'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('ยังไม่พบรายงานเหตุการณ์ใกล้เส้นทางนี้'),
    ).not.toBeInTheDocument();
  });
});
