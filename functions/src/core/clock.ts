import type { Clock } from '@tinhome/shared/types';

const systemClock: Clock = { now: () => new Date() };

let current: Clock = systemClock;

/** Server clock. Business code calls `clock.now()` and passes the value into the pure domain. */
export const clock: Clock = { now: () => current.now() };

/** Test helper: replace the clock (e.g. a fixed `2027-03-01T10:00:00+01:00`). */
export function setClock(next: Clock): void {
  current = next;
}

/** Test helper: back to the real time. */
export function resetClock(): void {
  current = systemClock;
}

/** Fixed clock for tests and jobs that must be reproducible. */
export function fixedClock(at: Date | string): Clock {
  const instant = new Date(at);
  return { now: () => new Date(instant) };
}
