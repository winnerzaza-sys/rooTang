import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, incidents, MOCK_USER_LOCATION } from '../test/fixtures';
import { haversineDistanceKm } from './geo';
import {
  availableCategories,
  buildNearbyFeed,
  effectiveFilter,
  filterNearbyFeed,
  nearbyQuery,
} from './nearby';

const feed = buildNearbyFeed(incidents, MOCK_USER_LOCATION, FIXTURE_NOW);

describe('Nearby feed', () => {
  it('sorts incidents from nearest to farthest by Haversine distance', () => {
    const distances = feed.map((item) => item.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    for (const item of feed)
      expect(item.distanceKm).toBeCloseTo(
        haversineDistanceKm(MOCK_USER_LOCATION, item.incident),
        9,
      );
    expect(feed[0]?.incident.id).toBe('longdo:accident-02');
  });

  it('keeps incidents within 10 km only', () => {
    expect(feed.every((item) => item.distanceKm <= 10)).toBe(true);
    expect(feed.map((item) => item.incident.id)).not.toContain(
      'longdo:fire-10',
    );
    const wider = buildNearbyFeed(
      incidents,
      MOCK_USER_LOCATION,
      FIXTURE_NOW,
      50,
    );
    expect(wider.map((item) => item.incident.id)).toContain('longdo:fire-10');
  });

  it('drops confidently expired or resolved reports', () => {
    expect(feed.map((item) => item.incident.id)).not.toContain(
      'longdo:accident-09',
    );
  });

  it('does not depend on input order', () => {
    const reversed = buildNearbyFeed(
      [...incidents].reverse(),
      MOCK_USER_LOCATION,
      FIXTURE_NOW,
    );
    expect(reversed.map((item) => item.incident.id)).toEqual(
      feed.map((item) => item.incident.id),
    );
  });

  it('builds filters only from categories actually returned', () => {
    expect(availableCategories(feed)).toEqual([
      'flood',
      'accident',
      'vehicle_breakdown',
      'road_damage',
      'construction',
      'obstruction',
    ]);
    expect(availableCategories([])).toEqual([]);
  });

  it('filters by category and keeps distance order', () => {
    const floods = filterNearbyFeed(feed, 'flood');
    expect(floods.map((item) => item.incident.id)).toEqual([
      'traffy:flood-07',
      'longdo:flood-01',
    ]);
    expect(filterNearbyFeed(feed, 'all')).toBe(feed);
    expect(filterNearbyFeed(feed, 'rain')).toEqual([]);
  });

  it('falls back to "all" when a selected category disappears', () => {
    expect(effectiveFilter('rain', availableCategories(feed))).toBe('all');
    expect(effectiveFilter('flood', availableCategories(feed))).toBe('flood');
  });

  it('marks nearby duplicate candidates without removing them', () => {
    const flood = feed.find((item) => item.incident.id === 'longdo:flood-01');
    expect(flood?.duplicateCandidateIds).toEqual(['traffy:flood-07']);
  });

  it('queries a bounding box that covers the 10 km radius', () => {
    const query = nearbyQuery(MOCK_USER_LOCATION);
    expect(
      haversineDistanceKm(MOCK_USER_LOCATION, {
        latitude: query.north,
        longitude: MOCK_USER_LOCATION.longitude,
      }),
    ).toBeGreaterThan(10);
    expect(
      haversineDistanceKm(MOCK_USER_LOCATION, {
        latitude: MOCK_USER_LOCATION.latitude,
        longitude: query.west,
      }),
    ).toBeGreaterThan(10);
  });
});
