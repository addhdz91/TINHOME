import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
  type PopupRedirectResolver,
  type User,
} from 'firebase/auth';
import { emulatorsEnabled, firebaseApp } from './firebase-app';

let auth: Auth | null = null;
let settled = false;

/**
 * Auth only (NFR-02): sign-in, sign-up and the session gate need just this SDK, so they do
 * not download Firestore and Storage before the first paint. `firebase()` reuses it.
 */
export function firebaseAuth(): Auth {
  if (auth) return auth;
  // Same persistence as `getAuth`, but without the popup resolver: `getAuth` preloads Google's
  // `apis.google.com` iframe on every page. It is passed only to the popup calls (NFR-02).
  auth = initializeAuth(firebaseApp(), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  });
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

/** For `signInWithPopup` / `reauthenticateWithPopup` only (loaded when the user taps Google). */
export function popupResolver(): PopupRedirectResolver {
  return browserPopupRedirectResolver;
}
