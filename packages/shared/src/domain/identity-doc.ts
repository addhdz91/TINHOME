const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Upper-case, without spaces, dots or dashes («12.345.678-z» → «12345678Z»). */
export function normalizeDocNumber(value: string): string {
  return value.toUpperCase().replace(/[\s.-]/g, '');
}

/**
 * FR-08 — Spanish DNI (8 digits + letter) or NIE (X/Y/Z + 7 digits + letter) with a valid
 * check letter. The number itself is never stored, only its peppered hash (BR-25).
 */
export function isValidSpanishId(value: string): boolean {
  const doc = normalizeDocNumber(value);
  const match = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(doc);
  if (!match) return false;
  const [, prefix = '', digits = '', letter] = match;
  if (prefix === '' ? digits.length !== 8 : digits.length !== 7) return false;
  // NIE: X, Y and Z stand for 0, 1 and 2 in front of the seven digits.
  const number = Number(prefix === '' ? digits : `${String('XYZ'.indexOf(prefix))}${digits}`);
  return LETTERS.charAt(number % 23) === letter;
}
