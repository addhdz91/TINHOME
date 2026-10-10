import {
  FieldValue,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import type { MatchStatus } from '@tinhome/shared/constants';
import { pairKey } from '@tinhome/shared/domain';
import { appError } from '../../core/app-error.js';

/** Loads a match the caller takes part in (E_NOT_FOUND / E_NOT_PARTICIPANT). */
export async function participantMatch(
  db: Firestore,
  uid: string,
  matchId: string,
): Promise<DocumentSnapshot> {
  const snap = await db.doc(`matches/${matchId}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  if (!(snap.get('participants') as string[]).includes(uid)) throw appError('E_NOT_PARTICIPANT');
  return snap;
}

export function otherParticipant(match: DocumentSnapshot, uid: string): string {
  return (match.get('participants') as string[]).find((p) => p !== uid) ?? '';
}

/** The ACTIVE match of two people, if any (its id may be `pairKey` or `pairKey_n`). */
export async function activeMatchBetween(
  db: Firestore,
  a: string,
  b: string,
): Promise<DocumentSnapshot | null> {
  const snaps = await db
    .collection('matches')
    .where('pairKey', '==', pairKey(a, b))
    .where('status', '==', 'ACTIVE')
    .limit(1)
    .get();
  return snaps.docs[0] ?? null;
}

/**
 * BR-09 — closes a match inside a transaction: both likes are deleted, the contact is hidden
 * (only ACTIVE matches show it) and an open exchange is cancelled. Messages stay locked for
 * moderation (BR-45): the rules only let participants read them while the match is ACTIVE.
 */
export function closeMatch(
  db: Firestore,
  tx: Transaction,
  match: DocumentSnapshot,
  status: Exclude<MatchStatus, 'ACTIVE'>,
  byUid: string,
): void {
  const [a = '', b = ''] = match.get('participants') as string[];
  const timestamp = FieldValue.serverTimestamp();
  tx.update(match.ref, { status, closedAt: timestamp, closedBy: byUid, lastActivityAt: timestamp });
  tx.delete(db.doc(`likes/${a}_${b}`));
  tx.delete(db.doc(`likes/${b}_${a}`));
  const exchangeId = match.get('activeExchangeId') as string | null;
  if (exchangeId) {
    tx.update(db.doc(`exchanges/${exchangeId}`), {
      status: 'CANCELLED',
      cancelledBy: byUid,
      cancelReason: status === 'BLOCKED' ? 'BLOCKED' : 'UNMATCHED',
      updatedAt: timestamp,
    });
  }
}

/** FR-27 — A. */
export async function unmatch(db: Firestore, uid: string, matchId: string): Promise<void> {
  await participantMatch(db, uid, matchId);
  await db.runTransaction(async (tx) => {
    const match = await tx.get(db.doc(`matches/${matchId}`));
    if (match.get('status') !== 'ACTIVE') throw appError('E_MATCH_INACTIVE');
    closeMatch(db, tx, match, 'UNMATCHED', uid);
  });
}

/** Removes `uid` from `unseenBy` (the «nuevo» badge of the match list). */
export async function markMatchSeen(db: Firestore, uid: string, matchId: string): Promise<void> {
  const match = await participantMatch(db, uid, matchId);
  await match.ref.update({ unseenBy: FieldValue.arrayRemove(uid) });
}
