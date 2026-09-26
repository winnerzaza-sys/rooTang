import type {
  AppCoordinate,
  AppPlace,
  IncidentQuery,
  IncidentResponseMeta,
  RoadIncident,
  RouteSearchRequest,
  RouteSearchResult,
} from '../domain/types';

export interface DirectionsService {
  computeRoutes(request: RouteSearchRequest): Promise<RouteSearchResult>;
}

export interface IncidentService {
  getIncidents(
    query: IncidentQuery,
    signal?: AbortSignal,
  ): Promise<{
    incidents: RoadIncident[];
    meta: IncidentResponseMeta;
  }>;
}

export interface LocationService {
  getCurrentPosition(): Promise<AppCoordinate>;
}

export interface PlacesService {
  createAutocomplete(
    host: HTMLElement,
    options: {
      placeholder: string;
      onSelect: (place: AppPlace) => void;
      onError: () => void;
    },
  ): Promise<() => void>;
}
