import type { ErrorEvent } from '@sentry/react';

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /\+?\d[\d\s.-]{7,}\d/g;
const REDACTED = '[redacted]';

function scrubText(value: string): string {
  return value.replace(EMAIL, REDACTED).replace(PHONE, REDACTED);
}

/** Drops query string and fragment: they may carry tokens (`oobCode`, `ref`…). */
function scrubUrl(value: string): string {
  return scrubText(value.split(/[?#]/)[0] ?? '');
}

/**
 * NFR-13 / ADR-021 — removes personal data before an event leaves the browser: no user
 * identity, no IP, no cookies, no query strings, no e-mails or phone numbers in messages.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
    delete event.request.data;
    if (event.request.url) event.request.url = scrubUrl(event.request.url);
  }
  if (event.message) event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubText(exception.value);
  }
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message);
    if (breadcrumb.data) {
      for (const key of ['url', 'to', 'from'] as const) {
        const value: unknown = breadcrumb.data[key];
        if (typeof value === 'string') breadcrumb.data[key] = scrubUrl(value);
      }
    }
  }
  return event;
}

export const isSentryEnabled = (): boolean => Boolean(import.meta.env.VITE_SENTRY_DSN);

/** Initialises Sentry (EU ingest DSN) only when a DSN is configured. Loaded lazily. */
export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    // Sentry v11 replaces `sendDefaultPii: false` with `dataCollection` (same intent: no PII).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    sampleRate: 1,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    beforeSend: scrubEvent,
  });
}

/** Sends a deliberate error (used by /dev/brand to check the pipeline). */
export async function captureTestError(): Promise<void> {
  const Sentry = await import('@sentry/react');
  Sentry.captureException(new Error('TinHome Sentry test error'));
}
