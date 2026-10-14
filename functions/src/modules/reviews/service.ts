import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import {
  computeRating,
  isReviewWindowOpen,
  isTopHome,
  toIsoDate,
  validateListingText,
} from '@tinhome/shared/domain';
import type { SubmitReviewInput, SubmitReviewOutput } from '@tinhome/shared/schemas';
import type { IsoDate, Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { publicUrl } from '../../core/public-url.js';
import { requireUserActive } from '../../core/users.js';
import type { PushSender } from '../notifications/push.js';
import { notify } from '../notifications/service.js';

const JOB_BATCH = 200;

/**
 * BR-13 — recomputes `homes.rating` / `isTop` and the owner's public profile from the
 * PUBLISHED reviews of a home. Hidden comments still count: only the comment is hidden (BR-16).
 */
export async function recomputeRating(
  db: Firestore,
  homeId: string,
  params: Params,
): Promise<void> {
  const published = await db
    .collection('reviews')
    .where('targetHomeId', '==', homeId)
    .where('status', '==', 'PUBLISHED')
    .select('overall')
    .get();
  const rating = computeRating(published.docs.map((doc) => Number(doc.get('overall'))));
  const top = isTopHome(rating, params);
  const home = db.doc(`homes/${homeId}`);
  const homeSnap = await home.get();
  if (!homeSnap.exists) return;
  const ownerUid = String(homeSnap.get('ownerUid') ?? homeId);
  const batch = db.batch();
  batch.update(home, { rating: rating ?? { avg: 0, count: 0 }, isTop: top });
  batch.set(
    db.doc(`publicProfiles/${ownerUid}`),
    { ratingAvg: rating?.avg ?? null, reviewsCount: rating?.count ?? 0, isTopHost: top },
    { merge: true },
  );
  await batch.commit();
}

async function displayName(db: Firestore, uid: string): Promise<string> {
  const profile = await db.doc(`publicProfiles/${uid}`).get();
  return String(profile.get('displayName') ?? 'Tu match');
}

async function announcePublished(
  db: Firestore,
  push: PushSender,
  exchange: DocumentSnapshot,
  now: Date,
): Promise<void> {
  const participants = exchange.get('participants') as string[];
  for (const uid of participants) {
    const otherName = await displayName(db, participants.find((p) => p !== uid) ?? '');
    const link = '/app/mi-casa';
    await notify(
      db,
      push,
      {
        uid,
        type: 'N-11',
        title: 'Valoraciones publicadas',
        body: `Ya puedes ver las valoraciones de tu intercambio con ${otherName}.`,
        link,
        mail: { templateId: 'N-11', data: { otherName, url: `${publicUrl()}${link}` } },
      },
      now,
    );
  }
}

/**
 * FR-32 / BR-16 — one review per person of a COMPLETED exchange, inside P-20 days after the end
 * date. Double blind: both are published when the second one arrives (or by J-03 at the end of
 * the window). Reviews are never editable.
 */
export async function submitReview(
  db: Firestore,
  push: PushSender,
  uid: string,
  input: SubmitReviewInput,
  params: Params,
  now: Date,
): Promise<SubmitReviewOutput> {
  const user = await db.doc(`users/${uid}`).get();
  if (!user.exists) throw appError('E_NOT_FOUND');
  requireUserActive(user.data() ?? {});
  const exchangeRef = db.doc(`exchanges/${input.exchangeId}`);
  const exchange = await exchangeRef.get();
  if (!exchange.exists) throw appError('E_NOT_FOUND');
  const participants = exchange.get('participants') as string[];
  if (!participants.includes(uid)) throw appError('E_NOT_PARTICIPANT');
  if (exchange.get('status') !== 'COMPLETED') throw appError('E_EXCHANGE_STATE');
  const endDate = String(exchange.get('endDate')) as IsoDate;
  if (!isReviewWindowOpen(endDate, toIsoDate(now), params.reviewWindowDays))
    throw appError('E_REVIEW_WINDOW_CLOSED');
  const comment = input.comment?.trim() ? input.comment.trim() : null;
  if (comment && !validateListingText(comment).ok) throw appError('E_TEXT_VIOLATION');

  const target = participants.find((p) => p !== uid) ?? '';
  const ref = db.doc(`reviews/${exchange.id}_${uid}`);
  const otherRef = db.doc(`reviews/${exchange.id}_${target}`);
  const authorDisplayName = await displayName(db, uid);
  const published = await db.runTransaction(async (tx) => {
    const [mine, theirs] = await Promise.all([tx.get(ref), tx.get(otherRef)]);
    if (mine.exists) throw appError('E_REVIEW_EXISTS');
    const timestamp = Timestamp.fromDate(now);
    const publishNow = theirs.exists;
    tx.create(ref, {
      exchangeId: exchange.id,
      authorUid: uid,
      authorDisplayName,
      targetUid: target,
      // Homes are keyed by their owner's uid.
      targetHomeId: target,
      overall: input.overall,
      sub: input.sub,
      comment,
      status: publishNow ? 'PUBLISHED' : 'PENDING',
      commentHidden: false,
      publishedAt: publishNow ? timestamp : null,
      createdAt: timestamp,
    });
    if (publishNow) tx.update(otherRef, { status: 'PUBLISHED', publishedAt: timestamp });
    return publishNow;
  });

  if (published) {
    await Promise.all([recomputeRating(db, target, params), recomputeRating(db, uid, params)]);
    await announcePublished(db, push, exchange, now);
  }
  return {
    review: {
      id: ref.id,
      status: published ? 'PUBLISHED' : 'PENDING',
      publishedAt: published ? now.toISOString() : null,
    },
    published,
  };
}

/**
 * J-03 — when the review window of a COMPLETED exchange has closed, any PENDING review is
 * published alone (the other person did not review in time).
 */
export async function publishExpiredReviews(
  db: Firestore,
  push: PushSender,
  params: Params,
  now: Date,
): Promise<number> {
  const due = await db
    .collection('exchanges')
    .where('status', '==', 'COMPLETED')
    .where('reviewDeadline', '<=', Timestamp.fromDate(now))
    .where('reviewsClosed', '==', false)
    .limit(JOB_BATCH)
    .get();
  let publishedCount = 0;
  for (const exchange of due.docs) {
    const pending = await db
      .collection('reviews')
      .where('exchangeId', '==', exchange.id)
      .where('status', '==', 'PENDING')
      .get();
    const batch = db.batch();
    for (const review of pending.docs) {
      batch.update(review.ref, { status: 'PUBLISHED', publishedAt: Timestamp.fromDate(now) });
    }
    batch.update(exchange.ref, { reviewsClosed: true });
    await batch.commit();
    if (pending.empty) continue;
    publishedCount += pending.size;
    const homes = new Set(pending.docs.map((review) => String(review.get('targetHomeId'))));
    for (const homeId of homes) await recomputeRating(db, homeId, params);
    await announcePublished(db, push, exchange, now);
  }
  return publishedCount;
}
