import { describe, expect, it } from 'vitest';
import type { IsoDate } from '../types/common.js';
import { wantsChannel } from './notifications.js';
import {
  computeRating,
  isReviewReminderDay,
  isReviewWindowOpen,
  isTopHome,
  reviewDeadline,
} from './reviews.js';

const d = (value: string): IsoDate => value as IsoDate;
const params = { topMinRating: 4.5, topMinReviews: 3 };

describe('reviews (BR-13, BR-16)', () => {
  it('opens the window the day after the end for P-20 days', () => {
    expect(reviewDeadline(d('2027-03-28'), 14)).toBe('2027-04-11');
    expect(isReviewWindowOpen(d('2027-03-28'), d('2027-03-28'), 14)).toBe(false);
    expect(isReviewWindowOpen(d('2027-03-28'), d('2027-03-29'), 14)).toBe(true);
    expect(isReviewWindowOpen(d('2027-03-28'), d('2027-04-11'), 14)).toBe(true);
    expect(isReviewWindowOpen(d('2027-03-28'), d('2027-04-12'), 14)).toBe(false);
  });

  it('reminds on the day after the end and nine days later', () => {
    expect(isReviewReminderDay(d('2027-03-28'), d('2027-03-29'))).toBe(true);
    expect(isReviewReminderDay(d('2027-03-28'), d('2027-04-07'))).toBe(true);
    expect(isReviewReminderDay(d('2027-03-28'), d('2027-04-01'))).toBe(false);
  });

  it('averages scores with one decimal', () => {
    expect(computeRating([])).toBeNull();
    expect(computeRating([5, 4, 4])).toEqual({ avg: 4.3, count: 3 });
  });

  it('Casa Top needs both the average and the count', () => {
    expect(isTopHome(null, params)).toBe(false);
    expect(isTopHome({ avg: 5, count: 2 }, params)).toBe(false);
    expect(isTopHome({ avg: 4.4, count: 10 }, params)).toBe(false);
    expect(isTopHome({ avg: 4.5, count: 3 }, params)).toBe(true);
  });
});

describe('wantsChannel (FR-46, BR-44)', () => {
  it('defaults to on, respects opt-outs and never mutes service or legal notices', () => {
    expect(wantsChannel(undefined, 'MESSAGES', 'push')).toBe(true);
    expect(wantsChannel({ MESSAGES: { push: false } }, 'MESSAGES', 'push')).toBe(false);
    expect(wantsChannel({ MESSAGES: { push: false } }, 'MESSAGES', 'email')).toBe(true);
    expect(wantsChannel({ SERVICE: { email: false } }, 'SERVICE', 'email')).toBe(true);
    expect(wantsChannel({ LEGAL: { push: false } }, 'LEGAL', 'push')).toBe(true);
  });
});
