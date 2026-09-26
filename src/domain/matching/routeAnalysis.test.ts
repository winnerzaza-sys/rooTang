import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, incidents, mockRoutes } from '../../test/fixtures';
import { containsCoordinate } from '../geo';
import {
  analyzeRoutes,
  routeIncidentQuery,
  selectRouteView,
} from './routeAnalysis';

const analyzed = analyzeRoutes(mockRoutes, incidents, FIXTURE_NOW);
const ids = (items: Array<{ incident: { id: string } }>) =>
  items.map((item) => item.incident.id);

describe('route analysis', () => {
  it('matches fixture incidents to each route in encounter order', () => {
    expect(ids(analyzed[0]!.matches)).toEqual([
      'longdo:flood-01',
      'traffy:flood-07',
      'longdo:accident-02',
      'traffy:road-03',
    ]);
    expect(ids(analyzed[1]!.matches)).toEqual([
      'traffy:construction-04',
      'longdo:breakdown-05',
      'traffy:obstruction-06',
    ]);
    for (const route of analyzed) {
      const progress = route.matches.map((m) => m.distanceFromStartMeters);
      expect(progress).toEqual([...progress].sort((a, b) => a - b));
    }
  });

  it('excludes the expired report and the parallel-road road damage', () => {
    const all = analyzed.flatMap((route) => ids(route.matches));
    expect(all).not.toContain('longdo:accident-09');
    expect(all).not.toContain('traffy:road-08');
  });

  it('flags the frontage-road breakdown as a possible parallel road', () => {
    const breakdown = analyzed[1]!.matches.find(
      (match) => match.incident.id === 'longdo:breakdown-05',
    );
    expect(breakdown?.possibleParallelRoad).toBe(true);
  });

  it('does not mutate the input routes', () => {
    expect(mockRoutes.every((route) => route.matches.length === 0)).toBe(true);
  });

  it('requests incidents for the padded union of all route paths', () => {
    const query = routeIncidentQuery(mockRoutes)!;
    for (const route of mockRoutes)
      for (const point of route.path)
        expect(containsCoordinate(query, point)).toBe(true);
    expect(query.north).toBeGreaterThan(13.735);
    expect(routeIncidentQuery([])).toBeUndefined();
  });
});

describe('selected route view', () => {
  it('shows viewport incidents before any route exists', () => {
    const view = selectRouteView([], undefined, incidents);
    expect(view.selectedRoute).toBeUndefined();
    expect(view.pins).toHaveLength(incidents.length);
  });

  it('shows only incidents associated with the selected route', () => {
    const view = selectRouteView(analyzed, 'route-primary', incidents);
    expect(view.selectedRoute?.id).toBe('route-primary');
    expect(ids(view.pins)).toEqual(ids(view.matches));
    expect(ids(view.pins)).not.toContain('traffy:construction-04');
    expect(view.incidentCount).toBe(4);
    expect(
      view.pins.every((pin) => pin.match?.routeId === 'route-primary'),
    ).toBe(true);
  });

  it('changes route, pins, count and findings together', () => {
    const primary = selectRouteView(analyzed, 'route-primary', incidents);
    const alternative = selectRouteView(
      analyzed,
      'route-alternative',
      incidents,
    );
    expect(alternative.selectedRoute?.durationMinutes).toBe(49);
    expect(alternative.selectedRoute?.distanceKm).toBe(12.7);
    expect(alternative.incidentCount).toBe(3);
    expect(ids(alternative.matches)).toEqual(ids(alternative.pins));
    expect(
      ids(alternative.pins).filter((id) => ids(primary.pins).includes(id)),
    ).toEqual([]);
  });

  it('falls back to the first route for an unknown selection', () => {
    expect(selectRouteView(analyzed, 'missing', []).selectedRoute?.id).toBe(
      'route-primary',
    );
  });
});
