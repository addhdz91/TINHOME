import { z } from 'zod/mini';
import { EXCHANGE_STATUS, REVIEW_STATUS } from '../constants/enums.js';
import { IsoDateSchema } from './common.js';

const Uid = z.string().check(z.minLength(1), z.maxLength(128));
const ExchangeId = z.string().check(z.minLength(1), z.maxLength(128));
/**
 * Optional free text; an empty string or `null` counts as «not given» (the callable client
 * serialises `undefined` as `null`).
 */
const OptionalText = (max: number) =>
  z.pipe(
    z.nullish(z.string().check(z.trim(), z.maxLength(max))),
    z.transform((value) => (value === '' || value === null ? undefined : value)),
  );

/** FR-30 / BR-15 — `proposeExchange`. Guests and pets are what each person takes to the other home. */
export const ProposeExchangeInput = z.object({
  matchId: z.string().check(z.minLength(1), z.maxLength(200)),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  guests: z.record(Uid, z.int().check(z.gte(1), z.lte(12))),
  pets: z.record(Uid, z.int().check(z.gte(0), z.lte(5))),
  note: OptionalText(300),
});
export type ProposeExchangeInput = z.infer<typeof ProposeExchangeInput>;

export const ExchangeView = z.object({
  id: z.string(),
  matchId: z.string(),
  participants: z.array(z.string()),
  proposedBy: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  nights: z.int(),
  guests: z.record(z.string(), z.int()),
  pets: z.record(z.string(), z.int()),
  note: z.nullable(z.string()),
  status: z.enum(EXCHANGE_STATUS),
  expiresAt: z.string(),
  confirmedAt: z.nullable(z.string()),
  cancelledBy: z.nullable(z.string()),
  cancelReason: z.nullable(z.string()),
  completedAt: z.nullable(z.string()),
  reviewDeadline: z.nullable(z.string()),
});
export type ExchangeView = z.infer<typeof ExchangeView>;
export const ExchangeOutput = z.object({ exchange: ExchangeView });
export type ExchangeOutput = z.infer<typeof ExchangeOutput>;

export const RespondExchangeInput = z.object({ exchangeId: ExchangeId, accept: z.boolean() });
export const CancelExchangeInput = z.object({
  exchangeId: ExchangeId,
  reason: OptionalText(300),
});

const Score = z.int().check(z.gte(1), z.lte(5));

/** FR-32 / BR-16 — `submitReview` (double blind, not editable). */
export const SubmitReviewInput = z.object({
  exchangeId: ExchangeId,
  overall: Score,
  sub: z.object({ cleanliness: Score, accuracy: Score, communication: Score, care: Score }),
  comment: z.optional(z.string().check(z.trim(), z.maxLength(1000))),
});
export type SubmitReviewInput = z.infer<typeof SubmitReviewInput>;
export const SubmitReviewOutput = z.object({
  review: z.object({
    id: z.string(),
    status: z.enum(REVIEW_STATUS),
    publishedAt: z.nullable(z.string()),
  }),
  published: z.boolean(),
});
export type SubmitReviewOutput = z.infer<typeof SubmitReviewOutput>;

/** FR-46 — notification center. */
export const MarkAllNotificationsReadOutput = z.object({ updated: z.int() });

/** FR-70 — web push tokens (FCM). */
export const RegisterPushTokenInput = z.object({
  token: z.string().check(z.minLength(20), z.maxLength(4096)),
});
export const UnregisterPushTokenInput = RegisterPushTokenInput;
