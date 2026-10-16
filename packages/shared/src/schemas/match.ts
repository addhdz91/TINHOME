import { z } from 'zod/mini';
import { PARAM_DEFAULTS } from '../constants/params.js';
import { DocId, PaginationInput } from './common.js';
import { HomeCard } from './discover.js';

const MatchIdInput = z.object({ matchId: DocId });

/** FR-23 / FR-24 — `likeHome`. A message (FR-61) is Premium only. */
export const LikeHomeInput = z.object({
  homeId: DocId,
  message: z.optional(
    z.string().check(z.trim(), z.minLength(1), z.maxLength(PARAM_DEFAULTS.premiumMessageMaxLength)),
  ),
  clientRequestId: z.optional(z.uuid()),
});
export const LikeHomeOutput = z.object({
  matched: z.boolean(),
  matchId: z.nullable(z.string()),
  likesRemaining: z.nullable(z.int()),
});
export type LikeHomeOutput = z.infer<typeof LikeHomeOutput>;

/** FR-26 — free users see the count (and message likes); Premium the whole list. */
export const ListLikesReceivedInput = PaginationInput;
export const ListLikesReceivedOutput = z.object({
  count: z.int(),
  items: z.nullable(z.array(HomeCard)),
  /** FR-61 — likes with a message are always shown, also to free users. */
  withMessage: z.array(HomeCard),
  nextCursor: z.nullable(z.string()),
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
  matchId: DocId,
  text: z.string().check(z.trim(), z.minLength(1), z.maxLength(5000)),
  clientRequestId: z.uuid(),
});
export const SendMessageOutput = z.object({
  message: z.object({ id: z.string(), createdAt: z.string(), paymentWarning: z.boolean() }),
});
export const MarkConversationReadInput = MatchIdInput;
export const DeleteMessageForMeInput = z.object({
  matchId: DocId,
  messageId: DocId,
});

/** FR-41 — blocks. */
export const BlockUserInput = z.object({
  targetUid: DocId,
});
export const UnblockUserInput = BlockUserInput;
export const ListBlockedOutput = z.object({
  items: z.array(z.object({ uid: z.string(), displayName: z.string(), blockedAt: z.string() })),
});
