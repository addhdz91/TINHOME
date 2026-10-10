import type { LocationResult } from '../constants/enums.js';
import { LOCATION_MAX_ACCURACY_M } from '../constants/limits.js';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** BR-39 — coordinates kept for at most P-13 days are rounded to 2 decimals (~1 km). */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * BR-39 — a reading passes when its accuracy is ≤ 200 m and it lies within the city radius.
 * The distance is rounded to whole kilometres (the only distance stored).
 */
export function evaluateLocation(
  reading: LatLng & { accuracyM: number },
  city: { center: LatLng; radiusKm: number },
): { result: LocationResult; distanceKm: number } {
  const distance = Math.round(distanceKm(reading, city.center));
  if (reading.accuracyM > LOCATION_MAX_ACCURACY_M)
    return { result: 'INACCURATE', distanceKm: distance };
  return { result: distance <= city.radiusKm ? 'PASS' : 'FAIL', distanceKm: distance };
}
