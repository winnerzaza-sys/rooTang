import { useState } from 'react';
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Icon } from '../components/Icons';
import { SystemBanners } from '../components/SystemBanners';
import { formatClockTime } from '../domain/incidentPresentation';
import type {
  AppCoordinate,
  DemoState,
  IncidentResponseMeta,
  RoadIncident,
} from '../domain/types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { MapScreen } from '../features/MapScreen';
import { NearbyScreen } from '../features/NearbyScreen';
import { googleMapsConfig } from '../services/googleMaps/config';
import {
  applyUpdate,
  dismissUpdate,
  useServiceWorkerUpdate,
} from './serviceWorkerUpdate';

const demoStates: Array<{ value: DemoState; label: string }> = [
  { value: 'normal', label: 'สถานะปกติ' },
  { value: 'loading', label: 'กำลังโหลด' },
  { value: 'no-incidents', label: 'เส้นทางไม่มีเหตุการณ์' },
  { value: 'nearby-empty', label: 'ใกล้ฉันว่าง' },
  { value: 'location-denied', label: 'ไม่อนุญาตตำแหน่ง' },
  { value: 'partial', label: 'ข้อมูลไม่ครบ' },
  { value: 'all-unavailable', label: 'แหล่งข้อมูลไม่พร้อม' },
  { value: 'offline', label: 'ออฟไลน์' },
  { value: 'map-error', label: 'แผนที่ผิดพลาด' },
  { value: 'route-not-found', label: 'ไม่พบเส้นทาง' },
  { value: 'stale', label: 'ข้อมูลที่บันทึกไว้' },
];

/**
 * Header data status. Production shows when the loaded incident data was
 * generated (never "live"); mock mode keeps the fixture copy.
 */
function DataStatus({
  production,
  offline,
  meta,
}: {
  production: boolean;
  offline: boolean;
  meta?: IncidentResponseMeta;
}) {
  if (!production)
    return (
      <div className="freshness">
        <span className="freshness-dot" aria-hidden="true" />
        อัปเดตล่าสุด 2 นาทีที่แล้ว
      </div>
    );
  // The dot is decorative; the text always states the same status.
  const tone = offline || !meta ? 'muted' : meta.partial ? 'partial' : '';
  const text = meta
    ? `ข้อมูลเหตุการณ์ ณ ${formatClockTime(meta.generatedAt)} น.${meta.partial ? ' • ไม่ครบทุกแหล่ง' : ''}`
    : 'ยังไม่มีข้อมูลเหตุการณ์';
  return (
    <div className="freshness">
      <span className={`freshness-dot ${tone}`} aria-hidden="true" />
      {offline ? `ออฟไลน์ • ${text}` : text}
    </div>
  );
}

export function App() {
  const production = googleMapsConfig.enabled;
  const location = useLocation();
  const navigate = useNavigate();
  const initial = new URLSearchParams(location.search).get(
    'state',
  ) as DemoState | null;
  // Demo states are a mock-mode tool only; production ignores ?state=.
  const [demoState, setDemoState] = useState<DemoState>(
    !production && demoStates.some((item) => item.value === initial)
      ? initial!
      : 'normal',
  );
  const updateReady = useServiceWorkerUpdate();
  const online = useOnlineStatus();
  const offline = demoState === 'offline' || !online;
  // Nearby area and map focus live in memory only; nothing is persisted.
  const [nearbyArea, setNearbyArea] = useState<AppCoordinate>();
  const [areaSelecting, setAreaSelecting] = useState(false);
  const [mapFocus, setMapFocus] = useState<RoadIncident>();
  const [incidentMeta, setIncidentMeta] = useState<IncidentResponseMeta>();

  function changeState(value: DemoState) {
    setDemoState(value);
    const params = new URLSearchParams(location.search);
    if (value === 'normal') params.delete('state');
    else params.set('state', value);
    navigate(
      { pathname: location.pathname, search: params.toString() },
      { replace: true },
    );
  }

  const mapScreen = (
    <MapScreen
      demoState={demoState}
      offline={offline}
      focusIncident={mapFocus}
      onClearFocus={() => setMapFocus(undefined)}
      areaSelecting={areaSelecting}
      onAreaSelected={(center) => {
        setNearbyArea(center);
        setAreaSelecting(false);
        void navigate('/nearby');
      }}
      onCancelAreaSelect={() => {
        setAreaSelecting(false);
        void navigate('/nearby');
      }}
      onIncidentMeta={setIncidentMeta}
    />
  );
  const nearbyScreen = (
    <NearbyScreen
      demoState={demoState}
      offline={offline}
      area={nearbyArea}
      onSelectArea={() => {
        setMapFocus(undefined);
        setAreaSelecting(true);
        void navigate('/');
      }}
      onClearArea={() => setNearbyArea(undefined)}
      onViewIncident={(incident) => {
        setMapFocus(incident);
        void navigate('/');
      }}
      onIncidentMeta={setIncidentMeta}
    />
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <header className="app-header">
        <div className="brand">
          <img src="/icons/ru-thang-app-icon-192.png" alt="" />
          <div>
            <strong>รู้ทาง</strong>
            <span>ดูเหตุการณ์ก่อนออกเดินทาง</span>
          </div>
        </div>
        <div className="header-tools">
          {!production && (
            <label className="demo-control">
              <span>ตัวอย่างสถานะ</span>
              <select
                aria-label="เลือกตัวอย่างสถานะหน้าจอ"
                value={demoState}
                onChange={(event) =>
                  changeState(event.target.value as DemoState)
                }
              >
                {demoStates.map((state) => (
                  <option value={state.value} key={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <DataStatus
            production={production}
            offline={offline}
            meta={incidentMeta}
          />
        </div>
      </header>
      <SystemBanners state={offline ? 'offline' : demoState} />
      {updateReady && (
        <div className="update-toast" role="status">
          <span>มีเวอร์ชันใหม่พร้อมใช้งาน</span>
          <button type="button" onClick={() => void applyUpdate()}>
            อัปเดต
          </button>
          <button
            type="button"
            aria-label="ปิดข้อความอัปเดต"
            onClick={dismissUpdate}
          >
            ×
          </button>
        </div>
      )}
      <Routes>
        <Route path="/nearby" element={nearbyScreen} />
        <Route path="*" element={mapScreen} />
      </Routes>
      <nav className="bottom-nav" aria-label="เมนูหลัก">
        <NavLink to="/" end>
          <Icon name="map" />
          <span>แผนที่</span>
        </NavLink>
        <NavLink to="/nearby" onClick={() => setAreaSelecting(false)}>
          <Icon name="nearby" />
          <span>ใกล้ฉัน</span>
        </NavLink>
      </nav>
    </div>
  );
}
