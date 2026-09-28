import { containsCoordinate } from '../domain/geo';
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
import { Icon } from './Icons';

function project(bounds: AppBounds, point: AppCoordinate) {
  return {
    x: ((point.longitude - bounds.west) / (bounds.east - bounds.west)) * 100,
    y: ((bounds.north - point.latitude) / (bounds.north - bounds.south)) * 100,
  };
}

/** Deterministic stand-in for Google Maps used in mock mode and tests. */
export function MockMapCanvas({
  bounds,
  routes,
  selectedRouteId,
  pins,
  selectedIncidentId,
  currentLocation,
  now,
  error,
  showCenter,
  onIncident,
}: {
  bounds: AppBounds;
  routes: RouteOption[];
  selectedRouteId?: string;
  pins: IncidentPin[];
  selectedIncidentId?: string;
  currentLocation?: AppCoordinate;
  now: number;
  error?: boolean;
  showCenter?: boolean;
  onIncident: (incident: RoadIncident) => void;
}) {
  return (
    <section
      className="mock-map"
      aria-label="แผนที่จำลองแสดงเส้นทางและเหตุการณ์"
    >
      <div className="map-grid" />
      {error ? (
        <div className="map-error" role="alert">
          <strong>ยังเปิดแผนที่ไม่ได้</strong>
          <span>ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</span>
          <button type="button" className="secondary-button">
            <Icon name="refresh" />
            ลองใหม่
          </button>
        </div>
      ) : (
        <>
          {routes.map((route) => (
            <svg
              key={route.id}
              className={`route-line ${route.id === selectedRouteId ? 'selected' : ''}`}
              data-route-id={route.id}
              data-selected={route.id === selectedRouteId}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                points={route.path
                  .map((point) => project(bounds, point))
                  .map(({ x, y }) => `${x},${y}`)
                  .join(' ')}
              />
            </svg>
          ))}
          {pins
            .filter(({ incident }) => containsCoordinate(bounds, incident))
            .map(({ incident, match }) => {
              const category = categoryPresentation[incident.category];
              const { x, y } = project(bounds, incident);
              const selected = incident.id === selectedIncidentId;
              return (
                <button
                  key={incident.id}
                  type="button"
                  className={`map-marker ${category.className} ${selected ? 'selected' : ''}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-label={pinSpokenLabel(incident, match, now)}
                  aria-pressed={selected}
                  onClick={() => onIncident(incident)}
                >
                  <span aria-hidden="true">{category.icon}</span>
                </button>
              );
            })}
          {currentLocation && containsCoordinate(bounds, currentLocation) && (
            <span
              className="mock-current-location"
              style={{
                left: `${project(bounds, currentLocation).x}%`,
                top: `${project(bounds, currentLocation).y}%`,
              }}
              role="img"
              aria-label="ตำแหน่งปัจจุบัน"
            />
          )}
          <div className="map-label label-one">ถนนพระราม 2</div>
          <div className="map-label label-two">ถนนกัลปพฤกษ์</div>
          {showCenter && <span className="map-crosshair" aria-hidden="true" />}
        </>
      )}
    </section>
  );
}
