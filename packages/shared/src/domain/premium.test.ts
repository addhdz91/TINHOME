import { describe, expect, it } from 'vitest';
import {
  canWithdraw,
  isPremiumActive,
  likesRemainingToday,
  premiumFromEntitlements,
  withdrawalRefundCents,
} from './premium.js';

const now = new Date('2027-03-01T10:00:00+01:00');

describe('premium', () => {
  it('is active only before premiumUntil', () => {
    expect(isPremiumActive(null, now)).toBe(false);
    expect(isPremiumActive(new Date('2027-03-01T10:00:01+01:00'), now)).toBe(true);
    expect(isPremiumActive(now, now)).toBe(false);
  });

  it('computes remaining likes and the Madrid midnight reset', () => {
    expect(
      likesRemainingToday({ isPremium: false, usedToday: 3, freeDailyLikes: 10, now }),
    ).toEqual({
      remainingToday: 7,
      resetsAt: new Date('2027-03-01T23:00:00Z'),
    });
    expect(
      likesRemainingToday({ isPremium: false, usedToday: 12, freeDailyLikes: 10, now })
        .remainingToday,
    ).toBe(0);
    expect(
      likesRemainingToday({ isPremium: true, usedToday: 50, freeDailyLikes: 10, now })
        .remainingToday,
    ).toBeNull();
  });
});

describe('premiumFromEntitlements (BR-17)', () => {
  const now = new Date('2027-03-01T10:00:00Z');
  const e = (
    source: 'STRIPE' | 'FOUNDER' | 'REFERRAL' | 'ADMIN',
    start: string,
    end: string,
    revoked = false,
  ) => ({
    source,
    startsAt: new Date(start),
    endsAt: new Date(end),
    revokedAt: revoked ? new Date(start) : null,
  });

  it('takes the latest active end and its source', () => {
    expect(
      premiumFromEntitlements(
        [
          e('STRIPE', '2027-02-01', '2027-04-01'),
          e('FOUNDER', '2027-01-01', '2028-01-01'),
          e('ADMIN', '2027-01-01', '2029-01-01', true),
        ],
        now,
      ),
    ).toEqual({ until: new Date('2028-01-01'), source: 'FOUNDER' });
  });

  it('chains contiguous rewards (founder months + referral days queued after them)', () => {
    expect(
      premiumFromEntitlements(
        [e('FOUNDER', '2027-02-01', '2028-02-01'), e('REFERRAL', '2028-02-01', '2028-03-02')],
        now,
      ),
    ).toEqual({ until: new Date('2028-03-02'), source: 'REFERRAL' });
  });

  it('ignores expired, future and revoked entitlements', () => {
    expect(
      premiumFromEntitlements(
        [e('STRIPE', '2026-01-01', '2027-01-01'), e('REFERRAL', '2027-05-01', '2027-06-01')],
        now,
      ),
    ).toBeNull();
  });
});

describe('withdrawal (BR-34, P-07)', () => {
  const now = new Date('2027-03-10T00:00:00Z');
  it('is open for 14 days after the first purchase, once', () => {
    expect(
      canWithdraw({
        firstSubscribedAt: new Date('2027-03-01T00:00:00Z'),
        withdrawalUsed: false,
        withdrawalDays: 14,
        now,
      }),
    ).toBe(true);
    expect(
      canWithdraw({
        firstSubscribedAt: new Date('2027-02-20T00:00:00Z'),
        withdrawalUsed: false,
        withdrawalDays: 14,
        now,
      }),
    ).toBe(false);
    expect(
      canWithdraw({
        firstSubscribedAt: new Date('2027-03-01T00:00:00Z'),
        withdrawalUsed: true,
        withdrawalDays: 14,
        now,
      }),
    ).toBe(false);
    expect(
      canWithdraw({ firstSubscribedAt: null, withdrawalUsed: false, withdrawalDays: 14, now }),
    ).toBe(false);
  });

  it('refunds everything (FULL) or the unused part (PRORATED)', () => {
    const base = {
      amountPaidCents: 999,
      periodStart: new Date('2027-03-01T00:00:00Z'),
      periodEnd: new Date('2027-03-31T00:00:00Z'),
      now,
    };
    expect(withdrawalRefundCents({ ...base, mode: 'FULL' })).toBe(999);
    expect(withdrawalRefundCents({ ...base, mode: 'PRORATED' })).toBe(699);
  });
});
