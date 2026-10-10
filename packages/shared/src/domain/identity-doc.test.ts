import { describe, expect, it } from 'vitest';
import { isValidSpanishId, normalizeDocNumber } from './identity-doc.js';

describe('Spanish ID (FR-08)', () => {
  it('normalizes spaces, dots and dashes', () => {
    expect(normalizeDocNumber(' 12.345.678-z ')).toBe('12345678Z');
  });

  it('accepts DNI and NIE with a valid letter', () => {
    expect(isValidSpanishId('12345678Z')).toBe(true);
    expect(isValidSpanishId('X1234567L')).toBe(true);
    expect(isValidSpanishId('Y1234567X')).toBe(true);
    expect(isValidSpanishId('Z1234567R')).toBe(true);
  });

  it('rejects a wrong letter or format', () => {
    expect(isValidSpanishId('12345678A')).toBe(false);
    expect(isValidSpanishId('X12345678L')).toBe(false);
    expect(isValidSpanishId('1234567Z')).toBe(false);
    expect(isValidSpanishId('')).toBe(false);
  });
});
