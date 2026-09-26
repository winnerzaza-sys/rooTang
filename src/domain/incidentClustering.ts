import type { IncidentPin } from './matching/routeAnalysis';

export interface IncidentPinCluster {
  id: string;
  pins: IncidentPin[];
  latitude: number;
  longitude: number;
}

/** Small deterministic grid cluster used before creating map markers. */
export function clusterIncidentPins(
  pins: IncidentPin[],
  zoom: number,
): IncidentPinCluster[] {
  const cellSize = zoom <= 10 ? 0.08 : zoom <= 12 ? 0.025 : 0;
  if (!cellSize)
    return pins.map((pin) => ({
      id: pin.incident.id,
      pins: [pin],
      latitude: pin.incident.latitude,
      longitude: pin.incident.longitude,
    }));

  const groups = new Map<string, IncidentPin[]>();
  for (const pin of pins) {
    const key = `${Math.floor(pin.incident.latitude / cellSize)}:${Math.floor(pin.incident.longitude / cellSize)}`;
    groups.set(key, [...(groups.get(key) ?? []), pin]);
  }
  return [...groups.entries()].map(([id, clusteredPins]) => ({
    id,
    pins: clusteredPins,
    latitude:
      clusteredPins.reduce((sum, pin) => sum + pin.incident.latitude, 0) /
      clusteredPins.length,
    longitude:
      clusteredPins.reduce((sum, pin) => sum + pin.incident.longitude, 0) /
      clusteredPins.length,
  }));
}
