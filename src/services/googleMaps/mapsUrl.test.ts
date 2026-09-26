import { describe, expect, it } from 'vitest';
import { mockRoutes } from '../../test/fixtures';
import { googleMapsNavigationUrl } from './mapsUrl';

describe('googleMapsNavigationUrl', () => {
  it('creates a mobile navigation link through the selected route path', () => {
    const url = new URL(googleMapsNavigationUrl(mockRoutes[1]!));

    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('travelmode')).toBe('driving');
    expect(url.searchParams.get('dir_action')).toBe('navigate');
    expect(url.searchParams.get('origin')).toBe('13.660000,100.420000');
    expect(url.searchParams.get('destination')).toBe('13.735000,100.495000');
    expect(url.searchParams.get('waypoints')?.split('|')).toEqual([
      '13.690000,100.426000',
      '13.712000,100.444000',
      '13.728000,100.470000',
    ]);
  });
});
