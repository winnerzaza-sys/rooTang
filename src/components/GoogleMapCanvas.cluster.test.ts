import { describe, expect, it } from 'vitest';
import type { IncidentPin } from '../domain/matching/routeAnalysis';
import { clusterIncidentPins } from '../domain/incidentClustering';
import type { RoadIncident } from '../domain/types';

function pin(id: string, latitude: number, longitude: number): IncidentPin {
  const incident: RoadIncident = {
    id,
    externalId: id,
    provider: 'longdo',
    category: 'other',
    title: id,
    latitude,
    longitude,
    status: 'active',
    freshness: 'active',
  };
  return { incident };
}

describe('Google map incident clustering', () => {
  const pins = [
    pin('near-a', 13.75, 100.5),
    pin('near-b', 13.751, 100.501),
    pin('far', 13.9, 100.7),
  ];

  it('groups nearby reports at low zoom', () => {
    const clusters = clusterIncidentPins(pins, 10);
    expect(clusters).toHaveLength(2);
    expect(clusters.find((cluster) => cluster.pins.length === 2)?.pins).toEqual(
      pins.slice(0, 2),
    );
  });

  it('keeps individual markers at street zoom', () => {
    expect(clusterIncidentPins(pins, 14)).toHaveLength(3);
    expect(
      clusterIncidentPins(pins, 14).every((item) => item.pins.length === 1),
    ).toBe(true);
  });
});
