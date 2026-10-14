import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { enqueueMailNow } from '../../core/email/queue.js';
import { logger, pseudonymize } from '../../core/logger.js';
import { publicUrl } from '../../core/public-url.js';
import { recomputePremium } from './entitlements.js';
import { LIVE_STATUSES, type PaymentEvent, type SubscriptionSnapshot } from './events.js';

async function emailOf(db: Firestore, uid: string): Promise<string | null> {
  const email = (await db.doc(`users/${uid}`).get()).get('email') as string | undefined;
  return email ?? null;
}

/** Subscription → `subscriptions/{uid}` + the STRIPE entitlement (ends with the paid period). */
export async function applySubscription(
  db: Firestore,
  sub: SubscriptionSnapshot,
  now: Date,
): Promise<void> {
  if (!sub.uid) return;
  const live = LIVE_STATUSES.includes(sub.status);
  const userRef = db.doc(`users/${sub.uid}`);
  await db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    tx.set(
      db.doc(`subscriptions/${sub.uid}`),
      {
        stripeCustomerId: sub.customerId,
        stripeSubscriptionId: sub.id,
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: Timestamp.fromDate(sub.currentPeriodStart),
        currentPeriodEnd: Timestamp.fromDate(sub.currentPeriodEnd),
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(
      db.doc(`entitlements/stripe-${sub.id}`),
      {
        uid: sub.uid,
        source: 'STRIPE',
        startsAt: Timestamp.fromDate(sub.currentPeriodStart),
        endsAt: Timestamp.fromDate(sub.currentPeriodEnd),
        refId: sub.id,
        revokedAt: live ? null : Timestamp.fromDate(now),
      },
      { merge: true },
    );
    if (live && !user.get('firstSubscribedAt'))
      tx.update(userRef, { firstSubscribedAt: Timestamp.fromDate(now) });
  });
  await recomputePremium(db, sub.uid, now);
}

/**
 * 03 §10 — applies a payment event once (`stripeEvents/{id}`). Webhooks can arrive repeated
 * and out of order; the subscription snapshot always carries the current state.
 */
export async function applyPaymentEvent(
  db: Firestore,
  event: PaymentEvent,
  now: Date,
): Promise<'APPLIED' | 'DUPLICATE'> {
  const marker = db.doc(`stripeEvents/${event.id}`);
  const fresh = await db.runTransaction(async (tx) => {
    if ((await tx.get(marker)).exists) return false;
    tx.create(marker, {
      kind: event.kind,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now.getTime() + 90 * 86_400_000),
    });
    return true;
  });
  if (!fresh) return 'DUPLICATE';

  switch (event.kind) {
    case 'CHECKOUT_COMPLETED':
      if (event.uid) {
        await db.doc(`subscriptions/${event.uid}`).set(
          {
            stripeCustomerId: event.customerId,
            stripeSubscriptionId: event.subscriptionId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
      break;
    case 'SUBSCRIPTION_UPSERT':
      await applySubscription(db, event.subscription, now);
      break;
    case 'SUBSCRIPTION_DELETED':
      if (event.uid) {
        await db
          .doc(`entitlements/stripe-${event.subscriptionId}`)
          .set({ revokedAt: Timestamp.fromDate(now) }, { merge: true });
        await db
          .doc(`subscriptions/${event.uid}`)
          .set({ status: 'canceled', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        await recomputePremium(db, event.uid, now);
      }
      break;
    case 'INVOICE_PAID': {
      if (!event.uid) break;
      await db
        .doc(`subscriptions/${event.uid}`)
        .set({ lastInvoiceAmountCents: event.amountCents }, { merge: true });
      const email = event.firstInvoice ? null : await emailOf(db, event.uid);
      if (email) {
        await enqueueMailNow(
          db,
          {
            to: email,
            templateId: 'N-12',
            data: {
              kind: 'RENEWED',
              amountCents: event.amountCents,
              url: `${publicUrl()}/app/premium`,
            },
          },
          now,
        );
      }
      break;
    }
    case 'INVOICE_FAILED': {
      const email = event.uid ? await emailOf(db, event.uid) : null;
      if (email) {
        await enqueueMailNow(
          db,
          {
            to: email,
            templateId: 'N-12',
            data: { kind: 'PAYMENT_FAILED', amountCents: 0, url: `${publicUrl()}/app/premium` },
          },
          now,
        );
      }
      break;
    }
    case 'IGNORED':
      break;
  }
  logger.info('payment event', {
    kind: event.kind,
    uid: 'uid' in event ? pseudonymize(event.uid) : null,
  });
  return 'APPLIED';
}
