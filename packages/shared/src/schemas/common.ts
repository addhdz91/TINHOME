import { z } from 'zod/mini';
import { isIsoDate } from '../domain/dates.js';
import type { IsoDate } from '../types/index.js';

/** `YYYY-MM-DD` calendar date that exists in the calendar. */
/** Input: string · output: `IsoDate` (the type guard narrows it). */
export const IsoDateSchema = z.pipe(
  z.string(),
  z.custom<IsoDate>((value) => typeof value === 'string' && isIsoDate(value), {
    message: 'invalid_iso_date',
  }),
);

/** 05_API_CONTRACT.md §1 — pagination input. */
export const PaginationInput = z.object({
  cursor: z.optional(z.string().check(z.minLength(1))),
  limit: z._default(z.int().check(z.gte(1), z.lte(50)), 20),
});
export type PaginationInput = z.infer<typeof PaginationInput>;

/** 05_API_CONTRACT.md §1 — idempotency key for callables that create resources. */
export const ClientRequestId = z.uuid();
