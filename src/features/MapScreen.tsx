import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatClockTime } from '../domain/incidentPresentation';
import { boundsCenter, containsCoordinate } from '../domain/geo';
import { isConfidentlyInactive } from '../domain/matching/matchRoute';
import {
  analyzeRoutes,
  routeIncidentQuery,
  selectRouteView,
} from '../domain/matching/routeAnalysis';
import type {
  AppBounds,
  AppCoordinate,
  AppPlace,
  DemoState,
  IncidentResponseMeta,
  RoadIncident,
  RouteOption,
} from '../domain/types';
import { useNow } from '../hooks/useNow';
import { mockDirectionsService } from '../services/mockServices';
import { googleDirectionsService } from '../services/googleMaps/googleDirectionsService';
import { googlePlacesService } from '../services/googleMaps/googlePlacesService';
import { googleMapsConfig } from '../services/googleMaps/config';
import {
  browserLocationService,
  LocationServiceError,
} from '../services/browserLocationService';
import { httpIncidentService } from '../services/incidents/httpIncidentService';
import { useIncidents } from '../services/incidents/useIncidents';
import {
  readLocationConsent,
  rememberLocationConsent,
} from '../services/locationConsent';
import {
  incidents as fixtureIncidents,
  MOCK_MAP_BOUNDS,
  mockRoutes,
} from '../test/fixtures';
import { Icon } from '../components/Icons';
import { IncidentDetailSheet } from '../components/IncidentDetailSheet';
import { LocationPermissionPrompt } from '../components/LocationPermissionPrompt';
import { PlaceAutocompleteField } from '../components/PlaceAutocompleteField';
import { GoogleMapCanvas } from '../components/GoogleMapCanvas';
import { MockMapCanvas } from '../components/MockMapCanvas';
import {
  RouteResults,
  type RouteAnalysisState,
} from '../components/RouteResults';

const NO_ROUTES: RouteOption[] = [];
const NO_INCIDENTS: RoadIncident[] = [];

export interface MapScreenProps {
  demoState: DemoState;
  offline: boolean;
  /** Incident requested from Nearby via "ดูตำแหน่งบนแผนที่". */
  focusIncident?: RoadIncident;
  onClearFocus: () => void;
  /** Nearby asked the user to pick an area instead of sharing location. */
  areaSelecting: boolean;
  onAreaSelected: (center: AppCoordinate) => void;
  onCancelAreaSelect: () => void;
  /** Reports the loaded incident metadata so the header shows its time. */
  onIncidentMeta?: (meta: IncidentResponseMeta | undefined) => void;
}

