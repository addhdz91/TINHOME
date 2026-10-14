import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { HoldReason } from '@tinhome/shared/constants';
import type { Params } from '@tinhome/shared/types';
import { enqueueMailNow } from '../../core/email/queue.js';
import { publicUrl } from '../../core/public-url.js';
import { recomputeHome } from './visibility.js';

const HIGH_PRIORITY: readonly HoldReason[] = ['PHOTO_DUPLICATE'];

export interface HoldOptions {
  meta?: Record<string, unknown>;
  /** Serious reports are high priority too (P-35 high: 24 h). */
  high?: boolean;
  /** Hold the account instead of only the home (reports about a person or a message). */
  scope?: 'HOME' | 'USER';
}

/**
 * BR-42 / FR-69 — preventive hold of a home: not visible, deadline P-35, admin alert (N-26 in
 * real time via `adminAlerts`) and provisional statement to the owner (N-23).
 */
export async function holdHome(
  db: Firestore,
  uid: string,
  reason: HoldReason,
  params: Params,
  now: Date,
  options: HoldOptions = {},
): Promise<void> {
  const meta = options.meta ?? {};
  const scope = options.scope ?? 'HOME';
  const high = options.high ?? HIGH_PRIORITY.includes(reason);
  const hours = high
    ? params.preventiveHoldReviewHoursHighPriority
    : params.preventiveHoldReviewHours;
  const dueAt = Timestamp.fromMillis(now.getTime() + hours * 3_600_000);
  const homeRef = db.doc(scope === 'HOME' ? `homes/${uid}` : `users/${uid}`);
  const alreadyHeld = await db.runTransaction(async (tx) => {
    const snap = await tx.get(homeRef);
    if (!snap.exists) return true;
    if ((snap.get('moderationHold') as { active?: boolean } | null)?.active) return true;
    tx.update(homeRef, {
      moderationHold: { active: true, reason, since: FieldValue.serverTimestamp(), dueAt },
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(db.collection('adminAlerts').doc(), {
      type: reason === 'PHOTO_DUPLICATE' ? 'PHOTO_DUPLICATE' : 'HOLD_DUE',
      refType: scope === 'HOME' ? 'home' : 'user',
      refId: uid,
      priority: high ? 'HIGH' : 'NORMAL',
      reason,
      meta,
      dueAt,
      createdAt: FieldValue.serverTimestamp(),
      handledAt: null,
    });
    return false;
  });
  if (alreadyHeld) return;
  await recomputeHome(db, uid, params);
  const email = (await db.doc(`users/${uid}`).get()).get('email') as string | undefined;
  if (email) {
    await enqueueMailNow(
      db,
      {
        to: email,
        templateId: 'N-23',
        data: { reason, hours, homeUrl: `${publicUrl()}/app/mi-casa` },
      },
      now,
    );
  }
}

/** FR-69 — releases the preventive hold of a home and of the account (no strike). */
export async function releaseHolds(db: Firestore, uid: string, params: Params): Promise<boolean> {
  const refs = [db.doc(`homes/${uid}`), db.doc(`users/${uid}`)];
  const snaps = await db.getAll(...refs);
  let released = false;
  for (const snap of snaps) {
    if (!(snap.get('moderationHold') as { active?: boolean } | null)?.active) continue;
    await snap.ref.update({ moderationHold: null, updatedAt: FieldValue.serverTimestamp() });
    released = true;
  }
  if (released) await recomputeHome(db, uid, params);
  return released;
}
