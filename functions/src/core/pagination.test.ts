import { describe, expect, it } from 'vitest';
import { MAX_OFFSET, cursorOffset } from './pagination.js';

describe('cursorOffset', () => {
  it('caps the offset so a client cannot make the server skip (and pay for) huge ranges', () => {
    expect(cursorOffset(undefined)).toBe(0);
    expect(cursorOffset('40')).toBe(40);
    expect(cursorOffset('99999999')).toBe(MAX_OFFSET);
    expect(cursorOffset('-5')).toBe(0);
    expect(cursorOffset('abc')).toBe(0);
    expect(cursorOffset('1e9')).toBe(MAX_OFFSET);
  });
});
