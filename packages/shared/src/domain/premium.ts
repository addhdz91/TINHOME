import { startOfNextDay } from './dates.js';

/** BR-17 — Premium is active while `premiumUntil` is in the future. */
export function isPremiumActive(premiumUntil: Date | null, now: Date): boolean {
  return premiumUntil !== null && premiumUntil.getTime() > now.getTime();
}

/**
 * BR-06 — likes left today: `null` for Premium (unlimited, only the hourly anti-abuse cap),
 * otherwise P-01 minus today's count. Resets at 00:00 Europe/Madrid.
 */
export function likesRemainingToday(input: {
  isPremium: boolean;
  usedToday: number;
  freeDailyLikes: number;
  now: Date;
}): { remainingToday: number | null; resetsAt: Date } {
  return {
    remainingToday: input.isPremium ? null : Math.max(0, input.freeDailyLikes - input.usedToday),
    resetsAt: startOfNextDay(input.now),
  };
}
