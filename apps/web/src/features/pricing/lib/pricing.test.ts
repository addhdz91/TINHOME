import { describe, expect, it } from 'vitest';
import { yearlySavingPercent } from './pricing';

describe('yearlySavingPercent', () => {
  it('compares the yearly price with 12 months', () => {
    expect(yearlySavingPercent(999, 7900)).toBe(34);
  });

  it('never returns a negative saving or divides by zero', () => {
    expect(yearlySavingPercent(500, 9000)).toBe(0);
    expect(yearlySavingPercent(0, 7900)).toBe(0);
  });
});
