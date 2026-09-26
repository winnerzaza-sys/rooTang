import { describe, expect, it } from 'vitest';
import {
  coordinateInBounds,
  maxBboxDegrees,
  parseIncidentQuery,
  RequestValidationError,
} from './bounds';

const valid = { north: '14', south: '13', east: '101', west: '100' };
describe('incident query validation', () => {
  it('accepts valid bounds and categories', () =>
    expect(
      parseIncidentQuery({ ...valid, categories: 'flood,accident' }).categories,
    ).toEqual(['flood', 'accident']));
  it.each([
    [{ ...valid, north: 'x' }],
    [{ ...valid, north: '12' }],
    [{ ...valid, north: '90', south: '-90' }],
    [{ ...valid, categories: 'unknown' }],
  ])('rejects malformed or unsafe query %#', (query) =>
    expect(() => parseIncidentQuery(query)).toThrow(RequestValidationError),
  );
  it('handles antimeridian longitude bounds', () =>
    expect(
      coordinateInBounds(0, 179, {
        north: 1,
        south: -1,
        west: 178,
        east: -178,
      }),
    ).toBe(true));
  it('never disables the span limit with an invalid setting', () => {
    expect(maxBboxDegrees('abc')).toBe(5);
    expect(maxBboxDegrees('-1')).toBe(5);
    expect(maxBboxDegrees(undefined)).toBe(5);
    expect(maxBboxDegrees('3')).toBe(3);
    expect(() =>
      parseIncidentQuery(
        { north: '20', south: '10', east: '101', west: '100' },
        maxBboxDegrees('abc'),
      ),
    ).toThrow(RequestValidationError);
  });
});
