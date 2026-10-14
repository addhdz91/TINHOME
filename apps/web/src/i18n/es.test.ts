import { describe, expect, it } from 'vitest';
import { APP_ERROR_CODES } from '@tinhome/shared/constants';
import es from './es.json';

const FORBIDDEN = [/alquil/i, /precio por noche/i, /tinder/i, /alojamiento gratis/i];
// Texts that mention renting only to say TinHome is not a rental: the contract error (05 §3)
// and the FR-42 report reason «alquiler encubierto» (and its moderation template).
const ALLOWED = new Set([
  es.errors.E_TEXT_VIOLATION,
  es.report.reasons.HIDDEN_RENTAL,
  es.admin.moderation.templates.HIDDEN_RENTAL.name,
]);

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings);
  return [];
}

describe('es.json', () => {
  it('has a user message for every AppErrorCode (05_API_CONTRACT.md §3)', () => {
    const missing = APP_ERROR_CODES.filter((code) => !(code in es.errors));
    expect(missing).toEqual([]);
  });

  it('never uses forbidden product language (CLAUDE.md §4.7)', () => {
    const offending = collectStrings(es)
      .filter((text) => !ALLOWED.has(text))
      .filter((text) => FORBIDDEN.some((re) => re.test(text)));
    expect(offending).toEqual([]);
  });
});
