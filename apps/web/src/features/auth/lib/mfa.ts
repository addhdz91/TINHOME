import {
  getMultiFactorResolver,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorInfo,
  type MultiFactorResolver,
  type TotpSecret,
  type User,
} from 'firebase/auth';
import { authErrorCode } from '@/lib/auth-errors';
import { firebaseAuth } from '@/lib/firebase-auth';

/** FR-48 — resolver when the account has a second factor (admins), otherwise null. */
export function mfaResolver(error: unknown): MultiFactorResolver | null {
  if (authErrorCode(error) !== 'auth/multi-factor-auth-required') return null;
  return getMultiFactorResolver(firebaseAuth(), error as MultiFactorError);
}

export function isPhoneHint(
  hint: MultiFactorInfo,
): hint is MultiFactorInfo & { phoneNumber: string } {
  return hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID;
}

export async function resolveWithTotp(
  resolver: MultiFactorResolver,
  hint: MultiFactorInfo,
  code: string,
): Promise<void> {
  await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code));
}

let verifier: RecaptchaVerifier | null = null;

/** SMS second factor (used by the Auth emulator, which has no TOTP; 10_DECISIONS §5). */
export async function sendSmsCode(
  resolver: MultiFactorResolver,
  hint: MultiFactorInfo,
  containerId: string,
): Promise<string> {
  verifier?.clear();
  verifier = new RecaptchaVerifier(firebaseAuth(), containerId, { size: 'invisible' });
  return new PhoneAuthProvider(firebaseAuth()).verifyPhoneNumber(
    { multiFactorHint: hint, session: resolver.session },
    verifier,
  );
}

export async function resolveWithSms(
  resolver: MultiFactorResolver,
  verificationId: string,
  code: string,
): Promise<void> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  await resolver.resolveSignIn(PhoneMultiFactorGenerator.assertion(credential));
}

/** TOTP enrolment (first visit to /admin, 03 §12). */
export async function startTotpEnrollment(user: User): Promise<TotpSecret> {
  return TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession());
}

export async function finishTotpEnrollment(
  user: User,
  secret: TotpSecret,
  code: string,
): Promise<void> {
  await multiFactor(user).enroll(
    TotpMultiFactorGenerator.assertionForEnrollment(secret, code),
    'TOTP',
  );
}

export function hasEnrolledFactor(user: User): boolean {
  return multiFactor(user).enrolledFactors.length > 0;
}
