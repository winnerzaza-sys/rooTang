import { useEffect, useMemo, useState } from 'react';
import {
  categoryPresentation,
  formatClockTime,
  formatKilometers,
} from '../domain/incidentPresentation';
import { nearbyConfig } from '../domain/matching/config';
import {
  availableCategories,
  buildNearbyFeed,
  effectiveFilter,
  filterNearbyFeed,
  nearbyQuery,
  type NearbyFilter,
} from '../domain/nearby';
import type {
  AppCoordinate,
  DemoState,
  IncidentResponseMeta,
  NearbyIncident,
  RoadIncident,
} from '../domain/types';
import { useNow } from '../hooks/useNow';
import { IncidentCard, LoadingCards } from '../components/IncidentCard';
import { IncidentDetailSheet } from '../components/IncidentDetailSheet';
import { LocationPermissionHelp } from '../components/LocationPermissionHelp';
import { LocationPermissionPrompt } from '../components/LocationPermissionPrompt';
import { googleMapsConfig } from '../services/googleMaps/config';
import {
  browserLocationService,
  LocationServiceError,
  type LocationErrorCode,
} from '../services/browserLocationService';
import { httpIncidentService } from '../services/incidents/httpIncidentService';
import { useIncidents } from '../services/incidents/useIncidents';
import {
  readLocationConsent,
  rememberLocationConsent,
} from '../services/locationConsent';
import {
  incidents as fixtureIncidents,
  MOCK_USER_LOCATION,
} from '../test/fixtures';

const NO_INCIDENTS: RoadIncident[] = [];

type LocationState =
  'prompt' | 'loading' | 'ready' | 'later' | LocationErrorCode;

const locationMessages: Record<LocationErrorCode, string> = {
  denied:
    'ปิดสิทธิ์ตำแหน่งอยู่ เปิดสิทธิ์ในการตั้งค่า หรือเลือกพื้นที่บนแผนที่',
  timeout: 'ค้นหาตำแหน่งไม่ทันเวลา ลองอีกครั้ง หรือเลือกพื้นที่บนแผนที่',
  unavailable: 'ยังระบุตำแหน่งไม่ได้ ลองอีกครั้ง หรือเลือกพื้นที่บนแผนที่',
};

export interface NearbyScreenProps {
  demoState: DemoState;
  offline: boolean;
  /** Area chosen on the map when location is not shared. Memory only. */
  area?: AppCoordinate;
  onSelectArea: () => void;
  onClearArea: () => void;
  onViewIncident: (incident: RoadIncident) => void;
  /** Reports the loaded incident metadata so the header shows its time. */
  onIncidentMeta?: (meta: IncidentResponseMeta | undefined) => void;
}

