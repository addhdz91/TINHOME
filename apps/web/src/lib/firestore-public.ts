import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore/lite';
import { firebaseApp, emulatorsEnabled } from './firebase-app';

let instance: Firestore | null = null;

/** Firestore Lite: one-shot reads of public data (cities, windows, legal texts, config). */
function publicDb(): Firestore {
  if (instance) return instance;
  instance = getFirestore(firebaseApp());
  if (emulatorsEnabled()) connectFirestoreEmulator(instance, '127.0.0.1', 8080);
  return instance;
}

/** Reads one public document; `null` if it does not exist. */
export async function readPublicDoc(path: string): Promise<Record<string, unknown> | null> {
  const snapshot = await getDoc(doc(publicDb(), path));
  return snapshot.exists() ? snapshot.data() : null;
}

/** Reads a public collection with optional constraints. */
export async function readPublicCollection(
  path: string,
  ...constraints: QueryConstraint[]
): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const snapshot = await getDocs(query(collection(publicDb(), path), ...constraints));
  return snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));
}

export { limit, orderBy, where } from 'firebase/firestore/lite';
