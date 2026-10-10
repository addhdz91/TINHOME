import type {
  CityStatus,
  HomeStatus,
  IdentityStatus,
  LocationCheckStatus,
  UserStatus,
} from '../constants/enums.js';
import type { IsoDate } from '../types/common.js';
import { addDays, compareIsoDates } from './dates.js';

export const HOME_REQUIRED_FIELDS = [
  'title',
  'description',
  'cityId',
  'zone',
  'type',
  'tenure',
  'residenceUse',
  'sizeM2',
  'bedrooms',
  'beds',
  'bathrooms',
  'maxGuests',
] as const;
export type HomeRequiredField = (typeof HOME_REQUIRED_FIELDS)[number];
export type HomeMissing = HomeRequiredField | 'photos';

/** BR-03 — what is still missing to publish (fields and 5–20 photos). */
export function missingForPublish(
  home: Partial<Record<HomeRequiredField, unknown>> & { photoCount: number },
  photosMin: number,
): HomeMissing[] {
  const missing: HomeMissing[] = HOME_REQUIRED_FIELDS.filter((field) => {
    const value = home[field];
    return value === undefined || value === null || value === '';
  });
  if (home.photoCount < photosMin) missing.push('photos');
  return missing;
}

export interface VisibilityContext {
  status: HomeStatus;
  identity: IdentityStatus;
  locationCheck: LocationCheckStatus;
  onHold: boolean;
  ownerStatus: UserStatus;
  cityStatus: CityStatus | null;
}

/** BR-39 — the location counts as verified after a PASS or a manual approval. */
export function isLocationVerified(status: LocationCheckStatus): boolean {
  return status === 'PASS' || status === 'MANUAL_APPROVED';
}

/**
 * BR-04 — visible to others (blocks between two users are applied per viewer by the
 * callables). Returns the reasons it is not, for the owner's status explanation.
 */
export function visibilityProblems(ctx: VisibilityContext): string[] {
  const problems: string[] = [];
  if (ctx.status !== 'PUBLISHED') problems.push('NOT_PUBLISHED');
  if (ctx.identity !== 'APPROVED') problems.push('IDENTITY');
  if (!isLocationVerified(ctx.locationCheck)) problems.push('LOCATION');
  if (ctx.onHold) problems.push('ON_HOLD');
  if (ctx.ownerStatus !== 'ACTIVE') problems.push('ACCOUNT');
  if (ctx.cityStatus !== 'OPEN') problems.push('CITY');
  return problems;
}

export function isHomeVisible(ctx: VisibilityContext): boolean {
  return visibilityProblems(ctx).length === 0;
}

/** BR-21 — counts towards the city threshold: published and identity approved. */
export function isCityCandidate(status: HomeStatus, identity: IdentityStatus): boolean {
  return status === 'PUBLISHED' && identity === 'APPROVED';
}

/** FR-15 — a flexible range: start before end, from today, within the next 12 months. */
export function isValidRange(range: { start: IsoDate; end: IsoDate }, today: IsoDate): boolean {
  return (
    compareIsoDates(range.start, range.end) < 0 &&
    compareIsoDates(range.start, today) >= 0 &&
    compareIsoDates(range.end, addDays(today, 366)) <= 0
  );
}

/**
 * FR-65 — share of the photos replaced in the last 30 days (`replaced` / current photos).
 * Reaching P-37 sends a verified home back to review.
 */
export function photoChangeRatio(
  log: readonly { at: Date; replaced: number }[],
  currentPhotos: number,
  now: Date,
): number {
  const since = now.getTime() - 30 * 86_400_000;
  const replaced = log
    .filter((entry) => entry.at.getTime() >= since)
    .reduce((sum, entry) => sum + entry.replaced, 0);
  return currentPhotos === 0 ? 0 : replaced / currentPhotos;
}
