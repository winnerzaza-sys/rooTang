import { describe, expect, it } from 'vitest';
import longdo from '../../src/test/fixtures/longdo.sample.json';
import traffy from '../../src/test/fixtures/traffy.sample.json';
import {
  mapLongdoType,
  normalizeLongdoPayload,
  normalizeLongdoRecord,
} from './longdo';
import {
  mapTraffyCategory,
  mapTraffyStatus,
  normalizeTraffyPayload,
} from './traffy';

describe('provider normalization', () => {
  it('maps Longdo types and unknown types', () => {
    expect(mapLongdoType('1')).toBe('vehicle_breakdown');
    expect(mapLongdoType(999)).toBe('other');
  });
  it('drops malformed Longdo records and marks expired dates', () => {
    expect(
      normalizeLongdoPayload(longdo, new Date('2026-09-26T03:30:00Z')),
    ).toHaveLength(1);
    expect(
      normalizeLongdoRecord(longdo[0], new Date('2026-09-27T00:00:00Z'))
        ?.status,
    ).toBe('expired');
    expect(
      normalizeLongdoRecord({
        eid: 'x',
        title: 'x',
        latitude: 'no',
        longitude: 100,
      }),
    ).toBeUndefined();
  });
  it('normalizes Traffy GeoJSON and excludes resolved reports', () => {
    const result = normalizeTraffyPayload(traffy);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'traffy:sample-traffic-1',
      category: 'flood',
      latitude: 13.79735,
      longitude: 100.66119,
    });
  });
  it('maps travel categories and cautious statuses', () => {
    expect(mapTraffyCategory(['ฝาท่อชำรุด'])).toBe('road_damage');
    expect(mapTraffyCategory(['ขยะทั่วไป'])).toBeUndefined();
    expect(mapTraffyStatus('finish')).toBe('resolved');
    expect(mapTraffyStatus('ข้อความกำกวม')).toBe('unknown');
  });
});
