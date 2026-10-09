import { describe, expect, it } from 'vitest';
import { APP_ERROR_CODES, APP_ERRORS, isAppErrorCode } from './errors.js';

describe('error catalogue', () => {
  it('recognises catalogue codes only', () => {
    expect(isAppErrorCode('E_LIKE_LIMIT')).toBe(true);
    expect(isAppErrorCode('E_NOPE')).toBe(false);
    expect(isAppErrorCode('toString')).toBe(false);
    expect(isAppErrorCode(42)).toBe(false);
  });

  it('maps every code to an HttpsError code', () => {
    expect(APP_ERROR_CODES.length).toBeGreaterThan(60);
    expect(APP_ERRORS.E_INTERNAL).toBe('internal');
  });
});
