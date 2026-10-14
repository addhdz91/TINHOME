import { describe, expect, it } from 'vitest';
import {
  isAppealOpen,
  reportDueAt,
  reportPriority,
  shouldHold,
  strikeExpiresAt,
  strikeSeverity,
  suggestedSanction,
} from './moderation.js';

const now = new Date('2027-03-01T10:00:00Z');

describe('reports (FR-42, FR-44)', () => {
  it('gives high priority and 24 h to serious reasons', () => {
    expect(reportPriority('PHOTOS_NOT_OWN')).toBe('HIGH');
    expect(reportPriority('HARASSMENT')).toBe('HIGH');
    expect(reportPriority('RUDE')).toBe('NORMAL');
    expect(reportDueAt('HIGH', now).toISOString()).toBe('2027-03-02T10:00:00.000Z');
    expect(reportDueAt('NORMAL', now).toISOString()).toBe('2027-03-04T10:00:00.000Z');
  });

  it('holds on a serious report from a verified user or on P-34 independent reports (BR-42)', () => {
    const base = { reporterVerified: true, independentReporters30d: 1, threshold: 2 };
    expect(shouldHold({ ...base, reason: 'PHOTOS_NOT_OWN' })).toBe('REPORT');
    expect(shouldHold({ ...base, reason: 'PHOTOS_NOT_OWN', reporterVerified: false })).toBeNull();
    expect(shouldHold({ ...base, reason: 'RUDE' })).toBeNull();
    expect(shouldHold({ ...base, reason: 'RUDE', independentReporters30d: 2 })).toBe(
      'REPORTS_THRESHOLD',
    );
  });
});

describe('strikes (BR-41)', () => {
  it('proposes warn → suspend → ban, and skips ahead for serious faults', () => {
    expect(suggestedSanction(1, 'MINOR', 3)).toBe('NONE');
    expect(suggestedSanction(2, 'MINOR', 3)).toBe('SUSPEND');
    expect(suggestedSanction(3, 'MINOR', 3)).toBe('BAN');
    expect(suggestedSanction(1, 'SERIOUS', 3)).toBe('SUSPEND');
    expect(suggestedSanction(2, 'SERIOUS', 3)).toBe('BAN');
    expect(strikeSeverity('FRAUD')).toBe('SERIOUS');
    expect(strikeSeverity(null)).toBe('MINOR');
  });

  it('expires strikes and closes appeals after their months', () => {
    expect(strikeExpiresAt(now, 12).toISOString()).toBe('2028-03-01T10:00:00.000Z');
    expect(isAppealOpen(now, new Date('2027-09-01T10:00:00Z'), 6)).toBe(true);
    expect(isAppealOpen(now, new Date('2027-09-01T10:00:01Z'), 6)).toBe(false);
  });
});
