import { describe, expect, it } from 'vitest';
import { pseudonymize, redact } from './logger.js';

describe('redact', () => {
  it('removes sensitive keys and inline e-mails or phones', () => {
    expect(
      redact({
        callable: 'likeHome',
        email: 'laura@demo.tinhome',
        phoneE164: '+34600000000',
        nested: { idToken: 'abc', note: 'call me at +34 600 000 000 or laura@demo.tinhome' },
        list: ['ok', 'x@y.es'],
        durationMs: 12,
      }),
    ).toEqual({
      callable: 'likeHome',
      email: '[redacted]',
      phoneE164: '[redacted]',
      nested: { idToken: '[redacted]', note: 'call me at [redacted] or [redacted]' },
      list: ['ok', '[redacted]'],
      durationMs: 12,
    });
  });

  it('stops at a safe depth', () => {
    expect(redact({ a: { b: { c: { d: { e: { f: { g: 1 } } } } } } })).toEqual({
      a: { b: { c: { d: { e: { f: '[redacted]' } } } } },
    });
  });
});

describe('pseudonymize', () => {
  it('is stable and does not reveal the uid', () => {
    expect(pseudonymize('uid-1')).toBe(pseudonymize('uid-1'));
    expect(pseudonymize('uid-1')).not.toContain('uid-1');
    expect(pseudonymize('uid-1')).toHaveLength(12);
  });
});
