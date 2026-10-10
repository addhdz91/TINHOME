import { describe, expect, it } from 'vitest';
import { extendPremium, isFounderSlotAvailable, referralOutcome } from './rewards.js';

const now = new Date('2027-01-10T10:00:00Z');

describe('extendPremium', () => {
  it('starts now when there is no active Premium', () => {
    expect(extendPremium(null, now, { days: 30 }).endsAt.toISOString()).toBe(
      '2027-02-09T10:00:00.000Z',
    );
  });

  it('stacks after an active Premium', () => {
    const until = new Date('2027-03-01T00:00:00Z');
    const grant = extendPremium(until, now, { months: 12 });
    expect(grant.startsAt).toEqual(until);
    expect(grant.endsAt.toISOString()).toBe('2028-03-01T00:00:00.000Z');
  });

  it('ignores an expired Premium', () => {
    expect(extendPremium(new Date('2026-01-01'), now, { days: 1 }).startsAt).toEqual(now);
  });
});

describe('founders (BR-19)', () => {
  it('awards while the counter is below P-08', () => {
    expect(isFounderSlotAvailable(99, 100)).toBe(true);
    expect(isFounderSlotAvailable(100, 100)).toBe(false);
  });
});

describe('referralOutcome (BR-20)', () => {
  const base = {
    inviterUid: 'a',
    inviteeUid: 'b',
    inviterPhone: '+34600000001',
    inviteePhone: '+34600000002',
    inviterDocHash: 'h1',
    inviteeDocHash: 'h2',
    inviterRewardsLast12Months: 0,
    maxRewardsPerYear: 12,
  };

  it('rewards a normal invitation', () => {
    expect(referralOutcome(base)).toEqual({ reward: true });
  });

  it('refuses shared phone, shared document or the yearly limit', () => {
    expect(referralOutcome({ ...base, inviteePhone: base.inviterPhone })).toEqual({
      reward: false,
      reason: 'SAME_PHONE',
    });
    expect(referralOutcome({ ...base, inviteeDocHash: 'h1' })).toEqual({
      reward: false,
      reason: 'SAME_DOCUMENT',
    });
    expect(referralOutcome({ ...base, inviterRewardsLast12Months: 12 })).toEqual({
      reward: false,
      reason: 'YEARLY_LIMIT',
    });
  });
});
