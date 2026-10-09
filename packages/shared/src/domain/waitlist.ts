import type { DemandStatDoc } from '../types/city.js';

/**
 * FR-19 — canonical e-mail for the waitlist document id (`sha256(email)`): trimmed and
 * lower-cased. Provider-specific tricks (dots, `+tag`) are kept: they are distinct mailboxes.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface CityProgress {
  count: number;
  threshold: number;
  /** 0–100, integer, capped at 100. */
  percent: number;
  remaining: number;
  reached: boolean;
}

/** FR-17 / BR-21 — progress of a city towards its opening threshold (P-12). */
export function computeCityProgress(count: number, threshold: number): CityProgress {
  const safeCount = Math.max(0, Math.floor(count));
  const safeThreshold = Math.max(1, Math.floor(threshold));
  // Integer arithmetic: (87 / 150) * 100 would floor to 57 because of floating point.
  const percent = Math.min(100, Math.floor((safeCount * 100) / safeThreshold));
  return {
    count: safeCount,
    threshold: safeThreshold,
    percent,
    remaining: Math.max(0, safeThreshold - safeCount),
    reached: safeCount >= safeThreshold,
  };
}

/** `demandStats` id for a pair of cities and a window. */
export function demandStatId(fromCityId: string, toCityId: string, windowId: string): string {
  return `${fromCityId}_${toCityId}_${windowId}`;
}

/** FR-18 — every (destination × window) pair a confirmed waitlist entry adds demand to. */
export function demandPairs(
  cityId: string,
  destinations: readonly string[],
  windowIds: readonly string[],
): { id: string; fromCityId: string; toCityId: string; windowId: string }[] {
  return destinations
    .filter((toCityId) => toCityId !== cityId)
    .flatMap((toCityId) =>
      windowIds.map((windowId) => ({
        id: demandStatId(cityId, toCityId, windowId),
        fromCityId: cityId,
        toCityId,
        windowId,
      })),
    );
}

/** FR-18 — only counters ≥ P-18 may be shown (privacy); highest first. */
export function visibleDemand<T extends Pick<DemandStatDoc, 'count'>>(
  stats: readonly T[],
  minimum: number,
  limit = 3,
): T[] {
  return stats
    .filter((stat) => stat.count >= minimum)
    .toSorted((a, b) => b.count - a.count)
    .slice(0, limit);
}
