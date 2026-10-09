import type { z } from 'zod';
import { appError } from './app-error.js';

/**
 * Step 3 of the callable template: validate `request.data` with the shared zod schema.
 * Throws `E_VALIDATION` with one entry per invalid field (`path.to.field` → zod issue code).
 */
export function parseInput<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    fields[key] ??= issue.code;
  }
  throw appError('E_VALIDATION', { fields });
}
