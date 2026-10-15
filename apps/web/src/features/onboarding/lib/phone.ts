import {
  linkWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase-auth';

/** FR-07 — Spanish mobile numbers only (6xx / 7xx, 9 digits). */
export function toSpanishMobile(input: string): string | null {
  const digits = input.replace(/[\s.-]/g, '').replace(/^(\+34|0034)/, '');
  return /^[67]\d{8}$/.test(digits) ? `+34${digits}` : null;
}

/** «+34 612 345 678» for the confirmation text. */
export function formatSpanishMobile(e164: string): string {
  const digits = e164.replace('+34', '');
  return `+34 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

let verifier: RecaptchaVerifier | null = null;

/**
 * Links the phone to the current account (one number per account is enforced by Firebase
 * Auth). Invisible reCAPTCHA attached to `containerId`; disabled in the emulator.
 */
export async function sendPhoneCode(
  user: User,
  e164: string,
  containerId: string,
): Promise<ConfirmationResult> {
  verifier?.clear();
  verifier = new RecaptchaVerifier(firebaseAuth(), containerId, { size: 'invisible' });
  return linkWithPhoneNumber(user, e164, verifier);
}
