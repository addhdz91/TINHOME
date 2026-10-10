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

/** Minimum seconds between two verification e-mails (FR-02). */
export const VERIFY_EMAIL_RESEND_SECONDS = 60;

/** Sensitive actions (signOutEverywhere, deletion) need a sign-in this recent (05 §2.1). */
export const REAUTH_MAX_AGE_SECONDS = 5 * 60;

/** FR-71 — password policy (also configured in Identity Platform). */
export const PASSWORD_MIN_LENGTH = 10;

/** BR-01 — minimum age. */
export const MIN_AGE_YEARS = 18;

/** Oldest birth year accepted by the form (sanity check). */
export const MAX_AGE_YEARS = 110;

/** BR-39 — maximum accuracy (metres) of a location reading. */
export const LOCATION_MAX_ACCURACY_M = 200;

/** BR-39 — location readings per user and calendar day. */
export const LOCATION_ATTEMPTS_PER_DAY = 5;

/** AC-08.3 — maximum size of a verification document. */
export const VERIFICATION_FILE_MAX_BYTES = 10 * 1024 * 1024;

/** 05 §2.2 — lifetime of the signed URL of a verification document. */
export const VERIFICATION_URL_MINUTES = 5;

/** FR-48 — the admin session ends after this much inactivity. */
export const ADMIN_IDLE_MINUTES = 30;
