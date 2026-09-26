import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeRoutes,
  selectRouteView,
} from '../domain/matching/routeAnalysis';
import { FIXTURE_NOW, incidents, mockRoutes } from '../test/fixtures';
import { GoogleMapCanvas } from './GoogleMapCanvas';

const config = vi.hoisted(() => ({
  googleMapsConfig: { apiKey: '', enabled: true, mapId: undefined },
}));
vi.mock('../services/googleMaps/config', () => config);

interface FakeMarker {
  map: unknown;
  content: HTMLElement;
}
interface FakeLine {
  options: { strokeWeight: number; zIndex: number };
  map: unknown;
  setMap: (map: unknown) => void;
}
const created = vi.hoisted(() => ({
  markers: [] as FakeMarker[],
  lines: [] as FakeLine[],
}));

vi.mock('../services/googleMaps/loader', () => ({
  loadGoogleLibrary: (name: string) =>
    Promise.resolve(
      name === 'maps'
        ? {
            Map: class {
              addListener() {}
              fitBounds() {}
              getBounds() {
                return undefined;
              }
              panTo() {}
              setZoom() {}
              getZoom() {
                return 14;
              }
            },
          }
        : {},
    ),
}));

function installFakeGoogle() {
  created.markers = [];
  created.lines = [];
  vi.stubGlobal('google', {
    maps: {
      event: { clearInstanceListeners: () => undefined },
      Polyline: class {
        map: unknown;
        constructor(public options: FakeLine['options'] & { map: unknown }) {
          this.map = options.map;
          created.lines.push(this);
        }
        setMap(map: unknown) {
          this.map = map;
        }
      },
      marker: {
        AdvancedMarkerElement: class {
          map: unknown;
          content: HTMLElement;
          constructor(options: { map: unknown; content: HTMLElement }) {
            this.map = options.map;
            this.content = options.content;
            created.markers.push(this);
          }
        },
      },
    },
  });
}

afterEach(() => {
  // Unmount while the fake `google` global still exists.
  cleanup();
  vi.unstubAllGlobals();
  config.googleMapsConfig.apiKey = '';
});

const analyzed = analyzeRoutes(mockRoutes, incidents, FIXTURE_NOW);
const noop = () => undefined;
const visibleMarkerLabels = () =>
  created.markers
    .filter((marker) => marker.map)
    .map((marker) => marker.content.getAttribute('aria-label') ?? '');

describe('GoogleMapCanvas', () => {
  it('shows a recoverable missing-key state', () => {
    render(
      <GoogleMapCanvas
        routes={[]}
        pins={[]}
        now={FIXTURE_NOW}
        onBounds={noop}
        onIncident={noop}
      />,
    );
    expect(screen.getByText('ยังไม่ได้ตั้งค่าแผนที่')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ลองใหม่' })).toBeInTheDocument();
  });

  it('draws only selected-route pins and replaces them when the route changes', async () => {
    config.googleMapsConfig.apiKey = 'test-key';
    installFakeGoogle();
    const primary = selectRouteView(analyzed, 'route-primary', incidents);
    const { rerender } = render(
      <GoogleMapCanvas
        routes={analyzed}
        selectedRouteId="route-primary"
        pins={primary.pins}
        now={FIXTURE_NOW}
        onBounds={noop}
        onIncident={noop}
      />,
    );
    await waitFor(() => expect(visibleMarkerLabels()).toHaveLength(3));
    expect(visibleMarkerLabels()).toContain('กลุ่มรายงานเหตุการณ์ 2 จุด');
    expect(
      visibleMarkerLabels()
        .filter((label) => label.startsWith('มีรายงาน'))
        .every((label) => label.includes('ใกล้เส้นทางประมาณ')),
    ).toBe(true);
    const selectedLine = () =>
      created.lines
        .filter((line) => line.map)
        .find((line) => line.options.zIndex === 2);
    expect(selectedLine()?.options.strokeWeight).toBe(6);

    const alternative = selectRouteView(
      analyzed,
      'route-alternative',
      incidents,
    );
    rerender(
      <GoogleMapCanvas
        routes={analyzed}
        selectedRouteId="route-alternative"
        pins={alternative.pins}
        now={FIXTURE_NOW}
        onBounds={noop}
        onIncident={noop}
      />,
    );
    await waitFor(() => expect(visibleMarkerLabels()).toHaveLength(3));
    expect(visibleMarkerLabels().join(' ')).not.toContain('น้ำท่วม');
    expect(visibleMarkerLabels().join(' ')).toContain('งานก่อสร้าง');
    expect(created.lines.filter((line) => line.map)).toHaveLength(2);
    expect(
      created.markers.every((marker) => marker.content.tagName === 'BUTTON'),
    ).toBe(true);
  });
});
