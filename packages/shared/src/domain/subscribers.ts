import type { SubscriberSegment } from '../constants/enums.js';

/** Stripe statuses during which the person is a paying subscriber (BR-17, 03 §10). */
const PAYING_STATUSES = new Set(['active', 'trialing', 'past_due']);

export interface SubscriberFacts {
  /** `users.premiumUntil` (BR-17: max of every entitlement), or null. */
  premiumUntil: Date | null;
  /** `subscriptions/{uid}` exists: the person paid with Stripe at least once. */
  hasSubscription: boolean;
  /** Stripe status of that subscription (`active`, `canceled`…), or null. */
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  /** At least one entitlement of any source (founder, referral, admin or Stripe). */
  everPremium: boolean;
}

/**
 * Marketing segment of a person for the admin subscribers panel:
 * - PAID_ACTIVE: Premium paid with Stripe that renews;
 * - PAID_CANCELING: paid, but cancelled at the end of the period (retention);
 * - GIFTED: Premium in force without paying (founder, referral, admin) → invite to pay;
 * - LAPSED_PAID: paid once, no longer Premium → invite to come back;
 * - LAPSED_GIFTED: had a gifted Premium that ended and never paid → invite to subscribe;
 * - FREE: never Premium.
 */
export function subscriberSegment(facts: SubscriberFacts, now: Date): SubscriberSegment {
  const premium = facts.premiumUntil !== null && facts.premiumUntil.getTime() > now.getTime();
  const paying = facts.subscriptionStatus !== null && PAYING_STATUSES.has(facts.subscriptionStatus);
  if (premium && paying) return facts.cancelAtPeriodEnd ? 'PAID_CANCELING' : 'PAID_ACTIVE';
  if (premium) return 'GIFTED';
  if (facts.hasSubscription) return 'LAPSED_PAID';
  if (facts.everPremium) return 'LAPSED_GIFTED';
  return 'FREE';
}

/** Whole days until `until` (0 when already past), for «caduca en N días». */
export function daysUntil(until: Date | null, now: Date): number | null {
  if (!until) return null;
  return Math.max(0, Math.ceil((until.getTime() - now.getTime()) / 86_400_000));
}

/**
 * Estimated monthly recurring revenue in cents (IVA included, P-21/P-22): monthly plans count
 * the monthly price, yearly plans a twelfth of the yearly price. Only renewing subscriptions.
 */
export function estimatedMrrCents(
  plans: { monthly: number; yearly: number },
  prices: { monthlyCents: number; yearlyCents: number },
): number {
  return Math.round(plans.monthly * prices.monthlyCents + (plans.yearly * prices.yearlyCents) / 12);
}
