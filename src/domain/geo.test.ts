import { describe, expect, it } from 'vitest';
import {
  boundsAround,
  haversineDistanceKm,
  haversineDistanceMeters,
  isValidCoordinate,
  padBounds,
  snapBoundsOutward,
} from './geo';

describe('haversine distance', () => {
  it('is zero for the same point and symmetric', () => {
    const a = { latitude: 13.7563, longitude: 100.5018 };
    const b = { latitude: 13.7465, longitude: 100.5348 };
    expect(haversineDistanceKm(a, a)).toBe(0);
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 9);
  });

  it('matches known reference distances', () => {
    // One degree of longitude on the equator ≈ 111.195 km (mean radius).
    expect(
      haversineDistanceKm(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ),
    ).toBeCloseTo(111.195, 2);
    // Bangkok (Sanam Luang) → Chiang Mai (Tha Phae Gate) ≈ 583 km.
    expect(
      haversineDistanceKm(
        { latitude: 13.7563, longitude: 100.4931 },
        { latitude: 18.7877, longitude: 98.9937 },
      ),
    ).toBeCloseTo(583, -1);
    expect(
      haversineDistanceMeters(
        { latitude: 13.7, longitude: 100.5 },
        { latitude: 13.701, longitude: 100.5 },
      ),
    ).toBeCloseTo(111.2, 0);
  });
});

describe('coordinate helpers', () => {
  it('rejects missing, non-finite and out-of-range coordinates', () => {
    expect(isValidCoordinate({ latitude: 13.7, longitude: 100.5 })).toBe(true);
    expect(isValidCoordinate({ latitude: Number.NaN, longitude: 100 })).toBe(
      false,
    );
    expect(isValidCoordinate({ latitude: 91, longitude: 100 })).toBe(false);
    expect(isValidCoordinate({ latitude: 13, longitude: 181 })).toBe(false);
    expect(isValidCoordinate({ latitude: '13', longitude: 100 })).toBe(false);
    expect(isValidCoordinate(null)).toBe(false);
  });

  it('pads bounds by distance and covers a radius', () => {
    const padded = padBounds(
      { north: 13.7, south: 13.6, east: 100.6, west: 100.5 },
      1000,
    );
    expect(padded.north - 13.7).toBeCloseTo(1 / 111.195, 5);
    expect(padded.east - 100.6).toBeGreaterThan(1 / 111.195);
    const center = { latitude: 13.7, longitude: 100.5 };
    const around = boundsAround(center, 10);
    expect(
      haversineDistanceKm(center, {
        latitude: around.north,
        longitude: center.longitude,
      }),
    ).toBeGreaterThanOrEqual(9.99);
    expect(
      haversineDistanceKm(center, {
        latitude: center.latitude,
        longitude: around.east,
      }),
    ).toBeGreaterThanOrEqual(9.99);
  });
});

describe('snapBoundsOutward', () => {
  it('only grows the area and keeps grid values unchanged', () => {
    const input = {
      north: 13.7563,
      south: 13.6612,
      east: 100.5018,
      west: 100.4301,
    };
    const snapped = snapBoundsOutward(input);
    expect(snapped).toEqual({
      north: 13.8,
      south: 13.65,
      east: 100.55,
      west: 100.4,
    });
    expect(snapBoundsOutward(snapped)).toEqual(snapped);
  });
  it('gives the same request for nearby origins', () => {
    const a = snapBoundsOutward(
      boundsAround({ latitude: 13.7563, longitude: 100.5018 }, 10.5),
    );
    const b = snapBoundsOutward(
      boundsAround({ latitude: 13.7571, longitude: 100.5022 }, 10.5),
    );
    expect(a).toEqual(b);
  });
  it('stays within valid coordinates', () => {
    expect(
      snapBoundsOutward({
        north: 89.99,
        south: -89.99,
        east: 179.99,
        west: -179.99,
      }),
    ).toEqual({
      north: 90,
      south: -90,
      east: 180,
      west: -180,
    });
  });
});
