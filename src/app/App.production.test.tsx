import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IncidentResponseMeta } from '../domain/types';
import {
  notifyUpdateReady,
  resetServiceWorkerUpdateForTests,
} from './serviceWorkerUpdate';

vi.mock('../services/googleMaps/config', () => ({
  googleMapsConfig: { apiKey: 'test-key', enabled: true, mapId: undefined },
}));

const meta: IncidentResponseMeta = {
  generatedAt: '2026-09-26T03:05:00.000Z',
  partial: true,
  providers: [
    { provider: 'longdo', status: 'ok', fetchedAt: '2026-09-26T03:04:00Z' },
    { provider: 'traffy', status: 'unavailable' },
  ],
};
let reportMeta = true;

// Screens are covered by their own production tests; these stubs only
// exercise the shell contract (meta reporting and demo-state props).
vi.mock('../features/MapScreen', () => ({
  MapScreen: ({
    demoState,
    onIncidentMeta,
  }: {
    demoState: string;
    onIncidentMeta?: (value?: IncidentResponseMeta) => void;
  }) => {
    useEffect(() => {
      if (reportMeta) onIncidentMeta?.(meta);
    }, [onIncidentMeta]);
    return <main>map:{demoState}</main>;
  },
}));
vi.mock('../features/NearbyScreen', () => ({
  NearbyScreen: () => <main>nearby</main>,
}));

const { App } = await import('./App');

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  reportMeta = true;
  resetServiceWorkerUpdateForTests();
});

describe('App in production mode', () => {
  it('hides demo controls and ignores ?state= overrides', () => {
    renderApp('/?state=route-not-found');
    expect(
      screen.queryByRole('combobox', { name: 'เลือกตัวอย่างสถานะหน้าจอ' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('map:normal')).toBeInTheDocument();
  });

  it('shows the real incident data time and partial status in the header', () => {
    renderApp();
    expect(
      screen.getByText('ข้อมูลเหตุการณ์ ณ 10:05 น. • ไม่ครบทุกแหล่ง'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/2 นาทีที่แล้ว/)).not.toBeInTheDocument();
  });

  it('says no data has loaded instead of claiming freshness', () => {
    reportMeta = false;
    renderApp();
    expect(screen.getByText('ยังไม่มีข้อมูลเหตุการณ์')).toBeInTheDocument();
  });
});

describe('service worker update prompt', () => {
  it('stays hidden until a new worker is waiting, then applies it', async () => {
    const user = userEvent.setup();
    const apply = vi.fn(() => Promise.resolve());
    renderApp();
    expect(screen.queryByText('มีเวอร์ชันใหม่พร้อมใช้งาน')).toBeNull();
    act(() => notifyUpdateReady(apply));
    expect(screen.getByRole('status')).toHaveTextContent(
      'มีเวอร์ชันใหม่พร้อมใช้งาน',
    );
    await user.click(screen.getByRole('button', { name: 'อัปเดต' }));
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed without losing the running app', async () => {
    const user = userEvent.setup();
    renderApp();
    act(() => notifyUpdateReady(() => Promise.resolve()));
    await user.click(screen.getByRole('button', { name: 'ปิดข้อความอัปเดต' }));
    expect(screen.queryByText('มีเวอร์ชันใหม่พร้อมใช้งาน')).toBeNull();
    expect(screen.getByText('map:normal')).toBeInTheDocument();
  });
});
