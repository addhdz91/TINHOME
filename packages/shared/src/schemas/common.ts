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

/**
 * A Firestore document id taken from the client: letters, digits, `_` and `-` only, so a value
 * like `a/messages/b` cannot address a subcollection (`db.doc(\`matches/${id}\`)`).
 */
export const DocId = z.string().check(z.regex(/^[A-Za-z0-9_-]{1,256}$/));

/** Screenshot uploaded by the person to `private/reports/{uid}/{uuid}` (ReportDialog). */
export const AttachmentPath = z
  .string()
  .check(
    z.regex(
      /^private\/reports\/[A-Za-z0-9_-]{1,128}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    ),
  );

/** 05_API_CONTRACT.md §1 — pagination input (a document id or a numeric offset). */
export const PaginationInput = z.object({
  cursor: z.optional(DocId),
  limit: z._default(z.int().check(z.gte(1), z.lte(50)), 20),
});
export type PaginationInput = z.infer<typeof PaginationInput>;

/** 05_API_CONTRACT.md §1 — idempotency key for callables that create resources. */
export const ClientRequestId = z.uuid();
