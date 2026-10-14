import { describe, expect, it } from 'vitest';
import type { IsoDate } from '../types/common.js';
import {
  canCancelExchange,
  exchangePhase,
  isExchangeFinished,
  isReminderDay,
  validateExchangeProposal,
} from './exchange.js';

const d = (value: string): IsoDate => value as IsoDate;
const destinations = {
  // Keyed by traveller: Ana travels to a home for 2 without pets, Ben to one for 4 with pets.
  ana: { maxGuests: 2, petsAllowed: false },
  ben: { maxGuests: 4, petsAllowed: true },
};
const base = {
  today: d('2027-03-01'),
  startDate: d('2027-03-20'),
  endDate: d('2027-03-28'),
  maxNights: 60,
  sides: [
    { uid: 'ana', guests: 2, pets: 0 },
    { uid: 'ben', guests: 3, pets: 1 },
  ],
  destinations,
};

describe('validateExchangeProposal (BR-15)', () => {
  it('accepts a valid proposal and counts the nights', () => {
    expect(validateExchangeProposal(base)).toEqual({ ok: true, value: { nights: 8 } });
  });

  it('rejects past starts, empty or too long stays', () => {
    const fail = { ok: false, error: 'E_EXCHANGE_DATES' };
    expect(validateExchangeProposal({ ...base, startDate: d('2027-02-28') })).toEqual(fail);
    expect(validateExchangeProposal({ ...base, endDate: d('2027-03-20') })).toEqual(fail);
    expect(validateExchangeProposal({ ...base, maxNights: 7 })).toEqual(fail);
    expect(
      validateExchangeProposal({ ...base, startDate: d('2027-03-01'), endDate: d('2027-03-02') })
        .ok,
    ).toBe(true);
  });

  it('checks capacity and pets of the destination home', () => {
    expect(
      validateExchangeProposal({
        ...base,
        sides: [
          { uid: 'ana', guests: 3, pets: 0 },
          { uid: 'ben', guests: 1, pets: 0 },
        ],
      }),
    ).toEqual({ ok: false, error: 'E_EXCHANGE_CAPACITY' });
    expect(
      validateExchangeProposal({
        ...base,
        sides: [
          { uid: 'ana', guests: 1, pets: 1 },
          { uid: 'ben', guests: 1, pets: 0 },
        ],
      }),
    ).toEqual({ ok: false, error: 'E_EXCHANGE_PETS' });
    expect(
      validateExchangeProposal({ ...base, sides: [{ uid: 'zoe', guests: 1, pets: 0 }] }),
    ).toEqual({ ok: false, error: 'E_EXCHANGE_CAPACITY' });
    expect(
      validateExchangeProposal({ ...base, sides: [{ uid: 'ana', guests: 0, pets: 0 }] }),
    ).toEqual({ ok: false, error: 'E_EXCHANGE_CAPACITY' });
  });
});

describe('exchange lifecycle', () => {
  const dates = { startDate: d('2027-03-20'), endDate: d('2027-03-28') };

  it('derives the timeline phase', () => {
    expect(exchangePhase('PROPOSED', dates, d('2027-03-01'))).toBe('PROPOSED');
    expect(exchangePhase('CONFIRMED', dates, d('2027-03-19'))).toBe('CONFIRMED');
    expect(exchangePhase('CONFIRMED', dates, d('2027-03-20'))).toBe('IN_PROGRESS');
    expect(exchangePhase('COMPLETED', dates, d('2027-04-01'))).toBe('COMPLETED');
    expect(exchangePhase('CANCELLED', dates, d('2027-03-01'))).toBeNull();
  });

  it('only lets the proposer withdraw a proposal, and anyone cancel before the start', () => {
    const proposal = { status: 'PROPOSED' as const, proposedBy: 'ana', startDate: dates.startDate };
    expect(canCancelExchange(proposal, 'ana', d('2027-03-01'))).toBe(true);
    expect(canCancelExchange(proposal, 'ben', d('2027-03-01'))).toBe(false);
    const confirmed = { ...proposal, status: 'CONFIRMED' as const };
    expect(canCancelExchange(confirmed, 'ben', d('2027-03-19'))).toBe(true);
    expect(canCancelExchange(confirmed, 'ben', d('2027-03-20'))).toBe(false);
    expect(canCancelExchange({ ...proposal, status: 'COMPLETED' }, 'ana', d('2027-03-01'))).toBe(
      false,
    );
  });

  it('finishes after the end date and reminds three days before', () => {
    expect(isExchangeFinished(dates.endDate, d('2027-03-28'))).toBe(false);
    expect(isExchangeFinished(dates.endDate, d('2027-03-29'))).toBe(true);
    expect(isReminderDay(dates.startDate, d('2027-03-17'))).toBe(true);
    expect(isReminderDay(dates.startDate, d('2027-03-18'))).toBe(false);
  });
});
