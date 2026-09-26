import { useRef, useState } from 'react';
import {
  categoryPresentation,
  DUPLICATE_COPY,
  freshnessBadge,
  incidentTimeLabel,
  PARALLEL_ROAD_COPY,
  providerLabel,
  routeMatchSpokenLabel,
  routeProgressLabel,
  routeProximityLabel,
} from '../domain/incidentPresentation';
import type {
  RoadIncident,
  RouteIncidentMatch,
  RouteOption,
} from '../domain/types';
import {
  formatRouteDistance,
  formatRouteDuration,
} from '../services/googleMaps/routeConversion';
import { LoadingCards } from './IncidentCard';

export type RouteAnalysisState = 'pending' | 'ready' | 'error' | 'offline';
type SheetLevel = 'collapsed' | 'half' | 'expanded';

interface Props {
  routes: RouteOption[];
  selectedRoute: RouteOption;
  matches: RouteIncidentMatch[];
  analysis: RouteAnalysisState;
  partial: boolean;
  /** When incident data was generated; shown so cached data is not "live". */
  dataTimeLabel?: string;
  now: number;
  onSelect: (id: string) => void;
  onIncident: (incident: RoadIncident) => void;
  onRetry: () => void;
}

function countLabel(analysis: RouteAnalysisState, count: number): string {
  if (analysis === 'pending') return 'กำลังตรวจสอบรายงานใกล้เส้นทาง…';
  if (analysis !== 'ready') return 'ยังตรวจสอบรายงานใกล้เส้นทางไม่ได้';
  return count
    ? `พบรายงานเหตุการณ์ใกล้เส้นทาง ${count} จุด`
    : 'ยังไม่พบรายงานใกล้เส้นทาง';
}

export function RouteResults({
  routes,
  selectedRoute,
  matches,
  analysis,
  partial,
  dataTimeLabel,
  now,
  onSelect,
  onIncident,
  onRetry,
}: Props) {
  const [sheetLevel, setSheetLevel] = useState<SheetLevel>('half');
  const dragStart = useRef<number | undefined>(undefined);

  function moveSheet(direction: 'up' | 'down') {
    const levels: SheetLevel[] = ['collapsed', 'half', 'expanded'];
    const index = levels.indexOf(sheetLevel);
    const next = direction === 'up' ? index + 1 : index - 1;
    setSheetLevel(levels[Math.max(0, Math.min(levels.length - 1, next))]!);
  }

  return (
    <section
      className={`route-results ${sheetLevel}`}
      aria-label="ผลการค้นหาเส้นทาง"
    >
      <button
        type="button"
        className="sheet-handle-button"
        aria-label={
          sheetLevel === 'expanded'
            ? 'ย่อรายละเอียดเส้นทาง'
            : 'ขยายรายละเอียดเส้นทาง'
        }
        aria-expanded={sheetLevel === 'expanded'}
        onClick={() =>
          setSheetLevel(sheetLevel === 'expanded' ? 'collapsed' : 'expanded')
        }
        onPointerDown={(event) => {
          dragStart.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          if (dragStart.current === undefined) return;
          const distance = event.clientY - dragStart.current;
          dragStart.current = undefined;
          if (Math.abs(distance) >= 24) moveSheet(distance < 0 ? 'up' : 'down');
        }}
      >
        <span className="sheet-handle" aria-hidden="true" />
      </button>
      <div className="route-summary" aria-live="polite">
        <div>
          <strong>{formatRouteDuration(selectedRoute.durationMinutes)}</strong>
          <span>{formatRouteDistance(selectedRoute.distanceKm)}</span>
        </div>
        <p>{countLabel(analysis, matches.length)}</p>
      </div>
      <div className="route-results-body" hidden={sheetLevel === 'collapsed'}>
        <div
          className="route-options"
          role="radiogroup"
          aria-label="เลือกเส้นทาง"
          onKeyDown={(event) => {
            const step = {
              ArrowRight: 1,
              ArrowDown: 1,
              ArrowLeft: -1,
              ArrowUp: -1,
            }[event.key];
            if (!step || routes.length < 2) return;
            event.preventDefault();
            const index = routes.findIndex(
              (route) => route.id === selectedRoute.id,
            );
            const next =
              routes[(index + step + routes.length) % routes.length]!;
            onSelect(next.id);
            event.currentTarget
              .querySelector<HTMLElement>(`[data-route-id="${next.id}"]`)
              ?.focus();
          }}
        >
          {routes.map((route) => {
            const selected = route.id === selectedRoute.id;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                // Radio pattern: one tab stop, arrow keys move the selection.
                tabIndex={selected ? 0 : -1}
                data-route-id={route.id}
                className={selected ? 'active' : ''}
                key={route.id}
                onClick={() => onSelect(route.id)}
              >
                <strong>{route.label}</strong>
                <span>
                  {formatRouteDuration(route.durationMinutes)} •{' '}
                  {formatRouteDistance(route.distanceKm)}
                </span>
                {route.extraMinutes ? (
                  <small>ช้ากว่า {route.extraMinutes} นาที</small>
                ) : null}
                {analysis === 'ready' && (
                  <small>
                    {route.matches.length
                      ? `พบ ${route.matches.length} รายงาน`
                      : 'ยังไม่พบรายงาน'}
                  </small>
                )}
              </button>
            );
          })}
        </div>
        <h2>สิ่งที่อาจพบตามเส้นทาง</h2>
        {partial && analysis === 'ready' && (
          <p className="inline-warning" role="status">
            <strong>ข้อมูลบางแหล่งยังไม่พร้อม</strong> ผลลัพธ์อาจไม่ครบถ้วน
          </p>
        )}
        <Findings
          analysis={analysis}
          matches={matches}
          now={now}
          onIncident={onIncident}
          onRetry={onRetry}
        />
        {dataTimeLabel && analysis === 'ready' && (
          <p className="data-time">{dataTimeLabel}</p>
        )}
      </div>
    </section>
  );
}

