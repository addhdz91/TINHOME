import type { IsoDate } from '../types/common.js';
import { addDays, compareIsoDates } from './dates.js';

/** BR-16 — reviews are open from the day after the end date for P-20 days. */
export function reviewDeadline(endDate: IsoDate, windowDays: number): IsoDate {
  return addDays(endDate, windowDays);
}

export function isReviewWindowOpen(endDate: IsoDate, today: IsoDate, windowDays: number): boolean {
  return (
    compareIsoDates(today, endDate) > 0 &&
    compareIsoDates(today, reviewDeadline(endDate, windowDays)) <= 0
  );
}

/** J-06 / N-10 — reminders on the day after the end date and nine days later. */
export function isReviewReminderDay(endDate: IsoDate, today: IsoDate): boolean {
  return today === addDays(endDate, 1) || today === addDays(endDate, 10);
}

/** Average of the published overall scores, rounded to one decimal (null without reviews). */
export function computeRating(
  overallScores: readonly number[],
): { avg: number; count: number } | null {
  if (overallScores.length === 0) return null;
  const sum = overallScores.reduce((total, score) => total + score, 0);
  return { avg: Math.round((sum / overallScores.length) * 10) / 10, count: overallScores.length };
}

/** BR-13 — Casa Top: average ≥ P-04 with at least P-05 published reviews. */
export function isTopHome(
  rating: { avg: number; count: number } | null,
  params: { topMinRating: number; topMinReviews: number },
): boolean {
  return (
    rating !== null && rating.count >= params.topMinReviews && rating.avg >= params.topMinRating
  );
}
