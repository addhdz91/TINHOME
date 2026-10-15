import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { DEMO_PROJECT_ID } from '@tinhome/shared/constants';

export const emulatorsEnabled = (): boolean => import.meta.env.VITE_USE_EMULATORS === 'true';

/** Builds the Firebase config from `VITE_FIREBASE_*`; emulators work with demo values. */
export function firebaseConfig(env: ImportMetaEnv = import.meta.env): FirebaseOptions {
  const projectId = env.VITE_FIREBASE_PROJECT_ID ?? DEMO_PROJECT_ID;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`,
    appId: env.VITE_FIREBASE_APP_ID ?? 'demo-app-id',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  };
}

/** Single Firebase app shared by every client SDK; App Check outside the emulators. */
export function firebaseApp(): FirebaseApp {
  const existing = getApps()[0];
  if (existing) return existing;
  const app = initializeApp(firebaseConfig());
  const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY;
  if (siteKey && !emulatorsEnabled()) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return app;
}
