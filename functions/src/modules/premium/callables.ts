import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '@tinhome/shared/constants';
import {
  CreateCheckoutSessionInput,
  DevSimulateStripeInput,
  EmptyInput,
  GetReferralSummaryOutput,
  OkOutput,
  UrlOutput,
  WithdrawSubscriptionInput,
  WithdrawSubscriptionOutput,
} from '@tinhome/shared/schemas';
import { appError } from '../../core/app-error.js';
import { defineCallable } from '../../core/callable.js';
import { clock } from '../../core/clock.js';
import { db } from '../../core/firebase.js';
import { requireAuth } from '../../core/guards.js';
import { logger } from '../../core/logger.js';
import { getParams } from '../../core/params.js';
import { publicUrl } from '../../core/public-url.js';
import { requestIp } from '../../core/rate-limit.js';
import { sessionOf } from '../discover/viewer.js';
import { applyPaymentEvent, applySubscription } from './apply.js';
import { isEmulated, paymentsGateway, stripeSecretKey, stripeWebhookSecret } from './gateway.js';
import * as premium from './service.js';

const secrets = [stripeSecretKey, stripeWebhookSecret];

/** FR-35 — A, EV, ACT. */
export const createCheckoutSession = defineCallable(
  'createCheckoutSession',
  { input: CreateCheckoutSessionInput, output: UrlOutput, secrets },
  async ({ input, request, now }) => {
    const session = sessionOf(request);
    const url = await premium.createCheckout(
      db(),
      paymentsGateway(publicUrl()),
      session,
      input.plan,
      requestIp(request.rawRequest),
      await getParams(),
      now,
    );
    return { url };
  },
);

/** FR-36 — A. */
export const createPortalSession = defineCallable(
  'createPortalSession',
  { input: EmptyInput, output: UrlOutput, secrets },
  async ({ request }) => ({
    url: await premium.createPortal(db(), paymentsGateway(publicUrl()), requireAuth(request).uid),
  }),
);

/** FR-37 — A (signed in during the last 5 minutes). */
export const withdrawSubscription = defineCallable(
  'withdrawSubscription',
  { input: WithdrawSubscriptionInput, output: WithdrawSubscriptionOutput, secrets },
  async ({ request, now }) => {
    const auth = requireAuth(request);
    const authTime = request.auth?.token.auth_time;
    return premium.withdraw(
      db(),
      paymentsGateway(publicUrl()),
      { uid: auth.uid, authTime: typeof authTime === 'number' ? authTime : null },
      await getParams(),
      now,
    );
  },
);

/** FR-39 — A, EV. */
export const getReferralSummary = defineCallable(
  'getReferralSummary',
  { input: EmptyInput, output: GetReferralSummaryOutput },
  async ({ request, now }) =>
    premium.referralSummary(db(), sessionOf(request).uid, await getParams(), now),
);

/** Emulator only: simulated portal and webhooks (never deployed behaviour). */
export const devSimulateStripe = defineCallable(
  'devSimulateStripe',
  { input: DevSimulateStripeInput, output: OkOutput },
  async ({ input, request, now }) => {
    if (!isEmulated() || process.env.STRIPE_SECRET_KEY) throw appError('E_NOT_FOUND');
    await premium.simulateStripe(db(), requireAuth(request).uid, input.action, now);
    return { ok: true as const };
  },
);

/**
 * 05 §3 — Stripe webhook: signature verified with STRIPE_WEBHOOK_SECRET, idempotent by event
 * id, answers fast. Unknown events are acknowledged and ignored.
 */
export const stripeWebhook = onRequest(
  { region: REGION, secrets, memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    const signature = req.header('stripe-signature');
    if (!signature) {
      res.status(400).send('Missing signature');
      return;
    }
    let event;
    try {
      event = paymentsGateway(publicUrl()).parseWebhook(req.rawBody, signature);
    } catch {
      logger.warn('stripe webhook rejected');
      res.status(400).send('Invalid signature');
      return;
    }
    try {
      const result = await applyPaymentEvent(db(), event, clock.now());
      res.status(200).json({ received: true, result });
    } catch (error) {
      logger.error('stripe webhook failed', {
        kind: event.kind,
        cause: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
      });
      res.status(500).send('Error');
    }
  },
);

/** J-09 — 05:00 daily: reconciles live subscriptions with Stripe (lost webhooks). */
export const jobReconcileSubscriptions = onSchedule(
  { region: REGION, timeZone: 'Europe/Madrid', schedule: '0 5 * * *', secrets },
  async () => {
    const gateway = paymentsGateway(publicUrl());
    const live = await db()
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing', 'past_due'])
      .get();
    let synced = 0;
    for (const sub of live.docs) {
      const id = sub.get('stripeSubscriptionId') as string | undefined;
      const snapshot = id ? await gateway.retrieveSubscription(id) : null;
      if (snapshot) {
        await applySubscription(db(), { ...snapshot, uid: snapshot.uid || sub.id }, clock.now());
        synced += 1;
      }
    }
    logger.info('J-09', { live: live.size, synced });
  },
);
