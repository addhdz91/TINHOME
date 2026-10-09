import { z } from 'zod';
import { isIsoDate } from '../domain/dates.js';

/** `YYYY-MM-DD` calendar date that exists in the calendar. */
/** Input: string · output: `IsoDate` (the type guard narrows it). */
export const IsoDateSchema = z.string().refine(isIsoDate, { message: 'invalid_iso_date' });

/** 05_API_CONTRACT.md §1 — pagination input. */
export const PaginationInput = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type PaginationInput = z.infer<typeof PaginationInput>;

/** 05_API_CONTRACT.md §1 — idempotency key for callables that create resources. */
export const ClientRequestId = z.uuid();
