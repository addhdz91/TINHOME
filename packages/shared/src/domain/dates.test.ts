import { describe, expect, it } from 'vitest';
import type { IsoDate } from '../types/common.js';
import {
  addDays,
  compareIsoDates,
  daysBetween,
  isIsoDate,
  parseIsoDate,
  startOfNextDay,
  toIsoDate,
} from './dates.js';

const d = (value: string): IsoDate => value as IsoDate;

describe('isIsoDate', () => {
  it('accepts real calendar dates', () => {
    expect(isIsoDate('2027-03-01')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it('rejects malformed or impossible dates', () => {
    expect(isIsoDate('2027-02-29')).toBe(false);
    expect(isIsoDate('2027-13-01')).toBe(false);
    expect(isIsoDate('2027-3-1')).toBe(false);
    expect(isIsoDate('2027-03-01T00:00:00Z')).toBe(false);
    expect(isIsoDate(20270301)).toBe(false);
  });
});

describe('parseIsoDate', () => {
  it('returns ok for a valid date and an error otherwise', () => {
    expect(parseIsoDate('2027-03-01')).toEqual({ ok: true, value: '2027-03-01' });
    expect(parseIsoDate('2027-02-30')).toEqual({ ok: false, error: 'INVALID_ISO_DATE' });
  });
});

describe('toIsoDate', () => {
  it('uses the Madrid calendar day, not UTC', () => {
    // 23:30 UTC on 28 Feb is already 1 Mar in Madrid (UTC+1).
    expect(toIsoDate(new Date('2027-02-28T23:30:00Z'))).toBe('2027-03-01');
    // Summer time (UTC+2): 22:30 UTC on 30 Jun is 1 Jul in Madrid.
    expect(toIsoDate(new Date('2027-06-30T22:30:00Z'))).toBe('2027-07-01');
  });

  it('supports the Canary Islands time zone', () => {
    expect(toIsoDate(new Date('2027-02-28T23:30:00Z'), 'Atlantic/Canary')).toBe('2027-02-28');
  });
});

describe('startOfNextDay', () => {
  it('returns Madrid midnight of the following day', () => {
    const now = new Date('2027-03-01T10:00:00+01:00');
    expect(startOfNextDay(now).toISOString()).toBe('2027-03-01T23:00:00.000Z');
  });

  it('handles the spring-forward DST change (28 Mar 2027)', () => {
    const now = new Date('2027-03-28T10:00:00+02:00');
    expect(startOfNextDay(now).toISOString()).toBe('2027-03-28T22:00:00.000Z');
  });

  it('handles the day before spring-forward (23-hour day)', () => {
    const now = new Date('2027-03-27T23:30:00+01:00');
    expect(startOfNextDay(now).toISOString()).toBe('2027-03-27T23:00:00.000Z');
  });

  it('handles the fall-back DST change (31 Oct 2027)', () => {
    const now = new Date('2027-10-30T12:00:00+02:00');
    expect(startOfNextDay(now).toISOString()).toBe('2027-10-30T22:00:00.000Z');
  });
});

describe('calendar arithmetic', () => {
  it('adds days across months, leap years and DST changes', () => {
    expect(addDays(d('2027-03-27'), 2)).toBe('2027-03-29');
    expect(addDays(d('2028-02-28'), 1)).toBe('2028-02-29');
    expect(addDays(d('2027-01-01'), -1)).toBe('2026-12-31');
  });

  it('counts days between dates', () => {
    expect(daysBetween(d('2027-03-20'), d('2027-03-28'))).toBe(8);
    expect(daysBetween(d('2027-03-28'), d('2027-03-20'))).toBe(-8);
    expect(daysBetween(d('2027-10-30'), d('2027-11-01'))).toBe(2);
  });

  it('compares dates chronologically', () => {
    expect(compareIsoDates(d('2027-03-01'), d('2027-03-02'))).toBe(-1);
    expect(compareIsoDates(d('2027-03-02'), d('2027-03-01'))).toBe(1);
    expect(compareIsoDates(d('2027-03-01'), d('2027-03-01'))).toBe(0);
  });
});
