import { useEffect, useRef, useState } from 'react';
import {
  categoryPresentation,
  pinSpokenLabel,
} from '../domain/incidentPresentation';
import type { IncidentPin } from '../domain/matching/routeAnalysis';
import type {
  AppBounds,
  AppCoordinate,
  RoadIncident,
  RouteOption,
} from '../domain/types';
import { googleMapsConfig } from '../services/googleMaps/config';
import { loadGoogleLibrary } from '../services/googleMaps/loader';

const BANGKOK = { lat: 13.7563, lng: 100.5018 };
const FOCUS_ZOOM = 15;

export function GoogleMapCanvas({
  routes,
  selectedRouteId,
  pins,
  selectedIncidentId,
  focus,
  now,
  showCenter,
  onBounds,
  onIncident,
}: {
  routes: RouteOption[];
  selectedRouteId?: string;
  pins: IncidentPin[];
  selectedIncidentId?: string;
  focus?: AppCoordinate;
  now: number;
  showCenter?: boolean;
  onBounds: (bounds: AppBounds) => void;
  onIncident: (incident: RoadIncident) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | undefined>(undefined);
  const lines = useRef<google.maps.Polyline[]>([]);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'config' | 'error'>(
    googleMapsConfig.apiKey ? 'loading' : 'config',
  );

  useEffect(() => {
    if (!googleMapsConfig.apiKey) {
      return;
    }
    let active = true;
    Promise.all([loadGoogleLibrary('maps'), loadGoogleLibrary('marker')])
      .then(([{ Map }]) => {
        if (!active || !host.current) return;
        map.current = new Map(host.current, {
          center: BANGKOK,
          zoom: 11,
          mapId: googleMapsConfig.mapId ?? 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        map.current.addListener('idle', () => {
          const value = map.current?.getBounds()?.toJSON();
          if (value) onBounds(value);
        });
        setState('ready');
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV)
          console.error('Google Maps load failed', error);
        if (active) setState('error');
      });
    return () => {
      active = false;
      if (map.current) google.maps.event.clearInstanceListeners(map.current);
    };
  }, [onBounds]);

  // Route polylines and camera: only when routes or the selection change.
  useEffect(() => {
    if (state !== 'ready' || !map.current) return;
    lines.current.forEach((line) => line.setMap(null));
    lines.current = routes.map((route) => {
      const selected = route.id === selectedRouteId;
      return new google.maps.Polyline({
        path: route.path.map((point) => ({
          lat: point.latitude,
          lng: point.longitude,
        })),
        map: map.current,
        strokeColor: selected ? '#1267e8' : '#8faac7',
        strokeWeight: selected ? 6 : 3,
        strokeOpacity: selected ? 1 : 0.75,
        zIndex: selected ? 2 : 1,
      });
    });
    const selected = routes.find((route) => route.id === selectedRouteId);
    if (selected?.bounds) map.current.fitBounds(selected.bounds, 48);
  }, [routes, selectedRouteId, state]);

  // Pins are replaced as a set so they always match the selected route.
  useEffect(() => {
    if (state !== 'ready' || !map.current) return;
    markers.current.forEach((marker) => (marker.map = null));
    markers.current = pins.map(({ incident, match }) => {
      const category = categoryPresentation[incident.category];
      const selected = incident.id === selectedIncidentId;
      const label = pinSpokenLabel(incident, match, now);
      const content = document.createElement('button');
      content.className = `google-incident-marker ${category.className}${selected ? ' selected' : ''}`;
      content.textContent = category.icon;
      content.type = 'button';
      content.setAttribute('aria-label', label);
      content.setAttribute('aria-pressed', String(selected));
      content.addEventListener('click', () => onIncident(incident));
      return new google.maps.marker.AdvancedMarkerElement({
        map: map.current,
        position: { lat: incident.latitude, lng: incident.longitude },
        content,
        title: label,
        zIndex: selected ? 10 : undefined,
      });
    });
  }, [now, onIncident, pins, selectedIncidentId, state]);

  useEffect(() => {
    if (state !== 'ready' || !map.current || !focus) return;
    map.current.panTo({ lat: focus.latitude, lng: focus.longitude });
    map.current.setZoom(Math.max(map.current.getZoom() ?? 0, FOCUS_ZOOM));
  }, [focus, state]);

  return (
    <section
      className="mock-map production-map"
      aria-label="แผนที่ Google แสดงเส้นทางและเหตุการณ์"
    >
      <div ref={host} className="google-map-host" />
      {showCenter && state === 'ready' && (
        <span className="map-crosshair" aria-hidden="true" />
      )}
      {state !== 'ready' && (
        <div
          className="map-error"
          role={state === 'loading' ? 'status' : 'alert'}
        >
          <strong>
            {state === 'loading'
              ? 'กำลังโหลดแผนที่…'
              : state === 'config'
                ? 'ยังไม่ได้ตั้งค่าแผนที่'
                : 'ยังเปิดแผนที่ไม่ได้'}
          </strong>
          <span>
            {state === 'config'
              ? 'เพิ่ม Google Maps API key แล้วโหลดหน้าอีกครั้ง'
              : state === 'error'
                ? 'ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'
                : 'โปรดรอสักครู่'}
          </span>
          {state !== 'loading' && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              ลองใหม่
            </button>
          )}
        </div>
      )}
    </section>
  );
}
