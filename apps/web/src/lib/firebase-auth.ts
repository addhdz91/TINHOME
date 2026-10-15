import { connectAuthEmulator, getAuth, type Auth, type User } from 'firebase/auth';
import { emulatorsEnabled, firebaseApp } from './firebase-app';

let auth: Auth | null = null;
let settled = false;

/**
 * Auth only (NFR-02): sign-in, sign-up and the session gate need just this SDK, so they do
 * not download Firestore and Storage before the first paint. `firebase()` reuses it.
 */
export function firebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(firebaseApp());
  auth.languageCode = 'es';
  if (emulatorsEnabled()) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    // The Auth emulator does not run reCAPTCHA for phone verification.
    auth.settings.appVerificationDisabledForTesting = true;
  }
  return auth;
}

/** Resolves once Firebase knows whether someone is signed in (persisted session read). */
export async function settledAuthUser(): Promise<User | null> {
  const instance = firebaseAuth();
  await instance.authStateReady();
  settled = true;
  return instance.currentUser;
}

/**
 * The user if `settledAuthUser()` already resolved, otherwise `undefined` (still loading). Lets
 * the session start in its final state when a prerendered page is hydrated (NFR-02).
 */
export function knownAuthUser(): User | null | undefined {
  return settled ? firebaseAuth().currentUser : undefined;
}
