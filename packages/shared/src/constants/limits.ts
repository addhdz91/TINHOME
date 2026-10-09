/**
 * Technical limits that are not business parameters (no P-xx). Recorded in
 * docs/10_DECISIONS_AND_OPEN_ITEMS.md §5 (M1).
 */

/** joinWaitlist: requests per IP and hour (anti-abuse for a public callable). */
export const WAITLIST_IP_LIMIT_PER_HOUR = 10;

/** Minimum seconds between two confirmation e-mails to the same address (03 §7: 60 s). */
export const EMAIL_RESEND_SECONDS = 60;

/** Lifetime of a waitlist confirmation link. */
export const WAITLIST_TOKEN_TTL_DAYS = 7;

/** Maximum windows a visitor can pick in the waitlist form. */
export const WAITLIST_MAX_WINDOWS = 10;

/** Mail delivery attempts before marking a mailQueue item as FAILED (03 §5.4). */
export const MAIL_MAX_ATTEMPTS = 5;
