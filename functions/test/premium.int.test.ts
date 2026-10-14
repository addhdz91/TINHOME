import { Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import { applyPaymentEvent } from '../src/modules/premium/apply.js';
import {
  createCheckoutSession,
  createPortalSession,
  devSimulateStripe,
  getReferralSummary,
  withdrawSubscription,
} from '../src/modules/premium/callables.js';
import { recomputePremium } from '../src/modules/premium/entitlements.js';
import { StripeGateway } from '../src/modules/premium/gateway.js';
import { authedRequest, clearFirestore, errorCode, seedLegal, type TestToken } from './helpers.js';

const NOW = '2027-03-01T10:00:00+01:00';
const nowSeconds = () => Math.floor(new Date(NOW).getTime() / 1000);
const laura: TestToken = {
  uid: 'laura',
  email: 'laura@ejemplo.es',
  email_verified: true,
  auth_time: nowSeconds(),
};

async function premiumUntil(uid = 'laura'): Promise<string | null> {
  const value = (await db().doc(`users/${uid}`).get()).get('premiumUntil') as Timestamp | null;
  return value ? value.toDate().toISOString() : null;
}

beforeEach(async () => {
  await clearFirestore();
  await seedLegal();
  setClock(fixedClock(NOW));
  await db().doc('users/laura').set({
    email: 'laura@ejemplo.es',
    status: 'ACTIVE',
    referralCode: 'CASAMAD2',
    premiumUntil: null,
    withdrawalUsed: false,
  });
  await db().doc('homes/laura').set({ ownerUid: 'laura', ownerPremium: false });
});

afterEach(() => resetClock());

describe('checkout (FR-35, simulated gateway in the emulator)', () => {
  it('records the immediate-start acceptance and activates Premium for the period', async () => {
    const { url } = await createCheckoutSession.run(
      authedRequest({ plan: 'MONTHLY', acceptImmediateStart: true }, laura),
    );
    expect(url).toContain('/app/premium?pago=ok');
    expect(await premiumUntil()).toBe('2027-04-01T09:00:00.000Z');
    const sub = (await db().doc('subscriptions/laura').get()).data();
    expect(sub).toMatchObject({
      plan: 'MONTHLY',
      status: 'active',
      cancelAtPeriodEnd: false,
      lastInvoiceAmountCents: 999,
    });
    expect((await db().doc('homes/laura').get()).get('ownerPremium')).toBe(true);
    const acceptance = (await db().collection('legalAcceptances').get()).docs[0]?.data();
    expect(acceptance).toMatchObject({
      uid: 'laura',
      type: 'WITHDRAWAL_START',
      context: 'MONTHLY',
    });
    expect(
      await errorCode(
        createCheckoutSession.run(
          authedRequest({ plan: 'YEARLY', acceptImmediateStart: true }, laura),
        ),
      ),
    ).toBe('E_ALREADY_SUBSCRIBED');
  });

  it('requires accepting the immediate start', async () => {
    expect(
      await errorCode(
        createCheckoutSession.run(
          authedRequest({ plan: 'MONTHLY', acceptImmediateStart: false }, laura),
        ),
      ),
    ).toBe('E_VALIDATION');
  });

  it('cancelling in the portal keeps Premium until the end of the period (BR-18)', async () => {
    expect(await errorCode(createPortalSession.run(authedRequest({}, laura)))).toBe(
      'E_NO_SUBSCRIPTION',
    );
    await createCheckoutSession.run(
      authedRequest({ plan: 'MONTHLY', acceptImmediateStart: true }, laura),
    );
    expect((await createPortalSession.run(authedRequest({}, laura))).url).toContain(
      '/app/premium/portal-simulado',
    );
    await devSimulateStripe.run(authedRequest({ action: 'CANCEL_AT_PERIOD_END' }, laura));
    expect(await premiumUntil()).toBe('2027-04-01T09:00:00.000Z');
    expect((await db().doc('subscriptions/laura').get()).get('cancelAtPeriodEnd')).toBe(true);
    await devSimulateStripe.run(authedRequest({ action: 'END_PERIOD' }, laura));
    expect(await premiumUntil()).toBeNull();
    expect((await db().doc('homes/laura').get()).get('ownerPremium')).toBe(false);
  });
});

describe('withdrawal (FR-37, BR-34)', () => {
  it('within 14 days refunds the payment (P-07 FULL), ends Premium and is audited', async () => {
    await createCheckoutSession.run(
      authedRequest({ plan: 'MONTHLY', acceptImmediateStart: true }, laura),
    );
    setClock(fixedClock('2027-03-05T10:00:00+01:00'));
    const fresh = {
      ...laura,
      auth_time: Math.floor(new Date('2027-03-05T09:59:00+01:00').getTime() / 1000),
    };
    expect(await withdrawSubscription.run(authedRequest({ confirm: true }, fresh))).toEqual({
      refundedCents: 999,
      endedAt: '2027-03-05T09:00:00.000Z',
    });
    expect(await premiumUntil()).toBeNull();
    expect((await db().doc('users/laura').get()).get('withdrawalUsed')).toBe(true);
    expect(
      (await db().collection('auditLog').get()).docs.map((d) => d.get('action') as string),
    ).toEqual(['premium.withdraw']);
    const mail = (await db().collection('mailQueue').get()).docs[0]?.data();
    expect(mail).toMatchObject({
      templateId: 'N-12',
      data: { kind: 'WITHDRAWN', amountCents: 999 },
    });
  });

  it('needs a recent sign-in and is closed after 14 days', async () => {
    await createCheckoutSession.run(
      authedRequest({ plan: 'MONTHLY', acceptImmediateStart: true }, laura),
    );
    setClock(fixedClock('2027-03-20T10:00:00+01:00'));
    expect(await errorCode(withdrawSubscription.run(authedRequest({ confirm: true }, laura)))).toBe(
      'E_REAUTH_REQUIRED',
    );
    const fresh = {
      ...laura,
      auth_time: Math.floor(new Date('2027-03-20T09:59:00+01:00').getTime() / 1000),
    };
    expect(await errorCode(withdrawSubscription.run(authedRequest({ confirm: true }, fresh)))).toBe(
      'E_WITHDRAWAL_EXPIRED',
    );
  });

  it('cannot be used twice', async () => {
    await db().doc('users/laura').update({ withdrawalUsed: true });
    await createCheckoutSession.run(
      authedRequest({ plan: 'MONTHLY', acceptImmediateStart: true }, laura),
    );
    expect(await errorCode(withdrawSubscription.run(authedRequest({ confirm: true }, laura)))).toBe(
      'E_WITHDRAWAL_USED',
    );
  });
});

describe('Stripe webhook (03 §10)', () => {
  const secret = 'whsec_test_tinhome';
  const gateway = new StripeGateway('sk_test_dummy', secret);
  const stripe = new Stripe('sk_test_dummy');
  const sign = (payload: object) => {
    const body = JSON.stringify(payload);
    return {
      body: Buffer.from(body),
      header: stripe.webhooks.generateTestHeaderString({ payload: body, secret }),
    };
  };
  const subscriptionEvent = (id: string, status: string) => ({
    id,
    object: 'event',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_123',
        object: 'subscription',
        customer: 'cus_123',
        status,
        cancel_at_period_end: false,
        start_date: 1772355600,
        metadata: { uid: 'laura' },
        items: {
          data: [
            {
              price: { id: 'price_monthly' },
              current_period_start: 1772355600,
              current_period_end: 1775034000,
            },
          ],
        },
      },
    },
  });

  it('verifies the signature, applies the subscription once and ignores repeats', async () => {
    const { body, header } = sign(subscriptionEvent('evt_1', 'active'));
    const event = gateway.parseWebhook(body, header);
    expect(event).toMatchObject({
      kind: 'SUBSCRIPTION_UPSERT',
      subscription: { uid: 'laura', status: 'active', plan: 'MONTHLY' },
    });
    expect(await applyPaymentEvent(db(), event, new Date(NOW))).toBe('APPLIED');
    expect(await applyPaymentEvent(db(), event, new Date(NOW))).toBe('DUPLICATE');
    // Period 2026-03-01 → 2026-04-01 is already over at NOW (2027): the subscription is stored
    // but grants nothing (BR-17 only counts entitlements that are still running).
    expect(await premiumUntil()).toBeNull();
    expect((await db().doc('subscriptions/laura').get()).get('stripeSubscriptionId')).toBe(
      'sub_123',
    );
  });

  it('rejects a forged signature', () => {
    const { body } = sign(subscriptionEvent('evt_2', 'active'));
    expect(() => gateway.parseWebhook(body, 't=1,v1=forged')).toThrow();
  });
});

