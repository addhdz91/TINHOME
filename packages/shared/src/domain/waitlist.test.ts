import { describe, expect, it } from 'vitest';
import {
  computeCityProgress,
  demandPairs,
  demandStatId,
  normalizeEmail,
  visibleDemand,
} from './waitlist.js';

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Laura@Demo.TinHome ')).toBe('laura@demo.tinhome');
  });

  it('keeps plus tags and dots (distinct mailboxes)', () => {
    expect(normalizeEmail('l.aura+x@demo.es')).toBe('l.aura+x@demo.es');
  });
});

describe('computeCityProgress', () => {
  it('computes percent and remaining', () => {
    expect(computeCityProgress(87, 150)).toEqual({
      count: 87,
      threshold: 150,
      percent: 58,
      remaining: 63,
      reached: false,
    });
  });

  it('caps at 100 % once the threshold is reached', () => {
    expect(computeCityProgress(162, 150)).toMatchObject({
      percent: 100,
      remaining: 0,
      reached: true,
    });
    expect(computeCityProgress(150, 150).reached).toBe(true);
  });

  it('guards against bad data', () => {
    expect(computeCityProgress(-3, 0)).toEqual({
      count: 0,
      threshold: 1,
      percent: 0,
      remaining: 1,
      reached: false,
    });
  });
});

describe('demand', () => {
  it('builds one pair per destination and window, never to the own city', () => {
    expect(demandPairs('valencia', ['madrid', 'valencia', 'malaga'], ['ss27'])).toEqual([
      { id: 'valencia_madrid_ss27', fromCityId: 'valencia', toCityId: 'madrid', windowId: 'ss27' },
      { id: 'valencia_malaga_ss27', fromCityId: 'valencia', toCityId: 'malaga', windowId: 'ss27' },
    ]);
    expect(demandPairs('valencia', ['madrid'], [])).toEqual([]);
    expect(demandStatId('a', 'b', 'w')).toBe('a_b_w');
  });

  it('only exposes counters at or above P-18, highest first', () => {
    const stats = [{ count: 4 }, { count: 47 }, { count: 5 }, { count: 12 }, { count: 30 }];
    expect(visibleDemand(stats, 5)).toEqual([{ count: 47 }, { count: 30 }, { count: 12 }]);
    expect(visibleDemand(stats, 5, 10)).toHaveLength(4);
    expect(visibleDemand(stats, 100)).toEqual([]);
  });
});
