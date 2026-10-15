import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { emulatorsEnabled, firebaseApp } from './firebase-app';

let auth: Auth | null = null;

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
