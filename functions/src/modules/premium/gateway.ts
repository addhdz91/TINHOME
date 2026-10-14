import { randomUUID } from 'node:crypto';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';
import type { PremiumPlan } from '@tinhome/shared/constants';
import { appError } from '../../core/app-error.js';
import type { PaymentEvent, SubscriptionSnapshot } from './events.js';

export const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
export const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

/** Everything TinHome asks the payment provider (ADR-009). Stripe in production. */
export interface PaymentsGateway {
  readonly name: 'stripe' | 'simulated';
  createCustomer(input: { uid: string; email: string }): Promise<string>;
  createCheckout(input: {
    uid: string;
    customerId: string;
    plan: PremiumPlan;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string>;
  createPortal(input: { customerId: string; returnUrl: string }): Promise<string>;
  /** Cancels immediately (withdrawal) and refunds `refundCents` of the latest payment. */
  cancelAndRefund(input: { subscriptionId: string; refundCents: number }): Promise<void>;
  retrieveSubscription(subscriptionId: string): Promise<SubscriptionSnapshot | null>;
  /** Verifies the `Stripe-Signature` and normalises the event (throws if invalid). */
  parseWebhook(rawBody: Buffer, signature: string): PaymentEvent;
}

function planOf(priceId: string | undefined): PremiumPlan {
  return priceId !== undefined && priceId === process.env.STRIPE_PRICE_YEARLY
    ? 'YEARLY'
    : 'MONTHLY';
}

/** Since API 2025-03 the period lives on the subscription items. */
function snapshotOf(sub: Stripe.Subscription): SubscriptionSnapshot {
  const item = sub.items.data[0];
  const start = item?.current_period_start ?? sub.start_date;
  const end = item?.current_period_end ?? sub.start_date;
  return {
    id: sub.id,
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    uid: sub.metadata.uid ?? '',
    status: sub.status,
    plan: planOf(item?.price.id),
    currentPeriodStart: new Date(start * 1000),
    currentPeriodEnd: new Date(end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

export class StripeGateway implements PaymentsGateway {
  readonly name = 'stripe' as const;
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  async createCustomer({ uid, email }: { uid: string; email: string }): Promise<string> {
    return (await this.stripe.customers.create({ email, metadata: { uid } })).id;
  }

  async createCheckout(input: Parameters<PaymentsGateway['createCheckout']>[0]): Promise<string> {
    const price =
      input.plan === 'YEARLY' ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY;
    if (!price) throw appError('E_INTERNAL');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: input.customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      locale: 'es',
      metadata: { uid: input.uid },
      subscription_data: { metadata: { uid: input.uid } },
    });
    if (!session.url) throw appError('E_INTERNAL');
    return session.url;
  }

  async createPortal({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl: string;
  }): Promise<string> {
    return (
      await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        locale: 'es',
      })
    ).url;
  }

  async cancelAndRefund({
    subscriptionId,
    refundCents,
  }: {
    subscriptionId: string;
    refundCents: number;
  }): Promise<void> {
    const invoices = await this.stripe.invoices.list({
      subscription: subscriptionId,
      limit: 1,
      status: 'paid',
    });
    const payment = invoices.data[0]?.payments?.data[0]?.payment.payment_intent;
    if (refundCents > 0 && payment) {
      await this.stripe.refunds.create({
        payment_intent: typeof payment === 'string' ? payment : payment.id,
        amount: refundCents,
        reason: 'requested_by_customer',
      });
    }
    await this.stripe.subscriptions.cancel(subscriptionId, { prorate: false });
  }

  async retrieveSubscription(subscriptionId: string): Promise<SubscriptionSnapshot | null> {
    try {
      return snapshotOf(await this.stripe.subscriptions.retrieve(subscriptionId));
    } catch {
      return null;
    }
  }

  parseWebhook(rawBody: Buffer, signature: string): PaymentEvent {
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscription =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        const customer =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;
        return {
          id: event.id,
          kind: 'CHECKOUT_COMPLETED',
          uid: session.metadata?.uid ?? '',
          customerId: customer ?? '',
          subscriptionId: subscription ?? '',
        };
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return {
          id: event.id,
          kind: 'SUBSCRIPTION_UPSERT',
          subscription: snapshotOf(event.data.object),
        };
      case 'customer.subscription.deleted':
        return {
          id: event.id,
          kind: 'SUBSCRIPTION_DELETED',
          uid: event.data.object.metadata.uid ?? '',
          subscriptionId: event.data.object.id,
        };
      case 'invoice.paid':
        return {
          id: event.id,
          kind: 'INVOICE_PAID',
          uid: event.data.object.parent?.subscription_details?.metadata?.uid ?? '',
          amountCents: event.data.object.amount_paid,
          firstInvoice: event.data.object.billing_reason === 'subscription_create',
        };
      case 'invoice.payment_failed':
        return {
          id: event.id,
          kind: 'INVOICE_FAILED',
          uid: event.data.object.parent?.subscription_details?.metadata?.uid ?? '',
        };
      default:
        return { id: event.id, kind: 'IGNORED', type: event.type };
    }
  }
}

/**
 * Emulator only: behaves like Stripe without network so the Premium flow can be tried with
 * `pnpm dev`. Checkout «pays» at once; the portal is a dev page with simulated actions.
 */
export class SimulatedGateway implements PaymentsGateway {
  readonly name = 'simulated' as const;
  constructor(private readonly publicUrl: string) {}

  createCustomer(): Promise<string> {
    return Promise.resolve(`cus_sim_${randomUUID().slice(0, 8)}`);
  }

  createCheckout(input: Parameters<PaymentsGateway['createCheckout']>[0]): Promise<string> {
    return Promise.resolve(input.successUrl);
  }

  createPortal(): Promise<string> {
    return Promise.resolve(`${this.publicUrl}/app/premium/portal-simulado`);
  }

  cancelAndRefund(): Promise<void> {
    return Promise.resolve();
  }

  retrieveSubscription(): Promise<SubscriptionSnapshot | null> {
    return Promise.resolve(null);
  }

  parseWebhook(): PaymentEvent {
    throw appError('E_VALIDATION');
  }
}

export function isEmulated(): boolean {
  return process.env.FUNCTIONS_EMULATOR === 'true' || Boolean(process.env.VITEST);
}

/** Real Stripe when the secrets exist; the simulated gateway only in the emulator/tests. */
export function paymentsGateway(publicUrl: string): PaymentsGateway {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (key) return new StripeGateway(key, process.env.STRIPE_WEBHOOK_SECRET ?? '');
  if (isEmulated()) return new SimulatedGateway(publicUrl);
  throw appError('E_INTERNAL');
}
