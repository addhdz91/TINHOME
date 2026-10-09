/**
 * Error catalogue (05_API_CONTRACT.md §3). Each `AppErrorCode` maps to the `HttpsError` code the
 * server throws; the client shows `t('errors.' + code)`.
 */
export const APP_ERRORS = {
  E_VALIDATION: 'invalid-argument',
  E_UNAUTHENTICATED: 'unauthenticated',
  E_EMAIL_NOT_VERIFIED: 'failed-precondition',
  E_PHONE_NOT_VERIFIED: 'failed-precondition',
  E_PHONE_NOT_LINKED: 'failed-precondition',
  E_PHONE_NOT_ES: 'invalid-argument',
  E_UNDERAGE: 'failed-precondition',
  E_LEGAL_VERSION: 'failed-precondition',
  E_LEGAL_OUTDATED: 'failed-precondition',
  E_IDENTITY_NOT_APPROVED: 'failed-precondition',
  E_HOME_INCOMPLETE: 'failed-precondition',
  E_HOME_NOT_PUBLISHED: 'failed-precondition',
  E_DECLARATION_REQUIRED: 'failed-precondition',
  E_TEXT_VIOLATION: 'invalid-argument',
  E_PHOTOS_MIN: 'failed-precondition',
  E_CITY_NOT_OPEN: 'failed-precondition',
  E_NO_AVAILABILITY: 'failed-precondition',
  E_LIKE_LIMIT: 'resource-exhausted',
  E_RATE_LIMIT: 'resource-exhausted',
  E_SELF_LIKE: 'invalid-argument',
  E_SELF_BLOCK: 'invalid-argument',
  E_SELF_RESPONSE: 'invalid-argument',
  E_UNDO_LIMIT: 'resource-exhausted',
  E_NOT_FOUND: 'not-found',
  E_NOT_PARTICIPANT: 'permission-denied',
  E_ROLE_REQUIRED: 'permission-denied',
  E_MATCH_INACTIVE: 'failed-precondition',
  E_EXCHANGE_DATES: 'invalid-argument',
  E_EXCHANGE_CAPACITY: 'invalid-argument',
  E_EXCHANGE_PETS: 'invalid-argument',
  E_EXCHANGE_PENDING_EXISTS: 'already-exists',
  E_EXCHANGE_STATE: 'failed-precondition',
  E_HOME_STATE: 'failed-precondition',
  E_STATE: 'failed-precondition',
  E_REVIEW_WINDOW_CLOSED: 'failed-precondition',
  E_REVIEW_EXISTS: 'failed-precondition',
  E_PREMIUM_REQUIRED: 'permission-denied',
  E_ALREADY_SUBSCRIBED: 'failed-precondition',
  E_NO_SUBSCRIPTION: 'failed-precondition',
  E_WITHDRAWAL_EXPIRED: 'failed-precondition',
  E_WITHDRAWAL_USED: 'failed-precondition',
  E_FILES_MISSING: 'invalid-argument',
  E_LANDLORD_AUTH_REQUIRED: 'invalid-argument',
  E_VERIFICATION_PENDING: 'failed-precondition',
  E_ALREADY_APPROVED: 'failed-precondition',
  E_DOC_DUPLICATE: 'already-exists',
  E_ACCOUNT_SUSPENDED: 'permission-denied',
  E_ACCOUNT_BANNED: 'permission-denied',
  E_MFA_REQUIRED: 'permission-denied',
  E_REAUTH_REQUIRED: 'unauthenticated',
  E_REASON_REQUIRED: 'invalid-argument',
  E_STATEMENT_REQUIRED: 'invalid-argument',
  E_APPEAL_WINDOW_CLOSED: 'failed-precondition',
  E_APPEAL_EXISTS: 'failed-precondition',
  E_TOKEN_INVALID: 'invalid-argument',
  E_ALREADY_EXISTS: 'already-exists',
  E_CITY_UNKNOWN: 'invalid-argument',
  E_RANGE_INVALID: 'invalid-argument',
  E_FILES_PURGED: 'failed-precondition',
  E_SAME_ADMIN: 'failed-precondition',
  E_MESSAGE_TOO_LONG: 'invalid-argument',
  E_MESSAGE_LIMIT: 'resource-exhausted',
  E_PHONE_NOT_SHARED: 'failed-precondition',
  E_ON_HOLD: 'failed-precondition',
  E_LOCATION_INACCURATE: 'failed-precondition',
  E_LOCATION_ATTEMPTS: 'resource-exhausted',
  E_TICKET_CLOSED: 'failed-precondition',
  E_INTERNAL: 'internal',
} as const;

export type AppErrorCode = keyof typeof APP_ERRORS;
export type HttpsErrorCode = (typeof APP_ERRORS)[AppErrorCode];

export const APP_ERROR_CODES = Object.keys(APP_ERRORS) as AppErrorCode[];

/** Type guard for codes received from the network. */
export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === 'string' && Object.hasOwn(APP_ERRORS, value);
}
