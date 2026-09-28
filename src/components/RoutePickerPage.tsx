import { useEffect } from 'react';
import type { RouteOption } from '../domain/types';
import {
  formatRouteDistance,
  formatRouteDuration,
} from '../services/googleMaps/routeConversion';
import { Icon } from './Icons';
import type { RouteAnalysisState } from './RouteResults';

interface Props {
  routes: RouteOption[];
  originLabel: string;
  destinationLabel: string;
  analysis: RouteAnalysisState;
  onBack: () => void;
  onSelect: (id: string) => void;
}

function reportLabel(route: RouteOption, analysis: RouteAnalysisState) {
  if (analysis === 'pending') return 'กำลังตรวจสอบรายงานใกล้เส้นทาง';
  if (analysis !== 'ready') return 'ยังตรวจสอบรายงานใกล้เส้นทางไม่ได้';
  return route.matches.length
    ? `พบ ${route.matches.length} รายงานใกล้เส้นทาง`
    : 'ยังไม่พบรายงานใกล้เส้นทาง';
}

export function RoutePickerPage({
  routes,
  originLabel,
  destinationLabel,
  analysis,
  onBack,
  onSelect,
}: Props) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onBack]);

  return (
    <section
      className="route-picker-page"
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-picker-title"
    >
      <header className="route-picker-header">
        <button
          type="button"
          className="route-picker-back"
          aria-label="กลับไปแก้ไขการค้นหา"
          onClick={onBack}
        >
          ‹
        </button>
        <h1 id="route-picker-title">เลือกเส้นทาง</h1>
      </header>

      <div className="route-picker-trip" aria-label="ต้นทางและปลายทาง">
        <span className="route-picker-trip-icon" aria-hidden="true">
          <Icon name="route" />
        </span>
        <div>
          <p>
            <small>ต้นทาง</small>
            <strong>{originLabel}</strong>
          </p>
          <p>
            <small>ปลายทาง</small>
            <strong>{destinationLabel}</strong>
          </p>
        </div>
      </div>

      <div className="route-picker-content">
        <p className="route-picker-intro">เลือกเส้นทางที่ต้องการแสดงบนแผนที่</p>
        <div className="route-picker-list">
          {routes.map((route, index) => (
            <button
              type="button"
              className="route-choice"
              key={route.id}
              autoFocus={index === 0}
              onClick={() => onSelect(route.id)}
              aria-label={`เลือก${route.label} ${formatRouteDuration(route.durationMinutes)} ${formatRouteDistance(route.distanceKm)}`}
            >
              <span className="route-choice-main">
                <span>
                  <strong>{route.label}</strong>
                  {!route.extraMinutes && <small>เร็วที่สุด</small>}
                </span>
                <b>{formatRouteDuration(route.durationMinutes)}</b>
              </span>
              <span className="route-choice-meta">
                <span>{formatRouteDistance(route.distanceKm)}</span>
                {route.extraMinutes ? (
                  <span>ช้ากว่า {route.extraMinutes} นาที</span>
                ) : null}
              </span>
              <span className="route-choice-reports">
                {reportLabel(route, analysis)}
              </span>
              <span className="route-choice-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
