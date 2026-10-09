import { describe, expect, it } from 'vitest';
import { isPremiumActive, likesRemainingToday } from './premium.js';

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
