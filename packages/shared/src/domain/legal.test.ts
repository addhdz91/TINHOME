import { describe, expect, it } from 'vitest';
import { pendingLegalDocs, truncateIp } from './legal.js';

describe('pendingLegalDocs', () => {
  const current = [
    { slug: 'terminos', version: '2', requiresReacceptance: true },
    { slug: 'privacidad', version: '3', requiresReacceptance: false },
  ];

  it('asks again only for new versions that require it, and for never-accepted texts', () => {
    expect(pendingLegalDocs({ terminos: '1', privacidad: '2' }, current)).toEqual([current[0]]);
    expect(pendingLegalDocs({ terminos: '2', privacidad: '3' }, current)).toEqual([]);
    expect(pendingLegalDocs({ terminos: '2' }, current)).toEqual([current[1]]);
  });
});

describe('truncateIp', () => {
  it('keeps only the network part', () => {
    expect(truncateIp('203.0.113.77')).toBe('203.0.113.0/24');
    expect(truncateIp('::ffff:198.51.100.9')).toBe('198.51.100.0/24');
    expect(truncateIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe('2001:db8:85a3::/48');
    expect(truncateIp('nonsense')).toBe('unknown');
  });
});
