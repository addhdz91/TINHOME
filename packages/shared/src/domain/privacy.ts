const DAY_MS = 86_400_000;

/** BR-30 — a GDPR request must be answered within P-16R days. */
export function gdprDueAt(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

/** BR-29 — personal data and photos are erased P-16 days after the request. */
export function accountPurgeAt(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

/** J-14 — closed chats keep their messages P-39 months after closing (calendar months, UTC). */
export function chatPurgeCutoff(now: Date, months: number): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
}

/** BR-29 — how a deleted person is shown on what stays (reviews). */
export const DELETED_USER_NAME = 'Usuario dado de baja';

const PII_KEY = /(e-?mail|phone|tel|name|nombre|uid|address|direcci|dni|nie|doc|ip|lat|lng)/i;
const PII_VALUE = /(@|\+?\d[\d\s-]{7,}\d)/;
const MAX_PROPS = 10;
const MAX_VALUE_LENGTH = 60;

/**
 * 03 §6 / rule 4 — analytics properties never carry personal data: keys that look like
 * identifiers and values that look like e-mails or phone numbers are dropped, strings are
 * shortened, at most 10 properties are kept.
 */
export function sanitizeEventProps(
  props: Record<string, string | number | boolean> | undefined,
): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props ?? {})) {
    if (Object.keys(clean).length >= MAX_PROPS) break;
    if (PII_KEY.test(key)) continue;
    if (typeof value === 'string') {
      if (PII_VALUE.test(value)) continue;
      clean[key] = value.slice(0, MAX_VALUE_LENGTH);
    } else if (typeof value === 'number') {
      if (Number.isFinite(value)) clean[key] = value;
    } else clean[key] = value;
  }
  return clean;
}
