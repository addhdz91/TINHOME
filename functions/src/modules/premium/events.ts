import type { PremiumPlan } from '@tinhome/shared/constants';

/** Subscription state as TinHome stores it (`subscriptions/{uid}`). */
export interface SubscriptionSnapshot {
  id: string;
  customerId: string;
  uid: string;
  status: string;
  plan: PremiumPlan;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/** Stripe webhook events normalised to what the business logic needs (03 §10). */
export type PaymentEvent =
  | {
      id: string;
      kind: 'CHECKOUT_COMPLETED';
      uid: string;
      customerId: string;
      subscriptionId: string;
    }
  | { id: string; kind: 'SUBSCRIPTION_UPSERT'; subscription: SubscriptionSnapshot }
  | { id: string; kind: 'SUBSCRIPTION_DELETED'; uid: string; subscriptionId: string }
  | { id: string; kind: 'INVOICE_PAID'; uid: string; amountCents: number; firstInvoice: boolean }
  | { id: string; kind: 'INVOICE_FAILED'; uid: string }
  | { id: string; kind: 'IGNORED'; type: string };

/** Statuses that keep the STRIPE entitlement alive until the end of the period. */
export const LIVE_STATUSES = ['active', 'trialing', 'past_due'];