function Findings({
  analysis,
  matches,
  now,
  onIncident,
  onRetry,
}: Pick<Props, 'analysis' | 'matches' | 'now' | 'onIncident' | 'onRetry'>) {
  if (analysis === 'pending')
    return <LoadingCards label="กำลังตรวจสอบรายงานใกล้เส้นทาง" count={2} />;
  if (analysis === 'offline')
    return (
      <div className="empty-copy" role="status">
        <strong>ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อตรวจสอบรายงานตามเส้นทาง</strong>
        <p>ยังไม่มีข้อมูลเหตุการณ์สำหรับเส้นทางนี้</p>
      </div>
    );
  if (analysis === 'error')
    return (
      <div className="empty-copy" role="alert">
        <strong>ยังตรวจสอบรายงานเหตุการณ์ตามเส้นทางไม่ได้</strong>
        <p>ผลนี้ไม่ได้หมายความว่าไม่มีเหตุการณ์บนเส้นทาง</p>
        <button type="button" className="text-button" onClick={onRetry}>
          ลองใหม่
        </button>
      </div>
    );
  if (!matches.length)
    return (
      <div className="empty-copy">
        <strong>ยังไม่พบรายงานเหตุการณ์ใกล้เส้นทางนี้</strong>
        <p>ข้อมูลนี้ไม่ใช่การยืนยันว่าเส้นทางปลอดภัยหรือผ่านได้แน่นอน</p>
      </div>
    );
  return (
    <ol className="findings-list" aria-label="รายงานใกล้เส้นทางตามลำดับที่จะพบ">
      {matches.map((match) => {
        const { incident } = match;
        const item = categoryPresentation[incident.category];
        const badge = freshnessBadge(incident, now);
        return (
          <li key={incident.id}>
            <button
              type="button"
              aria-label={routeMatchSpokenLabel(match, now)}
              onClick={() => onIncident(incident)}
            >
              <span
                className={`finding-icon ${item.className}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>
                <span className="finding-topline">
                  <strong>{item.label}</strong>
                  <b>{routeProgressLabel(match)}</b>
                </span>
                <small>
                  {routeProximityLabel(match)} •{' '}
                  {providerLabel[incident.provider]} •{' '}
                  {incidentTimeLabel(incident, now)}
                </small>
                {match.possibleParallelRoad && (
                  <span className="freshness-badge neutral">
                    {PARALLEL_ROAD_COPY}
                  </span>
                )}
                {match.duplicateCandidateIds.length > 0 && (
                  <span className="freshness-badge neutral">
                    {DUPLICATE_COPY}
                  </span>
                )}
                {badge && <span className="freshness-badge">{badge}</span>}
              </span>
              <span aria-hidden="true">›</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
