import { describe, expect, it } from 'vitest';
import type { IsoDate } from '../types/common.js';
import { ageOn, isAdult } from './age.js';

const d = (value: string): IsoDate => value as IsoDate;

describe('T-D01 · BR-01 adults only', () => {
  it('rejects the day before the 18th birthday and accepts the birthday itself', () => {
    expect(isAdult(d('2009-03-01'), d('2027-02-28'))).toBe(false);
    expect(isAdult(d('2009-03-01'), d('2027-03-01'))).toBe(true);
  });

  it('computes ages across months and years', () => {
    expect(ageOn(d('1990-12-31'), d('2027-01-01'))).toBe(36);
    expect(ageOn(d('1990-01-01'), d('2027-01-01'))).toBe(37);
  });

  it('handles people born on 29 February', () => {
    expect(ageOn(d('2008-02-29'), d('2026-02-28'))).toBe(17);
    expect(ageOn(d('2008-02-29'), d('2026-03-01'))).toBe(18);
    expect(isAdult(d('2008-02-29'), d('2026-03-01'))).toBe(true);
  });
});
