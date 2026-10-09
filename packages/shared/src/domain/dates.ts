import { TZDate } from '@date-fns/tz';
import { addDays as addDaysToDate, format, startOfDay } from 'date-fns';
import { TIME_ZONE } from '../constants/region.js';
import type { IsoDate, Result } from '../types/common.js';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** BR-32 — `true` if `value` is a real calendar date written as `YYYY-MM-DD`. */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Narrows an untrusted string to `IsoDate`. */
export function parseIsoDate(value: string): Result<IsoDate, 'INVALID_ISO_DATE'> {
  return isIsoDate(value) ? { ok: true, value } : { ok: false, error: 'INVALID_ISO_DATE' };
}

/** Calendar date of `now` in the business time zone (`Europe/Madrid` by default). */
export function toIsoDate(now: Date, timeZone: string = TIME_ZONE): IsoDate {
  return format(new TZDate(now, timeZone), 'yyyy-MM-dd') as IsoDate;
}

/** Instant at which the next calendar day starts in `timeZone` (e.g. daily like reset, BR-06). */
export function startOfNextDay(now: Date, timeZone: string = TIME_ZONE): Date {
  const next = addDaysToDate(startOfDay(new TZDate(now, timeZone)), 1);
  return new Date(next.getTime());
}

function toUtcMs(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10) as IsoDate;
}

/** Adds (or subtracts) whole calendar days; immune to DST because it works on dates only. */
export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** Lexicographic comparison is chronological for `YYYY-MM-DD`. */
export function compareIsoDates(a: IsoDate, b: IsoDate): -1 | 0 | 1 {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
