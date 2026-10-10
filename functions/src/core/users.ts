import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import type { UserStatus } from '@tinhome/shared/constants';
import { appError } from './app-error.js';
import { requireActive } from './guards.js';

/** Reads `users/{uid}` or throws E_NOT_FOUND. */
export async function loadUser(db: Firestore, uid: string): Promise<DocumentData> {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  return snap.data() ?? {};
}

/** Guards `ACT` and `PV` from the user document. */
export function requireUserActive(user: DocumentData): void {
  requireActive(user.status as UserStatus);
}

export function requirePhoneVerified(user: DocumentData): void {
  if ((user.verification as { phoneVerified?: boolean } | undefined)?.phoneVerified !== true) {
    throw appError('E_PHONE_NOT_VERIFIED');
  }
}
