import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseApp, emulatorsEnabled } from './firebase-app';
import { firebaseAuth } from './firebase-auth';

export { firebaseConfig, emulatorsEnabled } from './firebase-app';

export interface FirebaseClients {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let clients: FirebaseClients | null = null;

/**
 * Full clients for the signed-in app (real-time Firestore, Auth, Storage). Public pages use
 * the lighter `firestore-public.ts` and `callables.ts` instead (landing bundle size).
 */
export function firebase(): FirebaseClients {
  if (clients) return clients;
  const app = firebaseApp();
  const auth = firebaseAuth();
  const db = getFirestore(app);
  const storage = getStorage(app);
  if (emulatorsEnabled()) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  clients = { app, auth, db, storage };
  return clients;
}
