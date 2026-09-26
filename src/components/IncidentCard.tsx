import {
  categoryPresentation,
  DUPLICATE_COPY,
  formatKilometers,
  freshnessBadge,
  incidentTimeLabel,
  nearbySpokenLabel,
  providerLabel,
} from '../domain/incidentPresentation';
import type { NearbyIncident } from '../domain/types';

export function IncidentCard({
  item,
  now,
  onOpen,
}: {
  item: NearbyIncident;
  now: number;
  onOpen: () => void;
}) {
  const { incident, distanceKm } = item;
  const category = categoryPresentation[incident.category];
  const badge = freshnessBadge(incident, now);
  return (
    <li>
      <button
        type="button"
        className="incident-card"
        onClick={onOpen}
        aria-label={nearbySpokenLabel(incident, distanceKm, now)}
      >
        <span className={`card-icon ${category.className}`} aria-hidden="true">
          {category.icon}
        </span>
        <span className="card-copy">
          <span className="card-topline">
            <strong>{category.label}</strong>
            <b>{formatKilometers(distanceKm)}</b>
          </span>
          <span className="card-title">{incident.title}</span>
          <span className="card-meta">
            {providerLabel[incident.provider]} •{' '}
            {incidentTimeLabel(incident, now)}
          </span>
          {badge && <span className="freshness-badge">{badge}</span>}
          {item.duplicateCandidateIds.length > 0 && (
            <span className="freshness-badge neutral">{DUPLICATE_COPY}</span>
          )}
        </span>
        <span className="card-chevron" aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  );
}

export function LoadingCards({
  label = 'กำลังโหลดเหตุการณ์',
  count = 3,
}: {
  label?: string;
  count?: number;
}) {
  return (
    <div
      className="loading-list"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, item) => (
        <div className="skeleton-card" key={item}>
          <span />
          <div>
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}
