import { describe, expect, it } from 'vitest';
import { APP_ERROR_CODES } from '@tinhome/shared/constants';
import es from './es.json';

const FORBIDDEN = [/alquil/i, /precio por noche/i, /tinder/i, /alojamiento gratis/i];
// Contract text (05 §3) that mentions renting only to say TinHome is not a rental.
const ALLOWED = new Set([es.errors.E_TEXT_VIOLATION]);

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
