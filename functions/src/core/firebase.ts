import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let firestore: Firestore | null = null;

/** Lazily initialised Admin SDK (emulator hosts come from the environment). */
export function db(): Firestore {
  if (firestore) return firestore;
  if (getApps().length === 0) initializeApp();
  firestore = getFirestore();
  // Optional fields of shared types may be `undefined`; never store them.
  firestore.settings({ ignoreUndefinedProperties: true });
  return firestore;
}

/** Admin Auth (emulator host from FIREBASE_AUTH_EMULATOR_HOST). */
export function adminAuth(): Auth {
  if (getApps().length === 0) initializeApp();
  return getAuth();
}