export function MapScreen({
  demoState,
  offline,
  focusIncident,
  onClearFocus,
  areaSelecting,
  onAreaSelected,
  onCancelAreaSelect,
  onIncidentMeta,
}: MapScreenProps) {
  const production = googleMapsConfig.enabled;
  const now = useNow();
  const [origin, setOrigin] = useState('ตำแหน่งปัจจุบัน');
  const [destination, setDestination] = useState('');
  const [routes, setRoutes] = useState<RouteOption[]>(NO_ROUTES);
  const [selectedRouteId, setSelectedRouteId] = useState<string>();
  const [selectedIncident, setSelectedIncident] = useState<RoadIncident | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [validation, setValidation] = useState('');
  const [originPlace, setOriginPlace] = useState<AppPlace>();
  const [destinationPlace, setDestinationPlace] = useState<AppPlace>();
  const [locationError, setLocationError] = useState<string>();
  const [placesError, setPlacesError] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [searchAfterLocation, setSearchAfterLocation] = useState(false);
  const [viewport, setViewport] = useState<AppBounds>({
    north: 13.95,
    south: 13.55,
    east: 100.9,
    west: 100.3,
  });
  const latestBounds = useRef<AppBounds | undefined>(undefined);
  const boundsTimer = useRef<number | undefined>(undefined);
  const onBounds = useCallback((bounds: AppBounds) => {
    latestBounds.current = bounds;
    window.clearTimeout(boundsTimer.current);
    boundsTimer.current = window.setTimeout(() => setViewport(bounds), 650);
  }, []);
  const onPlacesError = useCallback(() => setPlacesError(true), []);
  const onIncident = useCallback(
    (incident: RoadIncident) => setSelectedIncident(incident),
    [],
  );

  const forcedRouteFound =
    !production && ['no-incidents', 'partial', 'stale'].includes(demoState);
  const candidateRoutes =
    demoState === 'loading'
      ? NO_ROUTES
      : forcedRouteFound
        ? mockRoutes
        : routes;

  // With routes, incidents are requested for the padded route bounding box;
  // otherwise for the visible viewport.
  const routeQuery = useMemo(
    () => (candidateRoutes.length ? routeIncidentQuery(candidateRoutes) : null),
    [candidateRoutes],
  );
  const live = useIncidents(
    httpIncidentService,
    production && googleMapsConfig.apiKey ? (routeQuery ?? viewport) : null,
  );

  const mockIncidents =
    demoState === 'no-incidents' ? NO_INCIDENTS : fixtureIncidents;
  const routeDataReady = production
    ? routeQuery !== null && live.resolvedQuery === routeQuery
    : true;
  const matchingIncidents = production
    ? routeDataReady
      ? live.incidents
      : NO_INCIDENTS
    : mockIncidents;
  const analyzedRoutes = useMemo(
    () => analyzeRoutes(candidateRoutes, matchingIncidents, now),
    [candidateRoutes, matchingIncidents, now],
  );
  const viewportIncidents = useMemo(
    () =>
      (production ? live.incidents : mockIncidents).filter(
        (incident) =>
          !isConfidentlyInactive(incident, now) &&
          (production || containsCoordinate(MOCK_MAP_BOUNDS, incident)),
      ),
    [live.incidents, mockIncidents, now, production],
  );
  const view = useMemo(
    () => selectRouteView(analyzedRoutes, selectedRouteId, viewportIncidents),
    [analyzedRoutes, selectedRouteId, viewportIncidents],
  );
  const pins = useMemo(
    () =>
      focusIncident &&
      !view.pins.some((pin) => pin.incident.id === focusIncident.id)
        ? [...view.pins, { incident: focusIncident }]
        : view.pins,
    [focusIncident, view.pins],
  );

  const analysis: RouteAnalysisState = !production
    ? 'ready'
    : routeDataReady
      ? 'ready'
      : live.error
        ? 'error'
        : offline
          ? 'offline'
          : 'pending';
  const partial = production && Boolean(live.meta?.partial);
  useEffect(() => {
    if (production) onIncidentMeta?.(live.meta);
  }, [live.meta, onIncidentMeta, production]);

  async function performRouteSearch(
    resolvedOrigin: AppPlace,
    resolvedDestination: AppPlace,
  ) {
    setSearching(true);
    try {
      const result = await googleDirectionsService.computeRoutes({
        origin: resolvedOrigin,
        destination: resolvedDestination,
      });
      if (!result.routes.length) {
        setValidation('ไม่พบเส้นทาง ลองตรวจสอบต้นทางหรือปลายทาง');
        return;
      }
      setRoutes(result.routes);
      setSelectedRouteId(result.routes[0]?.id);
      onClearFocus();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Route search failed', error);
      setValidation('ยังค้นหาเส้นทางไม่ได้ กรุณาลองใหม่');
    } finally {
      setSearching(false);
    }
  }

  async function searchRoutes() {
    if (production && !destinationPlace) {
      setValidation('กรุณาเลือกปลายทางจากรายการสถานที่');
      return;
    }
    if (!production && (!origin.trim() || !destination.trim())) {
      setValidation('กรุณาระบุต้นทางและปลายทาง');
      return;
    }
    if (production && !originPlace) {
      setValidation('');
      if (readLocationConsent() === 'accepted') {
        const place = await requestCurrentLocation();
        if (place && destinationPlace)
          await performRouteSearch(place, destinationPlace);
        return;
      }
      setSearchAfterLocation(true);
      setShowLocationPrompt(true);
      return;
    }
    setValidation('');
    setSearching(true);
    try {
      const result = production
        ? await googleDirectionsService.computeRoutes({
            origin: originPlace!,
            destination: destinationPlace!,
          })
        : await mockDirectionsService.computeRoutes({
            origin: { latitude: 13.66, longitude: 100.42 },
            destination: { latitude: 13.735, longitude: 100.495 },
          });
      if (!result.routes.length) {
        setValidation('ไม่พบเส้นทาง ลองตรวจสอบต้นทางหรือปลายทาง');
        return;
      }
      setRoutes(result.routes);
      setSelectedRouteId(result.routes[0]?.id);
      onClearFocus();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Route search failed', error);
      setValidation('ยังค้นหาเส้นทางไม่ได้ กรุณาลองใหม่');
    } finally {
      setSearching(false);
    }
  }

  async function requestCurrentLocation(): Promise<AppPlace | undefined> {
    try {
      const coordinate = await browserLocationService.getCurrentPosition();
      const place = {
        placeId: '',
        label: 'ตำแหน่งปัจจุบัน',
        coordinate,
      };
      setOriginPlace(place);
      setLocationError(undefined);
      return place;
    } catch (error) {
      const code =
        error instanceof LocationServiceError ? error.code : 'unavailable';
      setLocationError(
        code === 'denied'
          ? 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง คุณยังเลือกต้นทางได้'
          : code === 'timeout'
            ? 'ค้นหาตำแหน่งไม่ทันเวลา กรุณาลองใหม่'
            : 'ยังระบุตำแหน่งไม่ได้',
      );
      return undefined;
    }
  }

  function confirmArea() {
    const bounds = production
      ? (latestBounds.current ?? viewport)
      : MOCK_MAP_BOUNDS;
    onAreaSelected(boundsCenter(bounds));
  }

  function useCurrentLocation() {
    if (!production) return;
    setSearchAfterLocation(false);
    if (readLocationConsent() === 'accepted') void requestCurrentLocation();
    else setShowLocationPrompt(true);
  }

  const selectedMatch = selectedIncident
    ? view.matches.find((item) => item.incident.id === selectedIncident.id)
    : undefined;

  return (
    <main className="map-screen" id="main-content">
      <button
        type="button"
        className="map-top-locate"
        aria-label="ใช้ตำแหน่งปัจจุบัน"
        onClick={useCurrentLocation}
      >
        <Icon name="locate" />
      </button>
      <section className="route-panel" aria-label="ค้นหาเส้นทาง">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void searchRoutes();
          }}
        >
          {production ? (
            <>
              <PlaceAutocompleteField
                label="ต้นทาง"
                placeholder="ค้นหาต้นทางอื่น"
                initialValue="ตำแหน่งปัจจุบัน"
                service={googlePlacesService}
                onSelect={setOriginPlace}
                onError={onPlacesError}
              />
              <PlaceAutocompleteField
                label="ปลายทาง"
                placeholder="ต้องการไปที่ไหน"
                service={googlePlacesService}
                onSelect={setDestinationPlace}
                onError={onPlacesError}
              />
              {originPlace && (
                <p className="selected-place">ต้นทาง: {originPlace.label}</p>
              )}
              {destinationPlace && (
                <p className="selected-place">
                  ปลายทาง: {destinationPlace.label}
                </p>
              )}
              {placesError && (
                <p className="field-error" role="alert">
                  ยังค้นหาสถานที่ไม่ได้ กรุณาลองใหม่
                </p>
              )}
              {locationError && (
                <p className="field-error" role="status">
                  {locationError}
                </p>
              )}
            </>
          ) : (
            <>
              <label className="route-field origin-field">
                <span>ต้นทาง</span>
                <span className="input-wrap">
                  <Icon name="locate" />
                  <input
                    value={origin}
                    onChange={(event) => setOrigin(event.target.value)}
                    aria-label="ต้นทาง"
                  />
                </span>
              </label>
              <label className="route-field destination-field">
                <span>ปลายทาง</span>
                <span className="input-wrap">
                  <Icon name="pin" />
                  <input
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    aria-label="ปลายทาง"
                    placeholder="จะไปที่ไหน?"
                  />
                </span>
              </label>
            </>
          )}
          {validation && (
            <p className="field-error" role="alert">
              {validation}
            </p>
          )}
          {(production ? destinationPlace : destination.trim()) && (
            <button
              className="primary-button"
              type="submit"
              disabled={searching || offline}
            >
              {searching || demoState === 'loading'
                ? 'กำลังค้นหาเส้นทาง…'
                : 'ค้นหาเส้นทาง'}
            </button>
          )}
          {production && (
            <button
              type="button"
              className="secondary-button incident-refresh"
              disabled={offline}
              onClick={() => void live.refresh()}
            >
              <Icon name="refresh" />
              อัปเดตเหตุการณ์
            </button>
          )}
          {production && live.meta && (
            <p className="selected-place">
              ข้อมูลเหตุการณ์ ณ {formatClockTime(live.meta.generatedAt)} น.
            </p>
          )}
        </form>
        {view.selectedRoute && !areaSelecting && (
          <RouteResults
            routes={analyzedRoutes}
            selectedRoute={view.selectedRoute}
            matches={view.matches}
            analysis={analysis}
            partial={partial}
            dataTimeLabel={
              production && live.meta
                ? `ข้อมูลเหตุการณ์ ณ ${formatClockTime(live.meta.generatedAt)} น. ไม่ใช่ข้อมูลสด`
                : undefined
            }
            now={now}
            onSelect={setSelectedRouteId}
            onIncident={setSelectedIncident}
            onRetry={() => void live.refresh()}
          />
        )}
      </section>

      {production ? (
        <GoogleMapCanvas
          routes={analyzedRoutes}
          selectedRouteId={view.selectedRoute?.id}
          pins={pins}
          selectedIncidentId={selectedIncident?.id ?? focusIncident?.id}
          focus={focusIncident}
          now={now}
          showCenter={areaSelecting}
          onBounds={onBounds}
          onIncident={onIncident}
        />
      ) : (
        <MockMapCanvas
          bounds={MOCK_MAP_BOUNDS}
          routes={analyzedRoutes}
          selectedRouteId={view.selectedRoute?.id}
          pins={pins}
          selectedIncidentId={selectedIncident?.id ?? focusIncident?.id}
          now={now}
          error={demoState === 'map-error'}
          showCenter={areaSelecting}
          onIncident={onIncident}
        />
      )}
      {areaSelecting ? (
        <section className="route-toast area-select" aria-label="เลือกพื้นที่">
          <strong>เลือกพื้นที่สำหรับดูเหตุการณ์ใกล้เคียง</strong>
          <span>
            เลื่อนแผนที่ให้พื้นที่ที่ต้องการอยู่กลางจอ แล้วกดใช้พื้นที่นี้
          </span>
          <div className="toast-actions">
            <button
              type="button"
              className="primary-button"
              onClick={confirmArea}
            >
              ใช้พื้นที่นี้
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onCancelAreaSelect}
            >
              ยกเลิก
            </button>
          </div>
        </section>
      ) : focusIncident ? (
        <div className="route-toast info-toast" role="status">
          <strong>ตำแหน่งรายงานที่เลือก</strong>
          <span>{focusIncident.title}</span>
          <button type="button" className="text-button" onClick={onClearFocus}>
            ซ่อนตำแหน่งนี้
          </button>
        </div>
      ) : null}
      {production && partial && !view.selectedRoute && (
        <div className="route-toast partial-toast" role="status">
          <strong>ข้อมูลบางแหล่งยังไม่พร้อม</strong>
          <span>ผลลัพธ์อาจไม่ครบถ้วน</span>
          <button
            type="button"
            className="text-button"
            onClick={() => void live.refresh()}
          >
            ลองใหม่
          </button>
        </div>
      )}
      {production && live.error && !view.selectedRoute && (
        <div className="route-toast" role="alert">
          <strong>ยังโหลดข้อมูลเหตุการณ์ไม่ได้</strong>
          <button
            type="button"
            className="text-button"
            onClick={() => void live.refresh()}
          >
            ลองใหม่
          </button>
        </div>
      )}
      {demoState === 'route-not-found' && (
        <div className="route-toast" role="alert">
          <strong>ไม่พบเส้นทาง</strong>
          <span>ลองตรวจสอบต้นทางหรือปลายทางอีกครั้ง</span>
        </div>
      )}
      {selectedIncident && (
        <IncidentDetailSheet
          incident={selectedIncident}
          now={now}
          match={selectedMatch}
          duplicateCandidateCount={selectedMatch?.duplicateCandidateIds.length}
          onClose={() => setSelectedIncident(null)}
        />
      )}
      {showLocationPrompt && (
        <LocationPermissionPrompt
          mode="dialog"
          onAllow={() => {
            rememberLocationConsent('accepted');
            setShowLocationPrompt(false);
            void requestCurrentLocation().then((place) => {
              if (place && searchAfterLocation && destinationPlace)
                void performRouteSearch(place, destinationPlace);
              setSearchAfterLocation(false);
            });
          }}
          onLater={() => {
            rememberLocationConsent('later');
            setShowLocationPrompt(false);
            setSearchAfterLocation(false);
          }}
        />
      )}
    </main>
  );
}
