import { describe, expect, it } from 'vitest';
import { accountPurgeAt, chatPurgeCutoff, gdprDueAt, sanitizeEventProps } from './privacy.js';

describe('privacy (BR-29, BR-30, J-14)', () => {
  const now = new Date('2026-10-14T10:00:00Z');
  it('computes due dates and the chat cutoff', () => {
    expect(gdprDueAt(now, 30).toISOString()).toBe('2026-11-13T10:00:00.000Z');
    expect(accountPurgeAt(now, 30).toISOString()).toBe('2026-11-13T10:00:00.000Z');
    expect(chatPurgeCutoff(now, 12).toISOString()).toBe('2025-10-14T10:00:00.000Z');
  });

  it('drops personal data from analytics properties', () => {
    expect(
      sanitizeEventProps({
        plan: 'YEARLY',
        email: 'a@b.es',
        source: 'laura@ejemplo.es',
        contact: '+34 600 000 000',
        userName: 'Laura',
        cards: 12,
        ok: true,
        bad: Number.NaN,
        long: 'x'.repeat(100),
      }),
    ).toEqual({ plan: 'YEARLY', cards: 12, ok: true, long: 'x'.repeat(60) });
    expect(sanitizeEventProps(undefined)).toEqual({});
  });
});
