import type { IsoDate } from '../types/common.js';

/**
 * Age in whole years on `today` (calendar dates, no time zones). People born on 29 February
 * turn a year older on 1 March in non-leap years.
 */
export function ageOn(birthDate: IsoDate, today: IsoDate): number {
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  const hadBirthday = tm > bm || (tm === bm && td >= bd);
  return ty - by - (hadBirthday ? 0 : 1);
}

/** BR-01 — only adults (18+) may use TinHome. */
export function isAdult(birthDate: IsoDate, today: IsoDate, minAge = 18): boolean {
  return ageOn(birthDate, today) >= minAge;
}
