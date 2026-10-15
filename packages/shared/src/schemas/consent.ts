import { z } from 'zod/mini';
import { CONSENT_SOURCES, LEGAL_ACCEPTANCE_TYPES } from '../constants/enums.js';

/** Evidence of one acceptance, as the admin sees it (04 §2.21). */
export const ConsentRecordView = z.object({
  id: z.string(),
  uid: z.nullable(z.string()),
  type: z.enum(LEGAL_ACCEPTANCE_TYPES),
  slug: z.nullable(z.string()),
  version: z.string(),
  contentHash: z.nullable(z.string()),
  source: z.nullable(z.enum(CONSENT_SOURCES)),
  method: z.nullable(z.string()),
  consentText: z.nullable(z.string()),
  authProvider: z.nullable(z.string()),
  acceptedAt: z.nullable(z.string()),
  ipTruncated: z.nullable(z.string()),
  userAgent: z.nullable(z.string()),
});
export type ConsentRecordView = z.infer<typeof ConsentRecordView>;

/** `adminListConsents` (SADM): by account or by the e-mail a visitor used. */
export const AdminListConsentsInput = z
  .object({
    uid: z.optional(z.string().check(z.minLength(1), z.maxLength(128))),
    email: z.optional(z.email().check(z.maxLength(254))),
  })
  .check(
    z.refine((input) => Boolean(input.uid) !== Boolean(input.email), {
      message: 'uid_or_email',
      path: ['uid'],
    }),
  );
export const AdminListConsentsOutput = z.object({ items: z.array(ConsentRecordView) });
