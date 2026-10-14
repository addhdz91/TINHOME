import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { accountPurgeAt, DELETED_USER_NAME, dhashBands } from '@tinhome/shared/domain';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { sha256Hex } from '../../core/crypto.js';
import { logger, pseudonymize } from '../../core/logger.js';
import { publicUrl } from '../../core/public-url.js';
import { bucket } from '../../core/storage.js';
import { requireRecentSignIn } from '../account/service.js';
import { cancelExchange } from '../exchange/service.js';
import { recomputeHome } from '../home/visibility.js';
import type { PushSender } from '../notifications/push.js';
import { notify } from '../notifications/service.js';
import type { PaymentsGateway } from '../premium/gateway.js';

const LIVE_SUBSCRIPTION = ['active', 'trialing', 'past_due'];
const BATCH = 400;

const longDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
});

async function deleteQuery(db: Firestore, query: FirebaseFirestore.Query): Promise<number> {
  let total = 0;
  for (;;) {
    const page = await query.limit(BATCH).get();
    if (page.empty) return total;
    const batch = db.batch();
    for (const doc of page.docs) batch.delete(doc.ref);
    await batch.commit();
    total += page.size;
    if (page.size < BATCH) return total;
  }
}

/**
 * BR-29 — `requestAccountDeletion` (A, re-authenticated < 5 min). The account stops being
 * visible at once (home paused, open exchanges cancelled with notice to the other person),
 * Premium does not renew, every session is closed and N-18 confirms the erasure date.
 * Idempotent: a second call returns the same date.
 */
export async function requestAccountDeletion(
  db: Firestore,
  push: PushSender,
  payments: () => PaymentsGateway,
  uid: string,
  authTime: number | undefined,
  params: Params,
  now: Date,
): Promise<{ purgeAt: string }> {
  requireRecentSignIn(authTime, now);
  const userRef = db.doc(`users/${uid}`);
  const { at: purgeAt, already } = await db.runTransaction(async (tx) => {
    const [user, home] = await Promise.all([tx.get(userRef), tx.get(db.doc(`homes/${uid}`))]);
    if (!user.exists || user.get('status') === 'DELETED') throw appError('E_NOT_FOUND');
    const existing = (user.get('deletion') as { purgeAt?: Timestamp } | undefined)?.purgeAt;
    if (user.get('status') === 'DELETION_PENDING' && existing)
      return { at: existing.toDate(), already: true };
    const at = accountPurgeAt(now, params.accountPurgeDays);
    tx.update(userRef, {
      status: 'DELETION_PENDING',
      statusBeforeDeletion: (user.get('status') as string | undefined) ?? 'ACTIVE',
      deletion: { requestedAt: Timestamp.fromDate(now), purgeAt: Timestamp.fromDate(at) },
    });
    if (home.exists && home.get('status') === 'PUBLISHED')
      tx.update(home.ref, { status: 'PAUSED', pausedReason: 'ACCOUNT_DELETION' });
    return { at, already: false };
  });
  if (already) return { purgeAt: purgeAt.toISOString() };
  await recomputeHome(db, uid, params);

  const open = await db
    .collection('exchanges')
    .where('participants', 'array-contains', uid)
    .where('status', 'in', ['PROPOSED', 'CONFIRMED'])
    .get();
  for (const exchange of open.docs) {
    await cancelExchange(
      db,
      push,
      uid,
      { exchangeId: exchange.id, reason: 'Baja de la cuenta' },
      now,
    ).catch(() => {
      // Already started (BR-25): it simply ends; the other person keeps their record.
    });
  }

  const subscription = await db.doc(`subscriptions/${uid}`).get();
  const subscriptionId = subscription.get('stripeSubscriptionId') as string | undefined;
  if (subscriptionId && LIVE_SUBSCRIPTION.includes(String(subscription.get('status')))) {
    await payments()
      .cancelAtPeriodEnd(subscriptionId)
      .catch((error: unknown) => {
        logger.error('deletion: stripe cancel failed', {
          uid: pseudonymize(uid),
          cause: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
        });
      });
  }

  await notify(
    db,
    push,
    {
      uid,
      type: 'N-18',
      title: 'Solicitud de baja recibida',
      body: `Tus datos se borrarán el ${longDate.format(purgeAt)}.`,
      link: '/app/privacidad',
      mail: {
        templateId: 'N-18',
        data: { purgeDate: longDate.format(purgeAt), helpUrl: `${publicUrl()}/ayuda` },
      },
    },
    now,
  );
  await getAuth()
    .revokeRefreshTokens(uid)
    .catch(() => undefined);
  logger.info('account deletion requested', { uid: pseudonymize(uid) });
  return { purgeAt: purgeAt.toISOString() };
}

/**
 * J-05 / BR-29 — erases personal data and photos. Kept (blocked, superadmin only): reports,
 * moderation decisions, strikes, appeals, complaints, legal acceptances and billing
 * (subscriptions, entitlements). Written reviews stay as «Usuario dado de baja».
 */
