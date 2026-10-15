import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { VERIFY_EMAIL_RESEND_SECONDS } from '@tinhome/shared/constants';
import { authErrorCode } from '@/lib/auth-errors';
import { firebaseAuth, popupResolver } from '@/lib/firebase-auth';

const RESEND_KEY = 'tinhome-verify-sent-at';
const REF_KEY = 'tinhome-ref';

export function signUpWithEmail(email: string, password: string): Promise<User> {
  return createUserWithEmailAndPassword(firebaseAuth(), email.trim(), password).then(
    (cred) => cred.user,
  );
}

export function signInWithEmail(email: string, password: string): Promise<User> {
  return signInWithEmailAndPassword(firebaseAuth(), email.trim(), password).then(
    (cred) => cred.user,
  );
}

export function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(firebaseAuth(), provider, popupResolver()).then((cred) => cred.user);
}

/** FR-02 — verification e-mail (Firebase template), back to step 2 of the onboarding. */
export async function sendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user, { url: `${window.location.origin}/app/onboarding/2` });
  try {
    window.localStorage.setItem(RESEND_KEY, String(Date.now()));
  } catch {
    // Storage disabled: the countdown simply restarts on reload.
  }
}

/** Seconds left before another verification e-mail can be sent (60 s, FR-02). */
export function resendCooldownSeconds(now = Date.now()): number {
  try {
    const sentAt = Number(window.localStorage.getItem(RESEND_KEY) ?? 0);
    return Math.max(0, Math.ceil((sentAt + VERIFY_EMAIL_RESEND_SECONDS * 1000 - now) / 1000));
  } catch {
    return 0;
  }
}

/** FR-03 — identical outcome whether the account exists or not. */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(firebaseAuth(), email.trim(), {
      url: `${window.location.origin}/entrar`,
    });
  } catch (error) {
    if (authErrorCode(error) === 'auth/user-not-found') return;
    throw error;
  }
}

/** Invitation code remembered from `/i/:code` until sign-up (BR-20). */
export function rememberReferral(code: string): void {
  try {
    window.localStorage.setItem(REF_KEY, code);
  } catch {
    // Without storage the code still travels in `?ref=`.
  }
}

export function rememberedReferral(): string | null {
  try {
    return window.localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

export function forgetReferral(): void {
  try {
    window.localStorage.removeItem(REF_KEY);
  } catch {
    // Nothing to clean.
  }
}
