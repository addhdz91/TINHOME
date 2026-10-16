import { describe, expect, it } from 'vitest';
import { requestIp } from './rate-limit.js';

describe('requestIp', () => {
  it('uses the address appended by Google, not one the client wrote first', () => {
    // `ip` is what Express derives with trust proxy (the leftmost, client-controlled entry).
    const spoofed = {
      ip: '1.2.3.4',
      headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.9' },
    };
    expect(requestIp(spoofed)).toBe('203.0.113.9');
    expect(
      requestIp({ ip: '9.9.9.9', headers: { 'x-forwarded-for': ['5.5.5.5', '198.51.100.7'] } }),
    ).toBe('198.51.100.7');
  });

  it('ignores malformed values and falls back to the socket address', () => {
    expect(requestIp({ ip: '203.0.113.1', headers: { 'x-forwarded-for': 'nope<script>' } })).toBe(
      '203.0.113.1',
    );
    expect(requestIp({ ip: '203.0.113.1', headers: {} })).toBe('203.0.113.1');
    expect(requestIp(undefined)).toBe('unknown');
  });
});
