import { describe, expect, it } from 'vitest';
import { PARAM_DEFAULTS } from '../constants/params.js';
import type { Compatibility } from './compatibility.js';
import {
  rankCandidates,
  rankingFactors,
  rankingNoise,
  rankingScore,
  type RankingInput,
} from './ranking.js';

const now = new Date('2027-03-01T10:00:00Z');
const weights = PARAM_DEFAULTS.rankingWeights;
const none: Compatibility = {
  perfectFit: false,
  mutualDestination: false,
  wantsYourCity: false,
  sharedWindowIds: [],
  overlapDays: 0,
  petsOk: true,
  capacityOk: true,
};

const input = (overrides: Partial<RankingInput> = {}): RankingInput => ({
  homeId: 'h1',
  compatibility: none,
  likedYou: false,
  ownerPremium: false,
  rating: null,
  publishedAt: new Date('2026-01-01T00:00:00Z'),
  photoCount: 6,
  ...overrides,
});

describe('rankingFactors (03 §8)', () => {
  it('normalises every factor to [0, 1]', () => {
    const factors = rankingFactors(
      input({
        compatibility: { ...none, wantsYourCity: true, overlapDays: 3 },
        likedYou: true,
        ownerPremium: true,
        rating: { avg: 4, count: 5 },
        publishedAt: new Date('2027-02-25T00:00:00Z'),
        photoCount: 20,
      }),
      now,
    );
    expect(factors).toEqual([1, 3 / 7, 1, 1, 0.5, 1, 1]);
  });

  it('uses 0.5 without reviews, clamps low ratings and decays novelty to 0 at 90 days', () => {
    expect(rankingFactors(input(), now)[4]).toBe(0.5);
    expect(rankingFactors(input({ rating: { avg: 2, count: 3 } }), now)[4]).toBe(0);
    const at52 = rankingFactors(
      input({ publishedAt: new Date(now.getTime() - 52 * 86_400_000) }),
      now,
    )[5];
    expect(at52).toBeCloseTo(0.5, 5);
    expect(rankingFactors(input({ publishedAt: null }), now)[5]).toBe(0);
  });

  it('counts a shared window as full date fit', () => {
    expect(
      rankingFactors(input({ compatibility: { ...none, sharedWindowIds: ['ss27'] } }), now)[1],
    ).toBe(1);
  });
});

describe('rankingNoise', () => {
  it('is deterministic and within [0, 5)', () => {
    const a = rankingNoise('laura|2027-03-01', 'h1');
    expect(a).toBe(rankingNoise('laura|2027-03-01', 'h1'));
    for (const id of ['h1', 'h2', 'h3', 'h4']) {
      const noise = rankingNoise('seed', id);
      expect(noise).toBeGreaterThanOrEqual(0);
      expect(noise).toBeLessThan(5);
    }
  });
});

describe('rankCandidates (BR-14)', () => {
  it('puts perfect fits first, then sorts by score', () => {
    const perfect = input({
      homeId: 'perfect',
      compatibility: {
        ...none,
        perfectFit: true,
        wantsYourCity: true,
        mutualDestination: true,
        sharedWindowIds: ['ss27'],
      },
    });
    const liked = input({
      homeId: 'liked',
      likedYou: true,
      ownerPremium: true,
      compatibility: { ...none, wantsYourCity: true },
    });
    const plain = input({ homeId: 'plain' });
    expect(
      rankCandidates([plain, liked, perfect], weights, 'seed', now).map((c) => c.homeId),
    ).toEqual(['perfect', 'liked', 'plain']);
  });

  it('a like received weighs more than Premium (W3 > W4)', () => {
    const premium =
      rankingScore(input({ homeId: 'x', ownerPremium: true }), weights, 's', now) -
      rankingNoise('s', 'x');
    const liked =
      rankingScore(input({ homeId: 'x', likedYou: true }), weights, 's', now) -
      rankingNoise('s', 'x');
    expect(liked).toBeGreaterThan(premium);
  });

  it('is stable for the same seed and varies between seeds', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => input({ homeId: `h${String(i)}` }));
    const a = rankCandidates(candidates, weights, 'laura|2027-03-01', now).map((c) => c.homeId);
    expect(
      rankCandidates(candidates, weights, 'laura|2027-03-01', now).map((c) => c.homeId),
    ).toEqual(a);
    expect(
      rankCandidates(candidates, weights, 'laura|2027-03-02', now).map((c) => c.homeId),
    ).not.toEqual(a);
  });
});
