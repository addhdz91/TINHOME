import { z } from 'zod/mini';
import { WAITLIST_MAX_WINDOWS } from '../constants/limits.js';
import { PARAM_DEFAULTS } from '../constants/params.js';

const Slug = z.string().check(z.minLength(1), z.maxLength(60), z.regex(/^[a-z0-9-]+$/));

/** FR-19 — joinWaitlist (05_API_CONTRACT.md §2.4). */
export const JoinWaitlistInput = z
  .object({
    // Trimmed and lower-cased before validation (users paste e-mails with spaces).
    email: z.pipe(z.string().check(z.trim(), z.toLowerCase()), z.email().check(z.maxLength(254))),
    cityId: Slug,
    // The real cap is P-23 (checked on the server with the live parameter).
    destinations: z.array(Slug).check(z.minLength(1), z.maxLength(PARAM_DEFAULTS.maxDestinations)),
    windowIds: z
      .array(z.string().check(z.minLength(1), z.maxLength(60)))
      .check(z.maxLength(WAITLIST_MAX_WINDOWS)),
    /** Version of `legalDocs/privacidad` the visitor accepted. */
    acceptPrivacy: z.string().check(z.minLength(1), z.maxLength(40)),
  })
  .check(
    z.refine((input) => new Set(input.destinations).size === input.destinations.length, {
      path: ['destinations'],
      message: 'duplicate',
    }),
    z.refine((input) => !input.destinations.includes(input.cityId), {
      path: ['destinations'],
      message: 'own_city',
    }),
  );
export type JoinWaitlistInput = z.infer<typeof JoinWaitlistInput>;

export const JoinWaitlistOutput = z.object({ ok: z.literal(true) });
export type JoinWaitlistOutput = z.infer<typeof JoinWaitlistOutput>;

/** FR-19 — confirmWaitlist (double opt-in). */
export const ConfirmWaitlistInput = z.object({
  token: z.string().check(z.minLength(20), z.maxLength(100), z.regex(/^[A-Za-z0-9_-]+$/)),
});
export type ConfirmWaitlistInput = z.infer<typeof ConfirmWaitlistInput>;

export const ConfirmWaitlistOutput = z.object({
  cityId: z.string(),
  position: z.optional(z.int().check(z.positive())),
});
export type ConfirmWaitlistOutput = z.infer<typeof ConfirmWaitlistOutput>;
