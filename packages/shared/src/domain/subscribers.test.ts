import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  estimatedMrrCents,
  subscriberSegment,
  type SubscriberFacts,
} from './subscribers.js';

const now = new Date('2027-03-01T10:00:00Z');
const later = new Date('2027-04-01T10:00:00Z');
const earlier = new Date('2027-01-01T10:00:00Z');
const base: SubscriberFacts = {
  premiumUntil: null,
  hasSubscription: false,
  subscriptionStatus: null,
  cancelAtPeriodEnd: false,
  everPremium: false,
};

describe('subscriberSegment', () => {
  it('tells paying, cancelling and gifted Premium apart', () => {
    const paid = { ...base, premiumUntil: later, hasSubscription: true, everPremium: true };
    expect(subscriberSegment({ ...paid, subscriptionStatus: 'active' }, now)).toBe('PAID_ACTIVE');
    expect(subscriberSegment({ ...paid, subscriptionStatus: 'past_due' }, now)).toBe('PAID_ACTIVE');
    expect(
      subscriberSegment({ ...paid, subscriptionStatus: 'active', cancelAtPeriodEnd: true }, now),
    ).toBe('PAID_CANCELING');
    // A founder whose old subscription was cancelled is gifted, not paying.
    expect(subscriberSegment({ ...paid, subscriptionStatus: 'canceled' }, now)).toBe('GIFTED');
    expect(subscriberSegment({ ...base, premiumUntil: later, everPremium: true }, now)).toBe(
      'GIFTED',
    );
  });

  it('tells former customers, expired gifts and people never Premium apart', () => {
    expect(
      subscriberSegment(
        {
          ...base,
          premiumUntil: earlier,
          hasSubscription: true,
          subscriptionStatus: 'canceled',
          everPremium: true,
        },
        now,
      ),
    ).toBe('LAPSED_PAID');
    expect(subscriberSegment({ ...base, premiumUntil: null, everPremium: true }, now)).toBe(
      'LAPSED_GIFTED',
    );
    expect(subscriberSegment(base, now)).toBe('FREE');
    // premiumUntil exactly now = already over.
    expect(subscriberSegment({ ...base, premiumUntil: now, everPremium: true }, now)).toBe(
      'LAPSED_GIFTED',
    );
  });
});

describe('daysUntil and estimatedMrrCents', () => {
  it('counts whole days left and the monthly revenue of renewing plans', () => {
    expect(daysUntil(null, now)).toBeNull();
    expect(daysUntil(earlier, now)).toBe(0);
    expect(daysUntil(new Date('2027-03-02T09:00:00Z'), now)).toBe(1);
    expect(daysUntil(later, now)).toBe(31);
    expect(
      estimatedMrrCents({ monthly: 3, yearly: 2 }, { monthlyCents: 999, yearlyCents: 7900 }),
    ).toBe(4314);
  });
});
