import { useEffect, useRef, useState } from 'react';
import {
  categoryPresentation,
  pinSpokenLabel,
} from '../domain/incidentPresentation';
import { clusterIncidentPins } from '../domain/incidentClustering';
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

interface IncidentMarkerRecord {
  marker: google.maps.marker.AdvancedMarkerElement;
  content: HTMLButtonElement;
}

function clusterZoomLevel(zoom: number): number {
  return zoom <= 10 ? 10 : zoom <= 12 ? 12 : 13;
}

export function GoogleMapCanvas({
  routes,
  selectedRouteId,
  pins,
  selectedIncidentId,
  focus,
  currentLocation,
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
  currentLocation?: AppCoordinate;
  now: number;
  showCenter?: boolean;
  onBounds: (bounds: AppBounds) => void;
  onIncident: (incident: RoadIncident) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | undefined>(undefined);
  const lines = useRef<google.maps.Polyline[]>([]);
  const markers = useRef<Map<string, IncidentMarkerRecord>>(new Map());
  const currentLocationMarker = useRef<
    google.maps.marker.AdvancedMarkerElement | undefined
  >(undefined);
  const incidentsById = useRef(new Map<string, RoadIncident>());
  const onIncidentRef = useRef(onIncident);
  const [state, setState] = useState<'loading' | 'ready' | 'config' | 'error'>(
    googleMapsConfig.apiKey ? 'loading' : 'config',
  );
  const [clusterZoom, setClusterZoom] = useState(clusterZoomLevel(11));

  useEffect(() => {
    onIncidentRef.current = onIncident;
  }, [onIncident]);

  useEffect(() => {
    if (!googleMapsConfig.apiKey) {
      return;
    }
    let active = true;
    const markerRecords = markers.current;
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
        map.current.addListener('zoom_changed', () => {
          setClusterZoom(clusterZoomLevel(map.current?.getZoom() ?? 11));
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
      markerRecords.forEach(({ marker }) => (marker.map = null));
      markerRecords.clear();
      if (currentLocationMarker.current)
        currentLocationMarker.current.map = null;
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

  // Reconcile by stable cluster/incident keys. Google emits zoom_changed for
  // every zoom step; recreating every marker on each event causes flicker.
  useEffect(() => {
    if (state !== 'ready' || !map.current) return;
    const activeKeys = new Set<string>();
    const activeIncidentIds = new Set<string>();
    clusterIncidentPins(pins, clusterZoom).forEach((cluster) => {
      if (cluster.pins.length > 1) {
        const memberIds = cluster.pins
          .map(({ incident }) => incident.id)
          .sort()
          .join('|');
        const key = `cluster:${memberIds}`;
        activeKeys.add(key);
        const label = `กลุ่มรายงานเหตุการณ์ ${cluster.pins.length} จุด`;
        let record = markers.current.get(key);
        if (!record) {
          const content = document.createElement('button');
          content.className = 'google-incident-cluster';
          content.type = 'button';
          content.addEventListener('click', () => {
            const bounds = new google.maps.LatLngBounds();
            cluster.pins.forEach(({ incident }) =>
              bounds.extend({
                lat: incident.latitude,
                lng: incident.longitude,
              }),
            );
            map.current?.fitBounds(bounds, 72);
          });
          record = {
            content,
            marker: new google.maps.marker.AdvancedMarkerElement({
              map: map.current,
              position: { lat: cluster.latitude, lng: cluster.longitude },
              content,
              title: label,
            }),
          };
          markers.current.set(key, record);
        }
        const { content, marker } = record;
        content.textContent = String(cluster.pins.length);
        content.setAttribute('aria-label', label);
        marker.map = map.current;
        marker.position = { lat: cluster.latitude, lng: cluster.longitude };
        marker.title = label;
        return;
      }

      const { incident, match } = cluster.pins[0]!;
      incidentsById.current.set(incident.id, incident);
      activeIncidentIds.add(incident.id);
      const key = `incident:${incident.id}`;
      activeKeys.add(key);
      const category = categoryPresentation[incident.category];
      const selected = incident.id === selectedIncidentId;
      const label = pinSpokenLabel(incident, match, now);
      let record = markers.current.get(key);
      if (!record) {
        const content = document.createElement('button');
        content.type = 'button';
        content.addEventListener('click', () => {
          const currentIncident = incidentsById.current.get(incident.id);
          if (currentIncident) onIncidentRef.current(currentIncident);
        });
        record = {
          content,
          marker: new google.maps.marker.AdvancedMarkerElement({
            map: map.current,
            position: { lat: incident.latitude, lng: incident.longitude },
            content,
            title: label,
          }),
        };
        markers.current.set(key, record);
      }
      const { content, marker } = record;
      content.className = `google-incident-marker ${category.className}${selected ? ' selected' : ''}`;
      content.textContent = category.icon;
      content.setAttribute('aria-label', label);
      content.setAttribute('aria-pressed', String(selected));
      marker.map = map.current;
      marker.position = { lat: incident.latitude, lng: incident.longitude };
      marker.title = label;
      marker.zIndex = selected ? 10 : undefined;
    });

    markers.current.forEach(({ marker }, key) => {
      if (activeKeys.has(key)) return;
      marker.map = null;
      markers.current.delete(key);
    });
    incidentsById.current.forEach((_, id) => {
      if (!activeIncidentIds.has(id)) incidentsById.current.delete(id);
    });
  }, [clusterZoom, now, pins, selectedIncidentId, state]);

  useEffect(() => {
    if (state !== 'ready' || !map.current) return;
    if (!currentLocation) {
      if (currentLocationMarker.current)
        currentLocationMarker.current.map = null;
      return;
    }
    if (!currentLocationMarker.current) {
      const content = document.createElement('span');
      content.className = 'google-current-location';
      content.setAttribute('role', 'img');
      content.setAttribute('aria-label', 'ตำแหน่งปัจจุบัน');
      currentLocationMarker.current =
        new google.maps.marker.AdvancedMarkerElement({
          map: map.current,
          position: {
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
          },
          content,
          title: 'ตำแหน่งปัจจุบัน',
          zIndex: 20,
        });
    } else {
      currentLocationMarker.current.map = map.current;
      currentLocationMarker.current.position = {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      };
    }
  }, [currentLocation, state]);

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
