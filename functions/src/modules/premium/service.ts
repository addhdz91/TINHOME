import { randomUUID } from 'node:crypto';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { REAUTH_MAX_AGE_SECONDS, type PremiumPlan } from '@tinhome/shared/constants';
import { canWithdraw, truncateIp, withdrawalRefundCents } from '@tinhome/shared/domain';
import type { GetReferralSummaryOutput } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { enqueueMailNow } from '../../core/email/queue.js';
import { currentLegalVersions } from '../../core/legal.js';
import { publicUrl } from '../../core/public-url.js';
import { loadUser, requireUserActive } from '../../core/users.js';
import { iso } from '../verification/view.js';
import { applySubscription } from './apply.js';
import { recomputePremium } from './entitlements.js';
import { LIVE_STATUSES } from './events.js';
import type { PaymentsGateway } from './gateway.js';

const YEAR_MS = 365 * 86_400_000;

function addPeriod(start: Date, plan: PremiumPlan): Date {
  const end = new Date(start.getTime());
  if (plan === 'YEARLY') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}

/** FR-35 — A, EV, ACT. Records the acceptance of the immediate start (WITHDRAWAL_START). */
export async function createCheckout(
  db: Firestore,
  gateway: PaymentsGateway,
  session: { uid: string; email: string },
  plan: PremiumPlan,
  ip: string,
  params: Params,
  now: Date,
): Promise<string> {
  const user = await loadUser(db, session.uid);
  requireUserActive(user);
  const subRef = db.doc(`subscriptions/${session.uid}`);
  const sub = await subRef.get();
  if (sub.exists && LIVE_STATUSES.includes(String(sub.get('status'))))
    throw appError('E_ALREADY_SUBSCRIBED');
  let customerId = sub.get('stripeCustomerId') as string | undefined;
  if (!customerId) {
    customerId = await gateway.createCustomer({ uid: session.uid, email: session.email });
    await subRef.set(
      { stripeCustomerId: customerId, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  const [terms] = await currentLegalVersions(db, ['terminos']);
  await db.collection('legalAcceptances').add({
    uid: session.uid,
    type: 'WITHDRAWAL_START',
    version: terms?.version ?? 'n/a',
    acceptedAt: FieldValue.serverTimestamp(),
    ipTruncated: truncateIp(ip),
    context: plan,
  });
  const base = `${publicUrl()}/app/premium`;
  const url = await gateway.createCheckout({
    uid: session.uid,
    customerId,
    plan,
    successUrl: `${base}?pago=ok`,
    cancelUrl: `${base}?pago=cancelado`,
  });
  if (gateway.name === 'simulated') {
    // Emulator: the payment «succeeds» at once, as the Stripe webhook would report it.
    await applySubscription(
      db,
      {
        id: `sub_sim_${randomUUID().slice(0, 8)}`,
        customerId,
        uid: session.uid,
        status: 'active',
        plan,
        currentPeriodStart: now,
        currentPeriodEnd: addPeriod(now, plan),
        cancelAtPeriodEnd: false,
      },
      now,
    );
    await subRef.set(
      {
        lastInvoiceAmountCents:
          plan === 'YEARLY' ? params.premiumYearlyPriceCents : params.premiumMonthlyPriceCents,
      },
      { merge: true },
    );
  }
  return url;
}

/** FR-36 — Stripe customer portal (cancel at period end, plan, card, invoices). */
export async function createPortal(
  db: Firestore,
  gateway: PaymentsGateway,
  uid: string,
): Promise<string> {
  const customerId = (await db.doc(`subscriptions/${uid}`).get()).get('stripeCustomerId') as
    string | undefined;
  if (!customerId) throw appError('E_NO_SUBSCRIPTION');
  return gateway.createPortal({ customerId, returnUrl: `${publicUrl()}/app/premium` });
}

/**
 * FR-37 / BR-34 — withdrawal within P-07D days of the first purchase, once: cancels at once,
 * refunds per P-07, revokes the STRIPE entitlement, audits and sends N-12 (durable medium).
 */
export async function withdraw(
  db: Firestore,
  gateway: PaymentsGateway,
  auth: { uid: string; authTime: number | null },
  params: Params,
  now: Date,
): Promise<{ refundedCents: number; endedAt: string }> {
  if (auth.authTime === null || now.getTime() / 1000 - auth.authTime > REAUTH_MAX_AGE_SECONDS) {
    throw appError('E_REAUTH_REQUIRED');
  }
  const user = await loadUser(db, auth.uid);
  const sub = await db.doc(`subscriptions/${auth.uid}`).get();
  const subscriptionId = sub.get('stripeSubscriptionId') as string | undefined;
  if (!subscriptionId || !LIVE_STATUSES.includes(String(sub.get('status'))))
    throw appError('E_NO_SUBSCRIPTION');
  if (user.withdrawalUsed === true) throw appError('E_WITHDRAWAL_USED');
  const firstSubscribedAt =
    user.firstSubscribedAt instanceof Timestamp ? user.firstSubscribedAt.toDate() : null;
  if (
    !canWithdraw({
      firstSubscribedAt,
      withdrawalUsed: false,
      withdrawalDays: params.withdrawalDays,
      now,
    })
  ) {
    throw appError('E_WITHDRAWAL_EXPIRED');
  }
  const periodStart = (sub.get('currentPeriodStart') as Timestamp | undefined)?.toDate() ?? now;
  const periodEnd = (sub.get('currentPeriodEnd') as Timestamp | undefined)?.toDate() ?? now;
  const refundedCents = withdrawalRefundCents({
    mode: params.withdrawalRefundMode,
    amountPaidCents: Number(sub.get('lastInvoiceAmountCents') ?? 0),
    periodStart,
    periodEnd,
    now,
  });
  await gateway.cancelAndRefund({ subscriptionId, refundCents: refundedCents });
  const batch = db.batch();
  batch.update(db.doc(`users/${auth.uid}`), {
    withdrawalUsed: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    sub.ref,
    {
      status: 'canceled',
      cancelAtPeriodEnd: false,
      withdrawnAt: FieldValue.serverTimestamp(),
      refundedCents,
    },
    { merge: true },
  );
  batch.set(
    db.doc(`entitlements/stripe-${subscriptionId}`),
    { revokedAt: Timestamp.fromDate(now) },
    { merge: true },
  );
  await batch.commit();
  await recomputePremium(db, auth.uid, now);
  await writeAudit({
    actorUid: auth.uid,
    actorRole: 'user',
    action: 'premium.withdraw',
    targetType: 'subscription',
    targetId: subscriptionId,
    after: { refundedCents, mode: params.withdrawalRefundMode },
  });
  if (typeof user.email === 'string') {
    await enqueueMailNow(
      db,
      {
        to: user.email,
        templateId: 'N-12',
        data: { kind: 'WITHDRAWN', amountCents: refundedCents, url: `${publicUrl()}/app/premium` },
      },
      now,
    );
  }
  return { refundedCents, endedAt: now.toISOString() };
}

/** FR-39 — code, link, invited people and rewards in the last 12 months (BR-20). */
export async function referralSummary(
  db: Firestore,
  uid: string,
  params: Params,
  now: Date,
): Promise<GetReferralSummaryOutput> {
  const user = await loadUser(db, uid);
  const code = String(user.referralCode ?? '');
  const referrals = await db.collection('referrals').where('inviterUid', '==', uid).get();
  const profiles = referrals.empty
    ? []
    : await db.getAll(
        ...referrals.docs.map((r) => db.doc(`publicProfiles/${String(r.get('inviteeUid'))}`)),
      );
  const rewardsThisYear = referrals.docs.filter((r) => {
    const at = r.get('rewardedAt') as Timestamp | undefined;
    return (
      r.get('status') === 'REWARDED' && at !== undefined && now.getTime() - at.toMillis() <= YEAR_MS
    );
  }).length;
  return {
    code,
    link: `${publicUrl()}/i/${code}`,
    invited: referrals.docs.map((r, i) => ({
      displayName: String(profiles[i]?.get('displayName') ?? ''),
      status: r.get('status') as GetReferralSummaryOutput['invited'][number]['status'],
      createdAt: iso(r.get('createdAt')),
    })),
    rewardsThisYear,
    maxRewards: params.referralMaxRewardsPerYear,
    rewardDays: params.referralRewardDays,
  };
}

/** Emulator only — what the Stripe portal / webhooks would do (10_DECISIONS §5, M7). */
export async function simulateStripe(
  db: Firestore,
  uid: string,
  action: 'CANCEL_AT_PERIOD_END' | 'RESUME' | 'RENEW' | 'PAYMENT_FAILED' | 'END_PERIOD',
  now: Date,
): Promise<void> {
  const sub = await db.doc(`subscriptions/${uid}`).get();
  const id = sub.get('stripeSubscriptionId') as string | undefined;
  if (!id) throw appError('E_NO_SUBSCRIPTION');
  const plan = (sub.get('plan') as PremiumPlan | undefined) ?? 'MONTHLY';
  const start = (sub.get('currentPeriodStart') as Timestamp).toDate();
  const end = (sub.get('currentPeriodEnd') as Timestamp).toDate();
  const snapshot = {
    id,
    customerId: String(sub.get('stripeCustomerId')),
    uid,
    status: String(sub.get('status')),
    plan,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: sub.get('cancelAtPeriodEnd') === true,
  };
  switch (action) {
    case 'CANCEL_AT_PERIOD_END':
      await applySubscription(db, { ...snapshot, cancelAtPeriodEnd: true }, now);
      break;
    case 'RESUME':
      await applySubscription(db, { ...snapshot, cancelAtPeriodEnd: false }, now);
      break;
    case 'RENEW':
      await applySubscription(
        db,
        { ...snapshot, currentPeriodStart: end, currentPeriodEnd: addPeriod(end, plan) },
        now,
      );
      break;
    case 'PAYMENT_FAILED':
      await applySubscription(db, { ...snapshot, status: 'past_due' }, now);
      break;
    case 'END_PERIOD':
      await applySubscription(db, { ...snapshot, status: 'canceled' }, now);
      break;
  }
}
