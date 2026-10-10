import { z } from 'zod';
import { PARAM_DEFAULTS } from '../constants/params.js';
import { PaginationInput } from './common.js';
import { HomeCard } from './discover.js';

const MatchIdInput = z.object({ matchId: z.string().min(1).max(200) });

/** FR-23 / FR-24 — `likeHome`. A message (FR-61) is Premium only. */
export const LikeHomeInput = z.object({
  homeId: z.string().min(1).max(128),
  message: z.string().trim().min(1).max(PARAM_DEFAULTS.premiumMessageMaxLength).optional(),
  clientRequestId: z.uuid().optional(),
});
export const LikeHomeOutput = z.object({
  matched: z.boolean(),
  matchId: z.string().nullable(),
  likesRemaining: z.number().int().nullable(),
});
export type LikeHomeOutput = z.infer<typeof LikeHomeOutput>;

/** FR-26 — free users see the count (and message likes); Premium the whole list. */
export const ListLikesReceivedInput = PaginationInput;
export const ListLikesReceivedOutput = z.object({
  count: z.number().int(),
  items: z.array(HomeCard).nullable(),
  /** FR-61 — likes with a message are always shown, also to free users. */
  withMessage: z.array(HomeCard),
  nextCursor: z.string().nullable(),
});
export type ListLikesReceivedOutput = z.infer<typeof ListLikesReceivedOutput>;

export const MarkMatchSeenInput = MatchIdInput;
export const UnmatchInput = MatchIdInput;

/** FR-28 — contact of the other person, only if they shared it in this match. */
export const GetMatchContactInput = MatchIdInput;
export const GetMatchContactOutput = z.object({
  displayName: z.string(),
  phoneE164: z.string(),
  whatsappUrl: z.string(),
});
export const SharePhoneInChatInput = MatchIdInput;

/** FR-60 / BR-36 — `sendMessage`. The client id makes retries idempotent. */
export const SendMessageInput = z.object({
  matchId: z.string().min(1).max(200),
  text: z.string().trim().min(1).max(5000),
  clientRequestId: z.uuid(),
});
export const SendMessageOutput = z.object({
  message: z.object({ id: z.string(), createdAt: z.string(), paymentWarning: z.boolean() }),
});
export const MarkConversationReadInput = MatchIdInput;
export const DeleteMessageForMeInput = z.object({
  matchId: z.string().min(1).max(200),
  messageId: z.string().min(1).max(128),
});

/** FR-41 — blocks. */
export const BlockUserInput = z.object({ targetUid: z.string().min(1).max(128) });
export const UnblockUserInput = BlockUserInput;
export const ListBlockedOutput = z.object({
  items: z.array(z.object({ uid: z.string(), displayName: z.string(), blockedAt: z.string() })),
});
