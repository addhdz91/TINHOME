import { describe, expect, it } from 'vitest';
import {
  isPartnerEligible,
  isSponsoredSlot,
  pickSponsored,
  sponsoredClickPath,
  withUtmSource,
  type PartnerCandidate,
  type SponsoredContext,
} from './sponsored.js';

const now = new Date('2026-10-14T10:00:00Z');
const base: PartnerCandidate = {
  id: 'p1',
  category: 'CLEANING',
  cityIds: null,
  placements: ['MATCH', 'DECK'],
  active: true,
  startsAt: null,
  endsAt: null,
};
const ctx: SponsoredContext = {
  placement: 'MATCH',
  cityId: 'madrid',
  isPremium: false,
  insuranceEnabled: false,
  now,
};

describe('BR-28 sponsored', () => {
  it('filters by active, placement, dates, city and insurance flag', () => {
    expect(isPartnerEligible(base, ctx)).toBe(true);
    expect(isPartnerEligible({ ...base, active: false }, ctx)).toBe(false);
    expect(isPartnerEligible(base, { ...ctx, placement: 'EXCHANGE' })).toBe(false);
    expect(isPartnerEligible({ ...base, startsAt: new Date('2026-11-01') }, ctx)).toBe(false);
    expect(isPartnerEligible({ ...base, endsAt: now }, ctx)).toBe(false);
    expect(isPartnerEligible({ ...base, cityIds: ['valencia'] }, ctx)).toBe(false);
    expect(isPartnerEligible({ ...base, cityIds: ['madrid'] }, ctx)).toBe(true);
    expect(isPartnerEligible({ ...base, cityIds: ['madrid'] }, { ...ctx, cityId: null })).toBe(
      false,
    );
    const insurance = { ...base, category: 'TRAVEL_INSURANCE' as const };
    expect(isPartnerEligible(insurance, ctx)).toBe(false);
    expect(isPartnerEligible(insurance, { ...ctx, insuranceEnabled: true })).toBe(true);
  });

  it('never shows the deck interstitial to Premium and picks one stable card', () => {
    const partners = [base, { ...base, id: 'p2' }, { ...base, id: 'p3' }];
    expect(pickSponsored(partners, { ...ctx, placement: 'DECK', isPremium: true }, 's')).toBe(null);
    const first = pickSponsored(partners, ctx, 'seed');
    expect(first).not.toBeNull();
    expect(pickSponsored([...partners].reverse(), ctx, 'seed')?.id).toBe(first?.id);
    expect(pickSponsored([], ctx, 'seed')).toBeNull();
  });

  it('places the interstitial every N cards', () => {
    expect(isSponsoredSlot(0, 12)).toBe(false);
    expect(isSponsoredSlot(11, 12)).toBe(false);
    expect(isSponsoredSlot(12, 12)).toBe(true);
    expect(isSponsoredSlot(24, 12)).toBe(true);
    expect(isSponsoredSlot(12, 0)).toBe(false);
  });

  it('builds the click path and the UTM destination', () => {
    expect(sponsoredClickPath('abc', 'MATCH')).toBe('/r/abc?p=MATCH');
    expect(withUtmSource('https://example.com/a?x=1')).toBe(
      'https://example.com/a?x=1&utm_source=tinhome',
    );
    expect(withUtmSource('https://example.com/?utm_source=other')).toBe(
      'https://example.com/?utm_source=tinhome',
    );
  });
});
