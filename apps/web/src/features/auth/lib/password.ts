import { PASSWORD_MIN_LENGTH } from '@tinhome/shared/constants';

/**
 * FR-71 — client-side check of the Identity Platform policy (≥ 10 characters with letters and
 * numbers, common passwords rejected). The server enforces length + number through Identity
 * Platform (`pnpm ops:auth`, scripts/configure-auth.ts); the emulator does not enforce it.
 */
const COMMON = new Set([
  '1234567890',
  '0123456789',
  'password123',
  'password1234',
  'contraseña1',
  'contrasena1',
  'contraseña123',
  'qwerty1234',
  'qwertyuiop1',
  'abc1234567',
  'abcd123456',
  'tinhome123',
  'tinhome2026',
  'tinhome2027',
  'iloveyou12',
  'madrid1234',
  'valencia123',
  'barcelona1',
  'espana1234',
  'españa1234',
]);

export type PasswordProblem = 'length' | 'letters_numbers' | 'common';

export function passwordProblem(password: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'length';
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'letters_numbers';
  if (COMMON.has(password.toLowerCase())) return 'common';
  return null;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';

/** Indicator for the sign-up form (S-02); only meaningful once the policy is met. */
export function passwordStrength(password: string): PasswordStrength {
  if (passwordProblem(password) !== null) return 'weak';
  let score = 0;
  if (password.length >= 14) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[^\p{L}\d]/u.test(password)) score += 1;
  return score >= 2 ? 'strong' : 'medium';
}
