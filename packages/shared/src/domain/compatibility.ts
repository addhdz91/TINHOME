import type { DestinationMode } from '../constants/enums.js';
import type { IsoDate } from '../types/common.js';
import { daysBetween } from './dates.js';

export interface DateSpan {
  start: string;
  end: string;
}

/** What compatibility needs from each side (viewer or candidate home). */
export interface TravelSide {
  cityId: string;
  destinations: { mode: DestinationMode; cityIds: string[] } | null;
  availability: { windowIds: string[]; ranges: DateSpan[] } | null;
}

export interface ViewerSide extends TravelSide {
  travelers: { count: number; withPet: boolean } | null;
}

export interface CandidateSide extends TravelSide {
  maxGuests: number;
  petsAllowed: boolean;
}

/** 05 §4 — computed by the server for cards, detail and matches. */
export interface Compatibility {
  perfectFit: boolean;
  mutualDestination: boolean;
  wantsYourCity: boolean;
  sharedWindowIds: string[];
  overlapDays: number;
  petsOk: boolean;
  capacityOk: boolean;
}

/** `side` wants to travel to `cityId` (or accepts any open city). */
export function wantsCity(side: TravelSide, cityId: string): boolean {
  if (!side.destinations) return false;
  return side.destinations.mode === 'ANY_OPEN'
    ? side.cityId !== cityId
    : side.destinations.cityIds.includes(cityId);
}

/** Nights (`[start, end)`) of a side: its windows' dates plus its own ranges. */
function nights(side: TravelSide, windows: ReadonlyMap<string, DateSpan>): Set<string> {
  const spans = [
    ...(side.availability?.windowIds.flatMap((id) => {
      const span = windows.get(id);
      return span ? [span] : [];
    }) ?? []),
    ...(side.availability?.ranges ?? []),
  ];
  const result = new Set<string>();
  for (const span of spans) {
    const length = daysBetween(span.start as IsoDate, span.end as IsoDate);
    const start = Date.parse(`${span.start}T00:00:00Z`);
    for (let i = 0; i < Math.min(length, 400); i += 1) {
      result.add(new Date(start + i * 86_400_000).toISOString().slice(0, 10));
    }
  }
  return result;
}

/**
 * «Encaje perfecto» (01 §3): each city is in the other's destinations **and** they share a
 * window or overlapping dates. Also capacity and pets for the viewer's travellers.
 */
export function computeCompatibility(
  viewer: ViewerSide,
  candidate: CandidateSide,
  windows: ReadonlyMap<string, DateSpan>,
): Compatibility {
  const wantsYourCity = wantsCity(candidate, viewer.cityId);
  const mutualDestination = wantsYourCity && wantsCity(viewer, candidate.cityId);
  const candidateWindows = new Set(candidate.availability?.windowIds ?? []);
  const sharedWindowIds = (viewer.availability?.windowIds ?? []).filter((id) =>
    candidateWindows.has(id),
  );
  const candidateNights = nights(candidate, windows);
  let overlapDays = 0;
  for (const night of nights(viewer, windows)) if (candidateNights.has(night)) overlapDays += 1;
  return {
    perfectFit: mutualDestination && (sharedWindowIds.length > 0 || overlapDays > 0),
    mutualDestination,
    wantsYourCity,
    sharedWindowIds,
    overlapDays,
    petsOk: !viewer.travelers?.withPet || candidate.petsAllowed,
    capacityOk: (viewer.travelers?.count ?? 1) <= candidate.maxGuests,
  };
}
