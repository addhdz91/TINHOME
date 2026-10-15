export type GeoProblem = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export interface Reading {
  lat: number;
  lng: number;
  accuracyM: number;
}

/** Why no reading could be taken (shown with its own help text). */
export class GeoError extends Error {
  constructor(readonly problem: GeoProblem) {
    super(problem);
    this.name = 'GeoError';
  }
}

/** FR-63 — one high-accuracy reading of the browser (the permission prompt explains why first). */
export function readPosition(): Promise<Reading> {
  return new Promise((resolve, reject: (error: GeoError) => void) => {
    if (!('geolocation' in navigator)) {
      reject(new GeoError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        }),
      (error) =>
        reject(
          new GeoError(
            error.code === error.PERMISSION_DENIED
              ? 'denied'
              : error.code === error.TIMEOUT
                ? 'timeout'
                : 'unavailable',
          ),
        ),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });
}

/** Phones and tablets (where the reading means «I am at home»). */
export function isMobileDevice(): boolean {
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return coarse || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isGeoError(value: unknown): value is GeoError {
  return value instanceof GeoError;
}
