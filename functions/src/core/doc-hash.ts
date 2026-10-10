import { createHmac } from 'node:crypto';
import { defineSecret } from 'firebase-functions/params';
import { normalizeDocNumber } from '@tinhome/shared/domain';
import { appError } from './app-error.js';

/** ADR-008 — pepper of the document-number hash (Secret Manager in deployed environments). */
export const docHashPepper = defineSecret('DOC_HASH_PEPPER');

const LOCAL_PEPPER = 'local-only-pepper';

function pepper(): string {
  const value = process.env.DOC_HASH_PEPPER ?? '';
  if (value) return value;
  // Emulator and tests only; a deployed function without the secret must not hash anything.
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.VITEST) return LOCAL_PEPPER;
  throw appError('E_INTERNAL');
}

/** BR-25 — peppered hash of the document number; the number itself is never stored. */
export function docNumberHash(docNumber: string): string {
  return createHmac('sha256', pepper()).update(normalizeDocNumber(docNumber)).digest('hex');
}
