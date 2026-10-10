import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { pairKey } from '@tinhome/shared/domain';
import { appError } from '../../core/app-error.js';
import { iso } from '../verification/view.js';
import { closeMatch } from './matches.js';

/** FR-41 / BR-10 — mutual invisibility; closes the match and removes likes both ways. */
export async function blockUser(db: Firestore, uid: string, targetUid: string): Promise<void> {
  if (uid === targetUid) throw appError('E_SELF_BLOCK');
  const target = await db.doc(`users/${targetUid}`).get();
  if (!target.exists) throw appError('E_NOT_FOUND');
  const active = await db
    .collection('matches')
    .where('pairKey', '==', pairKey(uid, targetUid))
    .where('status', '==', 'ACTIVE')
    .get();
  await db.runTransaction(async (tx) => {
    const matches = await Promise.all(active.docs.map((doc) => tx.get(doc.ref)));
    tx.set(db.doc(`blocks/${uid}_${targetUid}`), {
      blockerUid: uid,
      blockedUid: targetUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    for (const match of matches) {
      if (match.get('status') === 'ACTIVE') closeMatch(db, tx, match, 'BLOCKED', uid);
    }
    tx.delete(db.doc(`likes/${uid}_${targetUid}`));
    tx.delete(db.doc(`likes/${targetUid}_${uid}`));
  });
}

/** Only the person who blocked can unblock (BR-10). The closed match is not restored. */
export async function unblockUser(db: Firestore, uid: string, targetUid: string): Promise<void> {
  const ref = db.doc(`blocks/${uid}_${targetUid}`);
  if (!(await ref.get()).exists) throw appError('E_NOT_FOUND');
  await ref.delete();
}

export async function listBlocked(
  db: Firestore,
  uid: string,
): Promise<{ uid: string; displayName: string; blockedAt: string }[]> {
  const blocks = await db.collection('blocks').where('blockerUid', '==', uid).get();
  if (blocks.empty) return [];
  const profiles = await db.getAll(
    ...blocks.docs.map((b) => db.doc(`publicProfiles/${String(b.get('blockedUid'))}`)),
  );
  return blocks.docs.map((block, i) => ({
    uid: String(block.get('blockedUid')),
    displayName: String(profiles[i]?.get('displayName') ?? ''),
    blockedAt: iso(block.get('createdAt')) ?? new Date(0).toISOString(),
  }));
}
