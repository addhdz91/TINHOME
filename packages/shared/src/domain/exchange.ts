import type { ExchangePhase, ExchangeStatus } from '../constants/enums.js';
import type { IsoDate, Result } from '../types/common.js';
import { addDays, compareIsoDates, daysBetween } from './dates.js';

/** What one side brings to the other side's home. */
export interface ExchangeSide {
  uid: string;
  guests: number;
  pets: number;
}

/** The home each side travels to (the other person's home). */
export interface DestinationHome {
  maxGuests: number;
  petsAllowed: boolean;
}

export type ExchangeProposalError = 'E_EXCHANGE_DATES' | 'E_EXCHANGE_CAPACITY' | 'E_EXCHANGE_PETS';

/**
 * BR-15 — start ≥ today, end > start, 1 ≤ nights ≤ P-06, guests within the destination's
 * capacity (at least one person per side) and pets only where the destination allows them.
 * `destinations[uid]` is the home that `uid` travels to.
 */
export function validateExchangeProposal(input: {
  today: IsoDate;
  startDate: IsoDate;
  endDate: IsoDate;
  maxNights: number;
  sides: readonly ExchangeSide[];
  destinations: Readonly<Record<string, DestinationHome>>;
}): Result<{ nights: number }, ExchangeProposalError> {
  if (compareIsoDates(input.startDate, input.today) < 0)
    return { ok: false, error: 'E_EXCHANGE_DATES' };
  const nights = daysBetween(input.startDate, input.endDate);
  if (nights < 1 || nights > input.maxNights) return { ok: false, error: 'E_EXCHANGE_DATES' };
  for (const side of input.sides) {
    const destination = input.destinations[side.uid];
    if (!destination) return { ok: false, error: 'E_EXCHANGE_CAPACITY' };
    if (side.guests < 1 || side.guests > destination.maxGuests)
      return { ok: false, error: 'E_EXCHANGE_CAPACITY' };
    if (side.pets > 0 && !destination.petsAllowed) return { ok: false, error: 'E_EXCHANGE_PETS' };
  }
  return { ok: true, value: { nights } };
}

/** S-09 timeline step for a live exchange; `null` for DECLINED / EXPIRED / CANCELLED. */
export function exchangePhase(
  status: ExchangeStatus,
  dates: { startDate: IsoDate; endDate: IsoDate },
  today: IsoDate,
): ExchangePhase | null {
  if (status === 'PROPOSED') return 'PROPOSED';
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status !== 'CONFIRMED') return null;
  return compareIsoDates(today, dates.startDate) >= 0 ? 'IN_PROGRESS' : 'CONFIRMED';
}

/**
 * FR-31 / 05 §2.8 — a PROPOSED exchange can be withdrawn by whoever proposed it; a CONFIRMED one
 * by either person before the start date.
 */
export function canCancelExchange(
  exchange: { status: ExchangeStatus; proposedBy: string; startDate: IsoDate },
  uid: string,
  today: IsoDate,
): boolean {
  if (exchange.status === 'PROPOSED') return exchange.proposedBy === uid;
  if (exchange.status === 'CONFIRMED') return compareIsoDates(today, exchange.startDate) < 0;
  return false;
}

/** J-02 — a CONFIRMED exchange is completed once its end date has passed. */
export function isExchangeFinished(endDate: IsoDate, today: IsoDate): boolean {
  return compareIsoDates(endDate, today) < 0;
}

/** J-06 / N-09 — the reminder goes out three days before the start. */
export const EXCHANGE_REMINDER_DAYS = 3;
export function isReminderDay(startDate: IsoDate, today: IsoDate): boolean {
  return addDays(today, EXCHANGE_REMINDER_DAYS) === startDate;
}
