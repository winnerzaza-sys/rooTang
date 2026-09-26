import { incidents, MOCK_USER_LOCATION, mockRoutes } from '../test/fixtures';
import type {
  DirectionsService,
  IncidentService,
  LocationService,
} from './contracts';

const meta = {
  generatedAt: '2026-09-26T03:00:00.000Z',
  partial: false,
  providers: [
    {
      provider: 'longdo' as const,
      status: 'ok' as const,
      fetchedAt: '2026-09-26T02:58:00.000Z',
    },
    {
      provider: 'traffy' as const,
      status: 'ok' as const,
      fetchedAt: '2026-09-26T02:57:00.000Z',
    },
  ],
};

export const mockDirectionsService: DirectionsService = {
  async computeRoutes() {
    return Promise.resolve({ routes: mockRoutes, meta });
  },
};

export const mockIncidentService: IncidentService = {
  async getIncidents() {
    return Promise.resolve({ incidents, meta });
  },
};

export const mockLocationService: LocationService = {
  async getCurrentPosition() {
    return Promise.resolve(MOCK_USER_LOCATION);
  },
};
