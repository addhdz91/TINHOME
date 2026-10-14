import type { PremiumSource } from '../constants/enums.js';
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

export interface EntitlementLike {
  source: PremiumSource;
  startsAt: Date;
  endsAt: Date;
  revokedAt: Date | null;
}

/**
 * BR-17 — `premiumUntil` from the entitlements: starting now, it follows the chain of
 * non-revoked entitlements that start before the current end (stacked rewards are
 * contiguous, M4), so a referral queued after the founder months is not lost. `source` is the
 * entitlement that gives the final end. `null` when nothing is active now.
 */
export function premiumFromEntitlements(
  entitlements: readonly EntitlementLike[],
  now: Date,
): { until: Date; source: PremiumSource } | null {
  const usable = entitlements
    .filter((e) => !e.revokedAt && e.endsAt > now)
    .toSorted((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  let until = now;
  let source: PremiumSource | null = null;
  for (const e of usable) {
    if (e.startsAt > until) break;
    if (e.endsAt > until) {
      until = e.endsAt;
      source = e.source;
    }
  }
  return source ? { until, source } : null;
}

/** BR-34 — the withdrawal is open for P-07D days after the first purchase, once. */
export function canWithdraw(input: {
  firstSubscribedAt: Date | null;
  withdrawalUsed: boolean;
  withdrawalDays: number;
  now: Date;
}): boolean {
  return (
    input.firstSubscribedAt !== null &&
    !input.withdrawalUsed &&
    input.now.getTime() - input.firstSubscribedAt.getTime() <= input.withdrawalDays * 86_400_000
  );
}

/** P-07 — refund of a withdrawal: the whole last payment or the unused part of the period. */
export function withdrawalRefundCents(input: {
  mode: 'FULL' | 'PRORATED';
  amountPaidCents: number;
  periodStart: Date;
  periodEnd: Date;
  now: Date;
}): number {
  if (input.mode === 'FULL') return input.amountPaidCents;
  const total = input.periodEnd.getTime() - input.periodStart.getTime();
  if (total <= 0) return 0;
  const unused = Math.min(total, Math.max(0, input.periodEnd.getTime() - input.now.getTime()));
  return Math.floor((input.amountPaidCents * unused) / total);
}
