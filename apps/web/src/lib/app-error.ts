import type { TFunction } from 'i18next';
import { isAppErrorCode, type AppErrorCode } from '@tinhome/shared/constants';

/** Client-side error carrying a catalogue code (06_CODING_STANDARDS.md §8). */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fields: Record<string, string>;

  constructor(code: AppErrorCode, fields: Record<string, string> = {}) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.fields = fields;
  }
}

/** Maps anything thrown by a callable (FirebaseError with `details.code`) to `AppError`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (typeof error === 'object' && error !== null && 'details' in error) {
    const details = (error as { details?: unknown }).details;
    if (typeof details === 'object' && details !== null) {
      const { code, fields } = details as { code?: unknown; fields?: unknown };
      if (isAppErrorCode(code)) {
        return new AppError(
          code,
          typeof fields === 'object' && fields !== null ? (fields as Record<string, string>) : {},
        );
      }
    }
  }
  return new AppError('E_INTERNAL');
}

/** User-facing text for any error; never technical details. */
export function toUserMessage(t: TFunction, error: unknown): string {
  return t(`errors.${toAppError(error).code}`);
}