describe('premium chain and referrals (BR-17, FR-39)', () => {
  it('stacks a referral after the founder months', async () => {
    const at = (iso: string) => Timestamp.fromDate(new Date(iso));
    await db()
      .collection('entitlements')
      .add({
        uid: 'laura',
        source: 'FOUNDER',
        startsAt: at('2027-02-01'),
        endsAt: at('2028-02-01'),
      });
    await db()
      .collection('entitlements')
      .add({
        uid: 'laura',
        source: 'REFERRAL',
        startsAt: at('2028-02-01'),
        endsAt: at('2028-03-02'),
      });
    await recomputePremium(db(), 'laura', new Date(NOW));
    expect(await premiumUntil()).toBe('2028-03-02T00:00:00.000Z');
    expect((await db().doc('users/laura').get()).get('premiumSource')).toBe('REFERRAL');
  });

  it('summarises invitations and rewards of the last 12 months', async () => {
    await db().doc('publicProfiles/ana').set({ displayName: 'Ana P.' });
    await db()
      .doc('referrals/ana')
      .set({
        inviterUid: 'laura',
        inviteeUid: 'ana',
        status: 'REWARDED',
        rewardedAt: Timestamp.fromDate(new Date('2027-02-01')),
      });
    await db()
      .doc('referrals/pepe')
      .set({ inviterUid: 'laura', inviteeUid: 'pepe', status: 'REGISTERED' });
    const summary = await getReferralSummary.run(authedRequest({}, laura));
    expect(summary).toMatchObject({
      code: 'CASAMAD2',
      rewardsThisYear: 1,
      maxRewards: 12,
      rewardDays: 30,
    });
    expect(summary.link).toMatch(/\/i\/CASAMAD2$/);
    expect(summary.invited.map((i) => i.status).sort()).toEqual(['REGISTERED', 'REWARDED']);
  });
});
