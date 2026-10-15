import { describe, expect, it } from 'vitest';
import { formatSpanishMobile, toSpanishMobile } from './phone';

describe('Spanish mobiles (FR-07)', () => {
  it('accepts 6xx/7xx with or without prefix and separators', () => {
    expect(toSpanishMobile('612 345 678')).toBe('+34612345678');
    expect(toSpanishMobile('+34 712-345-678')).toBe('+34712345678');
    expect(toSpanishMobile('0034612345678')).toBe('+34612345678');
  });

  it('rejects landlines, short numbers and other countries', () => {
    expect(toSpanishMobile('912345678')).toBeNull();
    expect(toSpanishMobile('61234567')).toBeNull();
    expect(toSpanishMobile('+33612345678')).toBeNull();
  });

  it('formats for display', () => {
    expect(formatSpanishMobile('+34612345678')).toBe('+34 612 345 678');
  });
});
