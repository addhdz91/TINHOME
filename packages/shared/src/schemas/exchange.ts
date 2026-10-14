import { z } from 'zod';
import { EXCHANGE_STATUS, REVIEW_STATUS } from '../constants/enums.js';
import { IsoDateSchema } from './common.js';

const Uid = z.string().min(1).max(128);
const ExchangeId = z.string().min(1).max(128);
/**
 * Optional free text; an empty string or `null` counts as «not given» (the callable client
 * serialises `undefined` as `null`).
 */
const OptionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value === '' || value === null ? undefined : value));

/** FR-30 / BR-15 — `proposeExchange`. Guests and pets are what each person takes to the other home. */
export const ProposeExchangeInput = z.object({
  matchId: z.string().min(1).max(200),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  guests: z.record(Uid, z.number().int().min(1).max(12)),
  pets: z.record(Uid, z.number().int().min(0).max(5)),
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
  nights: z.number().int(),
  guests: z.record(z.string(), z.number().int()),
  pets: z.record(z.string(), z.number().int()),
  note: z.string().nullable(),
  status: z.enum(EXCHANGE_STATUS),
  expiresAt: z.string(),
  confirmedAt: z.string().nullable(),
  cancelledBy: z.string().nullable(),
  cancelReason: z.string().nullable(),
  completedAt: z.string().nullable(),
  reviewDeadline: z.string().nullable(),
});
export type ExchangeView = z.infer<typeof ExchangeView>;
export const ExchangeOutput = z.object({ exchange: ExchangeView });
export type ExchangeOutput = z.infer<typeof ExchangeOutput>;

export const RespondExchangeInput = z.object({ exchangeId: ExchangeId, accept: z.boolean() });
export const CancelExchangeInput = z.object({
  exchangeId: ExchangeId,
  reason: OptionalText(300),
});

const Score = z.number().int().min(1).max(5);

/** FR-32 / BR-16 — `submitReview` (double blind, not editable). */
export const SubmitReviewInput = z.object({
  exchangeId: ExchangeId,
  overall: Score,
  sub: z.object({ cleanliness: Score, accuracy: Score, communication: Score, care: Score }),
  comment: z.string().trim().max(1000).optional(),
});
export type SubmitReviewInput = z.infer<typeof SubmitReviewInput>;
export const SubmitReviewOutput = z.object({
  review: z.object({
    id: z.string(),
    status: z.enum(REVIEW_STATUS),
    publishedAt: z.string().nullable(),
  }),
  published: z.boolean(),
});
export type SubmitReviewOutput = z.infer<typeof SubmitReviewOutput>;

/** FR-46 — notification center. */
export const MarkAllNotificationsReadOutput = z.object({ updated: z.number().int() });

/** FR-70 — web push tokens (FCM). */
export const RegisterPushTokenInput = z.object({ token: z.string().min(20).max(4096) });
export const UnregisterPushTokenInput = RegisterPushTokenInput;
