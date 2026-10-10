const MS_PER_DAY = 86_400_000;

/**
 * BR-17/19/20 — new `premiumUntil` after granting Premium: the grant starts when the current
 * Premium ends (or now, if there is none) so stacked rewards are never lost.
 */
export function extendPremium(
  currentUntil: Date | null,
  now: Date,
  grant: { days: number } | { months: number },
): { startsAt: Date; endsAt: Date } {
  const startsAt = currentUntil && currentUntil > now ? currentUntil : now;
  const endsAt = new Date(startsAt.getTime());
  if ('days' in grant) endsAt.setTime(endsAt.getTime() + grant.days * MS_PER_DAY);
  else endsAt.setUTCMonth(endsAt.getUTCMonth() + grant.months);
  return { startsAt, endsAt };
}

/** BR-19 — founder while the city's atomic counter is below P-08. */
export function isFounderSlotAvailable(foundersAwarded: number, foundersPerCity: number): boolean {
  return foundersAwarded < foundersPerCity;
}

export type ReferralOutcome =
  | { reward: true }
  | { reward: false; reason: 'SAME_PHONE' | 'SAME_DOCUMENT' | 'YEARLY_LIMIT' | 'SELF' };

/** BR-20 — whether an invitation earns the reward when the invitee's identity is approved. */
export function referralOutcome(input: {
  inviterUid: string;
  inviteeUid: string;
  inviterPhone: string | null;
  inviteePhone: string | null;
  inviterDocHash: string | null;
  inviteeDocHash: string | null;
  inviterRewardsLast12Months: number;
  maxRewardsPerYear: number;
}): ReferralOutcome {
  if (input.inviterUid === input.inviteeUid) return { reward: false, reason: 'SELF' };
  if (input.inviterPhone !== null && input.inviterPhone === input.inviteePhone)
    return { reward: false, reason: 'SAME_PHONE' };
  if (input.inviterDocHash !== null && input.inviterDocHash === input.inviteeDocHash)
    return { reward: false, reason: 'SAME_DOCUMENT' };
  if (input.inviterRewardsLast12Months >= input.maxRewardsPerYear)
    return { reward: false, reason: 'YEARLY_LIMIT' };
  return { reward: true };
}