export function NearbyScreen({
  demoState,
  offline,
  area,
  onSelectArea,
  onClearArea,
  onViewIncident,
  onIncidentMeta,
}: NearbyScreenProps) {
  const production = googleMapsConfig.enabled;
  const now = useNow();
  const [filter, setFilter] = useState<NearbyFilter>('all');
  const [selected, setSelected] = useState<NearbyIncident | null>(null);
  const [userLocation, setUserLocation] = useState<AppCoordinate>();
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>(() => {
    if (!production) return 'ready';
    const remembered = readLocationConsent();
    return remembered === 'accepted'
      ? 'loading'
      : remembered === 'later'
        ? 'later'
        : 'prompt';
  });

  async function loadLocation() {
    try {
      setUserLocation(await browserLocationService.getCurrentPosition());
      setLocationState('ready');
    } catch (error) {
      setLocationState(
        error instanceof LocationServiceError ? error.code : 'unavailable',
      );
    }
  }

  function requestLocation() {
    if (!production) return;
    setLocationState('loading');
    void loadLocation();
  }

  function allowLocation() {
    rememberLocationConsent('accepted');
    void requestLocation();
  }

  useEffect(() => {
    if (!production || area || locationState !== 'loading') return;
    let active = true;
    void browserLocationService.getCurrentPosition().then(
      (location) => {
        if (!active) return;
        setUserLocation(location);
        setLocationState('ready');
      },
      (error: unknown) => {
        if (!active) return;
        setLocationState(
          error instanceof LocationServiceError ? error.code : 'unavailable',
        );
      },
    );
    return () => {
      active = false;
    };
    // This effect only handles consent remembered before this screen mounts.
    // Button-triggered requests are handled by requestLocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, production]);

  const mockLocation =
    demoState === 'location-denied' ? undefined : MOCK_USER_LOCATION;
  const origin = area ?? (production ? userLocation : mockLocation);
  const query = useMemo(() => (origin ? nearbyQuery(origin) : null), [origin]);
  const live = useIncidents(httpIncidentService, production ? query : null);
  const hasData = production
    ? query !== null && live.resolvedQuery === query
    : true;
  const sourceIncidents = production
    ? hasData
      ? live.incidents
      : NO_INCIDENTS
    : demoState === 'nearby-empty'
      ? NO_INCIDENTS
      : fixtureIncidents;
  const feed = useMemo(
    () => (origin ? buildNearbyFeed(sourceIncidents, origin, now) : []),
    [origin, sourceIncidents, now],
  );
  const categories = useMemo(() => availableCategories(feed), [feed]);
  const activeFilter = effectiveFilter(filter, categories);
  const visible = useMemo(
    () => filterNearbyFeed(feed, activeFilter),
    [feed, activeFilter],
  );

  const locationProblem: LocationErrorCode | undefined = origin
    ? undefined
    : production
      ? locationState === 'denied' ||
        locationState === 'timeout' ||
        locationState === 'unavailable'
        ? locationState
        : undefined
      : 'denied';
  const partial = production
    ? hasData && Boolean(live.meta?.partial)
    : demoState === 'partial';
  const refreshFailed = production && live.error && hasData;
  const loadedMeta = hasData ? live.meta : undefined;
  useEffect(() => {
    if (production) onIncidentMeta?.(loadedMeta);
  }, [loadedMeta, onIncidentMeta, production]);
  const originLabel = area ? 'จากพื้นที่ที่เลือก' : 'จากตำแหน่งของคุณ';

  function content() {
    if (!origin) {
      if (production && locationState === 'prompt')
        return (
          <LocationPermissionPrompt
            onAllow={allowLocation}
            onLater={() => {
              rememberLocationConsent('later');
              setLocationState('later');
            }}
          />
        );
      if (production && locationState === 'later')
        return (
          <section className="state-card location-state">
            <span className="state-icon" aria-hidden="true">
              ⌖
            </span>
            <h2>เลือกดูเหตุการณ์ได้ภายหลัง</h2>
            <p>ใช้ตำแหน่งของคุณเมื่อพร้อม หรือเลือกพื้นที่บนแผนที่</p>
            <div>
              <button
                type="button"
                className="primary-button"
                onClick={allowLocation}
              >
                ใช้ตำแหน่งของฉัน
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onSelectArea}
              >
                เลือกพื้นที่
              </button>
            </div>
          </section>
        );
      if (locationProblem)
        return (
          <section className="state-card location-state">
            <span className="state-icon" aria-hidden="true">
              ⌖
            </span>
            <h2>ยังดูเหตุการณ์ใกล้คุณไม่ได้</h2>
            <p>{locationMessages[locationProblem]}</p>
            <div>
              <button
                type="button"
                className="primary-button"
                onClick={
                  locationProblem === 'denied'
                    ? () => setShowPermissionHelp(true)
                    : allowLocation
                }
              >
                {locationProblem === 'denied'
                  ? 'วิธีเปิดตำแหน่ง'
                  : 'ลองตำแหน่งอีกครั้ง'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onSelectArea}
              >
                เลือกพื้นที่
              </button>
            </div>
          </section>
        );
      return <LoadingCards label="กำลังค้นหาตำแหน่ง" />;
    }
    if (demoState === 'loading' || (production && !hasData && live.loading))
      return <LoadingCards />;
    if (production && !hasData && offline)
      return (
        <section className="state-card" role="status">
          <h2>คุณกำลังออฟไลน์</h2>
          <p>ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อโหลดเหตุการณ์ใกล้เคียง</p>
        </section>
      );
    if (
      (production && !hasData && live.error) ||
      (!production && demoState === 'all-unavailable')
    )
      return (
        <section className="state-card" role="alert">
          <h2>ยังโหลดรายการใกล้ฉันไม่ได้</h2>
          <p>ข้อมูลทุกแหล่งยังไม่พร้อม กรุณาลองใหม่</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void live.refresh()}
          >
            ลองใหม่
          </button>
        </section>
      );
    if (production && !hasData) return <LoadingCards />;
    if (!visible.length)
      return (
        <section className="state-card" role="status">
          <span className="state-icon" aria-hidden="true">
            ✓
          </span>
          <h2>ยังไม่พบรายงานในบริเวณนี้</h2>
          <p>
            ข้อมูลนี้ไม่ใช่การยืนยันว่าไม่มีเหตุการณ์
            ลองเลือกพื้นที่อื่นบนแผนที่
          </p>
        </section>
      );
    return (
      <ul className="incident-list" aria-label="รายการเหตุการณ์ใกล้ฉัน">
        {visible.map((item) => (
          <IncidentCard
            key={item.incident.id}
            item={item}
            now={now}
            onOpen={() => setSelected(item)}
          />
        ))}
      </ul>
    );
  }

  return (
    <main className="nearby-screen" id="main-content">
      <div className="feed-heading">
        <div>
          <h1>ใกล้ฉัน</h1>
          <p>
            เหตุการณ์ล่าสุดรอบตำแหน่งของคุณ
            {area ? ` ${originLabel}` : ''}
          </p>
        </div>
        <span className="radius-badge">ภายใน {nearbyConfig.RADIUS_KM} กม.</span>
        {area && (
          <div className="feed-origin-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onSelectArea}
            >
              เปลี่ยนพื้นที่
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                onClearArea();
                void requestLocation();
              }}
            >
              ใช้ตำแหน่งของฉัน
            </button>
          </div>
        )}
      </div>
      {feed.length > 0 && (
        <div
          className="filter-scroll"
          role="group"
          aria-label="กรองประเภทเหตุการณ์"
        >
          {(['all', ...categories] as NearbyFilter[]).map((value) => (
            <button
              type="button"
              aria-pressed={activeFilter === value}
              className={activeFilter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
              key={value}
            >
              {value === 'all' ? 'ทั้งหมด' : categoryPresentation[value].label}
            </button>
          ))}
        </div>
      )}
      {production && partial && (
        <div className="system-banner warning" role="status">
          <strong>ข้อมูลบางแหล่งยังไม่พร้อม</strong>
          <span>ผลลัพธ์อาจไม่ครบถ้วน</span>
        </div>
      )}
      {refreshFailed && (
        <div className="system-banner warning" role="status">
          <strong>อัปเดตล่าสุดไม่สำเร็จ</strong>
          <span>กำลังแสดงข้อมูลที่โหลดไว้ก่อนหน้า</span>
        </div>
      )}
      {production && origin && (
        <div className="feed-actions">
          <span>
            {live.meta && hasData
              ? `ข้อมูลเหตุการณ์ ณ ${formatClockTime(live.meta.generatedAt)} น.`
              : 'ยังไม่มีข้อมูลอัปเดต'}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={offline}
            onClick={() => void live.refresh()}
          >
            อัปเดต
          </button>
        </div>
      )}
      <p className="sr-only" role="status">
        {origin && hasData && demoState !== 'loading'
          ? `พบรายงาน ${visible.length} รายการภายใน ${nearbyConfig.RADIUS_KM} กิโลเมตร`
          : ''}
      </p>
      {content()}
      {selected && (
        <IncidentDetailSheet
          incident={selected.incident}
          now={now}
          distanceLabel={`ห่าง${originLabel}ประมาณ ${formatKilometers(selected.distanceKm)}`}
          duplicateCandidateCount={selected.duplicateCandidateIds.length}
          onClose={() => setSelected(null)}
          onViewMap={() => {
            const incident = selected.incident;
            setSelected(null);
            onViewIncident(incident);
          }}
        />
      )}
      {showPermissionHelp && (
        <LocationPermissionHelp
          onClose={() => setShowPermissionHelp(false)}
          onRetry={() => {
            setShowPermissionHelp(false);
            allowLocation();
          }}
          onSelectArea={() => {
            setShowPermissionHelp(false);
            onSelectArea();
          }}
        />
      )}
    </main>
  );
}
