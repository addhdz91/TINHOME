import { describe, expect, it } from 'vitest';
import { generateReferralCode, normalizeReferralCode, REFERRAL_ALPHABET } from './referral-code.js';

describe('referral codes', () => {
  it('generates 8 unambiguous characters', () => {
    const values = [0, 0.99999, 0.5, 0.1, 0.2, 0.3, 0.4, 0.6];
    let i = 0;
    const code = generateReferralCode(() => values[i++ % values.length] ?? 0);
    expect(code).toHaveLength(8);
    expect(Array.from(code).every((char) => REFERRAL_ALPHABET.includes(char))).toBe(true);
    expect(code).not.toMatch(/[01OIL]/);
  });

  it('normalises and validates input', () => {
    expect(normalizeReferralCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(normalizeReferralCode('ABCDEFG0')).toBeNull();
    expect(normalizeReferralCode('SHORT')).toBeNull();
  });
});
