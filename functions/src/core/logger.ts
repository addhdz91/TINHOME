import { createHash } from 'node:crypto';
import * as firebaseLogger from 'firebase-functions/logger';

/** Keys that must never reach the logs (NFR, 06_CODING_STANDARDS.md §6). */
const SENSITIVE_KEY =
  /email|phone|token|password|secret|docnumber|document|iban|url|address|name|birth/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /\+?\d[\d\s.-]{7,}\d/g;
const REDACTED = '[redacted]';

/** Stable pseudonym for a uid so logs can be correlated without exposing identifiers. */
export function pseudonymize(uid: string): string {
  return createHash('sha256').update(uid).digest('hex').slice(0, 12);
}

/** Removes personal data from a structured log payload (recursively). */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return REDACTED;
  if (typeof value === 'string') return value.replace(EMAIL, REDACTED).replace(PHONE, REDACTED);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(inner, depth + 1);
    }
    return out;
  }
  return value;
}

type Fields = Record<string, unknown>;

/** Structured logger with PII scrubbing. Use `uid: pseudonymize(uid)` when a user is involved. */
export const logger = {
  debug: (message: string, fields: Fields = {}): void =>
    firebaseLogger.debug(message, redact(fields)),
  info: (message: string, fields: Fields = {}): void =>
    firebaseLogger.info(message, redact(fields)),
  warn: (message: string, fields: Fields = {}): void =>
    firebaseLogger.warn(message, redact(fields)),
  error: (message: string, fields: Fields = {}): void =>
    firebaseLogger.error(message, redact(fields)),
};