export async function purgeAccount(db: Firestore, uid: string, now: Date): Promise<void> {
  const user = await db.doc(`users/${uid}`).get();
  if (!user.exists) return;
  const email = user.get('email') as string | undefined;
  const banned = user.get('statusBeforeDeletion') === 'BANNED';

  // Photos and their duplicate index (FR-64).
  const home = await db.doc(`homes/${uid}`).get();
  const photos = (home.get('photos') as { id: string; dhash?: string }[] | undefined) ?? [];
  await Promise.all(
    photos
      .filter((photo) => photo.dhash)
      .flatMap((photo) => {
        const entry = { homeId: uid, photoId: photo.id, dhash: String(photo.dhash) };
        return dhashBands(entry.dhash).map((band) =>
          db
            .doc(`photoHashIndex/${band}`)
            .set({ entries: FieldValue.arrayRemove(entry) }, { merge: true }),
        );
      }),
  );
  const countedCity = home.get('countedCityId') as string | null | undefined;
  if (countedCity) {
    await db
      .doc(`cities/${countedCity}`)
      .update({ 'counters.visibleCandidates': FieldValue.increment(-1) })
      .catch(() => undefined);
  }
  for (const prefix of [
    `homes/${uid}/`,
    `avatars/${uid}/`,
    `private/verifications/${uid}/`,
    `private/exports/gdpr/${uid}/`,
  ]) {
    await bucket()
      .deleteFiles({ prefix, force: true })
      .catch(() => undefined);
  }

  await db.recursiveDelete(db.doc(`homes/${uid}`));
  await db.doc(`publicProfiles/${uid}`).delete();
  await db.recursiveDelete(db.collection(`notifications/${uid}/items`));
  await db.doc(`notifications/${uid}`).delete();
  await db.recursiveDelete(db.collection(`users/${uid}/pushTokens`));
  await db.doc(`adminDirectory/${uid}`).delete();
  if (email) await db.doc(`waitlist/${sha256Hex(email.toLowerCase())}`).delete();

  for (const [collection, field] of [
    ['likes', 'fromUid'],
    ['likes', 'toUid'],
    ['passes', 'uid'],
    ['blocks', 'blockerUid'],
    ['blocks', 'blockedUid'],
    ['referralCodes', 'uid'],
    ['locationChecks', 'uid'],
  ] as const) {
    await deleteQuery(db, db.collection(collection).where(field, '==', uid));
  }
  const verifications = await db.collection('verifications').where('uid', '==', uid).get();
  for (const verification of verifications.docs) {
    const hash = verification.get('docNumberHash') as string | undefined;
    // An expelled person's document stays blocked against new accounts (FR-29 anti-evasion).
    if (hash && !banned) {
      const owner = await db.doc(`docHashes/${hash}`).get();
      if (owner.get('uid') === uid) await owner.ref.delete();
    }
    await verification.ref.delete();
  }

  // Chats: closed for the other person; what the deleted person wrote is erased.
  const matches = await db.collection('matches').where('participants', 'array-contains', uid).get();
  for (const match of matches.docs) {
    await deleteQuery(db, match.ref.collection('messages').where('senderUid', '==', uid));
    if (match.get('status') === 'ACTIVE') {
      await match.ref.update({
        status: 'UNMATCHED',
        closedAt: Timestamp.fromDate(now),
        closedBy: uid,
        activeExchangeId: null,
      });
    }
  }

  const reviews = await db.collection('reviews').where('authorUid', '==', uid).get();
  for (const review of reviews.docs) {
    await review.ref.update({ authorDisplayName: DELETED_USER_NAME, authorDeleted: true });
  }

  // Tombstone: no personal data, only what the retained records need.
  await db.doc(`users/${uid}`).set({
    status: 'DELETED',
    deletedAt: Timestamp.fromDate(now),
    deletionRequestedAt:
      (user.get('deletion') as { requestedAt?: Timestamp } | undefined)?.requestedAt ?? null,
  });
  await getAuth()
    .deleteUser(uid)
    .catch(() => undefined);
  logger.info('account purged', { uid: pseudonymize(uid) });
}

/** J-05 — 03:30 daily: accounts whose P-16 days are over. */
export async function purgeDueAccounts(db: Firestore, now: Date): Promise<number> {
  const pending = await db
    .collection('users')
    .where('status', '==', 'DELETION_PENDING')
    .limit(500)
    .get();
  let purged = 0;
  for (const user of pending.docs) {
    const purgeAt = (user.get('deletion') as { purgeAt?: Timestamp } | undefined)?.purgeAt;
    if (!purgeAt || purgeAt.toMillis() > now.getTime()) continue;
    await purgeAccount(db, user.id, now);
    purged += 1;
  }
  return purged;
}
