import { z } from 'zod';
import { PREMIUM_PLANS, REFERRAL_STATUS } from '../constants/enums.js';

/** FR-35 — Checkout; the immediate start (and the withdrawal info) must be accepted. */
export const CreateCheckoutSessionInput = z.object({
  plan: z.enum(PREMIUM_PLANS),
  acceptImmediateStart: z.literal(true),
});
export const UrlOutput = z.object({ url: z.string() });

/** FR-37 — withdrawal (needs a sign-in in the last 5 minutes). */
export const WithdrawSubscriptionInput = z.object({ confirm: z.literal(true) });
export const WithdrawSubscriptionOutput = z.object({
  refundedCents: z.number().int(),
  endedAt: z.string(),
});

/** FR-39 — «Invita y gana». */
export const GetReferralSummaryOutput = z.object({
  code: z.string(),
  link: z.string(),
  invited: z.array(
    z.object({
      displayName: z.string(),
      status: z.enum(REFERRAL_STATUS),
      createdAt: z.string().nullable(),
    }),
  ),
  rewardsThisYear: z.number().int(),
  maxRewards: z.number().int(),
  rewardDays: z.number().int(),
});
export type GetReferralSummaryOutput = z.infer<typeof GetReferralSummaryOutput>;

/**
 * Emulator only (no Stripe keys): simulates what the Stripe portal and webhooks would do, so
 * the whole Premium flow can be tried locally (10_DECISIONS §5, M7).
 */
export const DEV_STRIPE_ACTIONS = [
  'CANCEL_AT_PERIOD_END',
  'RESUME',
  'RENEW',
  'PAYMENT_FAILED',
  'END_PERIOD',
] as const;
export const DevSimulateStripeInput = z.object({ action: z.enum(DEV_STRIPE_ACTIONS) });
