import { HttpsError } from 'firebase-functions/v2/https';
import { APP_ERRORS, type AppErrorCode } from '@tinhome/shared/constants';

export interface AppErrorDetails {
  code: AppErrorCode;
  fields?: Record<string, string>;
  meta?: Record<string, unknown>;
}

/**
 * Builds the only error a callable may throw to the client (06_CODING_STANDARDS.md §6): an
 * `HttpsError` whose `details.code` is a catalogue code. The message is not user-facing.
 */
export function appError(
  code: AppErrorCode,
  extra: { fields?: Record<string, string>; meta?: Record<string, unknown> } = {},
): HttpsError {
  const details: AppErrorDetails = { code, ...extra };
  return new HttpsError(APP_ERRORS[code], code, details);
}

/** Normalises anything thrown inside a callable: catalogue errors pass through, the rest is E_INTERNAL. */
export function toAppError(error: unknown, requestId: string): HttpsError {
  if (error instanceof HttpsError) return error;
  return appError('E_INTERNAL', { meta: { requestId } });
}
