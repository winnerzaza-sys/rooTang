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
import { googleMapsNavigationUrl } from '../services/googleMaps/mapsUrl';
import { Icon } from './Icons';
import { LoadingCards } from './IncidentCard';

export type RouteAnalysisState = 'pending' | 'ready' | 'error' | 'offline';
type SheetLevel = 'collapsed' | 'half' | 'expanded';

interface SheetDrag {
  pointerId: number;
  startY: number;
  startHeight: number;
  currentHeight: number;
  lastY: number;
  lastTime: number;
  velocityY: number;
  moved: boolean;
}

const SHEET_LEVELS: SheetLevel[] = ['collapsed', 'half', 'expanded'];

function sheetHeights(): Record<SheetLevel, number> {
  return {
    collapsed: 130,
    half: window.innerHeight * 0.39,
    expanded: window.innerHeight * 0.76,
  };
}

interface Props {
  selectedRoute: RouteOption;
  matches: RouteIncidentMatch[];
  analysis: RouteAnalysisState;
  partial: boolean;
  /** When incident data was generated; shown so cached data is not "live". */
  dataTimeLabel?: string;
  now: number;
  onChangeRoute: () => void;
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
  selectedRoute,
  matches,
  analysis,
  partial,
  dataTimeLabel,
  now,
  onChangeRoute,
  onIncident,
  onRetry,
}: Props) {
  const [sheetLevel, setSheetLevel] = useState<SheetLevel>('half');
  const sheet = useRef<HTMLElement>(null);
  const drag = useRef<SheetDrag | undefined>(undefined);
  const suppressClick = useRef(false);

  function startDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || !sheet.current) return;
    const heights = sheetHeights();
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight:
        sheet.current.getBoundingClientRect().height || heights[sheetLevel],
      currentHeight:
        sheet.current.getBoundingClientRect().height || heights[sheetLevel],
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocityY: 0,
      moved: false,
    };
    sheet.current.classList.add('dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function updateDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId || !sheet.current)
      return;
    const distance = event.clientY - active.startY;
    if (Math.abs(distance) > 6) active.moved = true;
    const elapsed = Math.max(1, event.timeStamp - active.lastTime);
    active.velocityY = (event.clientY - active.lastY) / elapsed;
    active.lastY = event.clientY;
    active.lastTime = event.timeStamp;
    const heights = sheetHeights();
    const nextHeight = Math.max(
      heights.collapsed,
      Math.min(heights.expanded, active.startHeight - distance),
    );
    active.currentHeight = nextHeight;
    sheet.current.style.height = `${nextHeight}px`;
  }

  function finishDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId || !sheet.current)
      return;
    drag.current = undefined;
    sheet.current.classList.remove('dragging');
    if (!active.moved) {
      sheet.current.style.removeProperty('height');
      return;
    }
    const heights = sheetHeights();
    const projectedHeight = Math.max(
      heights.collapsed,
      Math.min(heights.expanded, active.currentHeight - active.velocityY * 180),
    );
    const nextLevel = SHEET_LEVELS.reduce((closest, level) =>
      Math.abs(heights[level] - projectedHeight) <
      Math.abs(heights[closest] - projectedHeight)
        ? level
        : closest,
    );
    suppressClick.current = true;
    setSheetLevel(nextLevel);
    sheet.current.style.removeProperty('height');
    window.setTimeout(() => {
      suppressClick.current = false;
    });
  }

  function cancelDrag() {
    drag.current = undefined;
    sheet.current?.classList.remove('dragging');
    sheet.current?.style.removeProperty('height');
  }

  return (
    <section
      ref={sheet}
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
        onClick={() => {
          if (suppressClick.current) return;
          setSheetLevel(sheetLevel === 'expanded' ? 'collapsed' : 'expanded');
        }}
        onPointerDown={startDrag}
        onPointerMove={updateDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
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
      <button
        type="button"
        className="change-route-button"
        onClick={onChangeRoute}
      >
        <Icon name="route" />
        เปลี่ยนเส้นทาง
      </button>
      <div
        className="route-results-body"
        aria-hidden={sheetLevel === 'collapsed'}
      >
        <a
          className="google-maps-navigation"
          href={googleMapsNavigationUrl(selectedRoute)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="route" />
          นำทางต่อใน Google Maps
        </a>
        <p className="navigation-note">
          Google Maps จะคำนวณเส้นทางใหม่โดยไม่มีจุดแวะ
        </p>
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
