import { useEffect, useRef } from 'react';
import {
  categoryPresentation,
  DUPLICATE_COPY,
  freshnessBadge,
  incidentAbsoluteTime,
  incidentTimeLabel,
  PARALLEL_ROAD_COPY,
  providerLabel,
  routeProgressLabel,
  routeProximityLabel,
} from '../domain/incidentPresentation';
import type { RoadIncident, RouteIncidentMatch } from '../domain/types';
import { Icon } from './Icons';

interface Props {
  incident: RoadIncident;
  now: number;
  match?: RouteIncidentMatch;
  /** e.g. "ห่างจากตำแหน่งของคุณประมาณ 1.2 กม." for the Nearby feed. */
  distanceLabel?: string;
  duplicateCandidateCount?: number;
  onClose: () => void;
  onViewMap?: () => void;
}

/** Modal focus containment: Tab and Shift+Tab wrap inside the sheet. */
function keepFocusInside(
  container: HTMLElement,
  event: { shiftKey: boolean; preventDefault: () => void },
) {
  const focusable = [
    ...container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export function IncidentDetailSheet({
  incident,
  now,
  match,
  distanceLabel,
  duplicateCandidateCount = 0,
  onClose,
  onViewMap,
}: Props) {
  const category = categoryPresentation[incident.category];
  const closeButton = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const badge = freshnessBadge(incident, now);
  const absoluteTime = incidentAbsoluteTime(incident);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButton.current?.focus();
    return () => previous?.focus();
  }, []);

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        ref={sheet}
        className="detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-detail-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
          if (event.key === 'Tab' && sheet.current)
            keepFocusInside(sheet.current, event);
        }}
      >
        <button
          ref={closeButton}
          type="button"
          className="icon-button sheet-close"
          aria-label="ปิดรายละเอียดเหตุการณ์"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <div className={`category-badge ${category.className}`}>
          <span aria-hidden="true">{category.icon}</span>
          {category.label}
        </div>
        <h2 id="incident-detail-title">{incident.title}</h2>
        {incident.description && <p>{incident.description}</p>}
        {match && (
          <p className="relation">
            {routeProximityLabel(match)} • {routeProgressLabel(match)}
          </p>
        )}
        {distanceLabel && <p className="relation">{distanceLabel}</p>}
        {match?.possibleParallelRoad && (
          <p className="caution-note">{PARALLEL_ROAD_COPY}</p>
        )}
        {duplicateCandidateCount > 0 && (
          <p className="caution-note">{DUPLICATE_COPY}</p>
        )}
        <p className="uncertainty-note">
          ตำแหน่งใกล้เส้นทางหรือใกล้คุณไม่ได้ยืนยันว่าเหตุการณ์อยู่บนถนนหรือทิศทางเดียวกัน
        </p>
        <div className="detail-meta">
          <span>แหล่งข้อมูล: {providerLabel[incident.provider]}</span>
          <span>
            {incidentTimeLabel(incident, now)}
            {absoluteTime && ` (${absoluteTime})`}
          </span>
          {badge && <span className="freshness-badge">{badge}</span>}
        </div>
        {onViewMap && (
          <button type="button" className="primary-button" onClick={onViewMap}>
            ดูตำแหน่งบนแผนที่
          </button>
        )}
      </section>
    </div>
  );
}
