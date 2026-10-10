import {
  BlockUserInput,
  DeleteMessageForMeInput,
  EmptyInput,
  GetMatchContactInput,
  GetMatchContactOutput,
  LikeHomeInput,
  LikeHomeOutput,
  ListBlockedOutput,
  ListLikesReceivedInput,
  ListLikesReceivedOutput,
  MarkConversationReadInput,
  MarkMatchSeenInput,
  OkOutput,
  SendMessageInput,
  SendMessageOutput,
  SharePhoneInChatInput,
  UnblockUserInput,
  UnmatchInput,
} from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { db } from '../../core/firebase.js';
import { getParams } from '../../core/params.js';
import { sessionOf, viewerOf } from '../discover/viewer.js';
import * as blocks from './blocks.js';
import * as chat from './chat.js';
import { likeHome as like } from './likes.js';
import * as matches from './matches.js';
import { likesReceived } from './received.js';

const ok = { ok: true as const };

/** FR-23/24 — A, EV, ID, ACT, LEG, CO. */
export const likeHome = defineCallable(
  'likeHome',
  { input: LikeHomeInput, output: LikeHomeOutput },
  async ({ input, request, now }) => like(db(), sessionOf(request), input, await getParams(), now),
);

/** FR-26 — A, EV. */
export const listLikesReceived = defineCallable(
  'listLikesReceived',
  { input: ListLikesReceivedInput, output: ListLikesReceivedOutput },
  async ({ input, request, now }) =>
    likesReceived(db(), await viewerOf(request, now), input, await getParams(), now),
);

export const markMatchSeen = defineCallable(
  'markMatchSeen',
  { input: MarkMatchSeenInput, output: OkOutput },
  async ({ input, request }) => {
    await matches.markMatchSeen(db(), sessionOf(request).uid, input.matchId);
    return ok;
  },
);

/** FR-27 — BR-09. */
export const unmatch = defineCallable(
  'unmatch',
  { input: UnmatchInput, output: OkOutput },
  async ({ input, request }) => {
    await matches.unmatch(db(), sessionOf(request).uid, input.matchId);
    return ok;
  },
);

/** FR-28. */
export const getMatchContact = defineCallable(
  'getMatchContact',
  { input: GetMatchContactInput, output: GetMatchContactOutput },
  async ({ input, request }) => chat.matchContact(db(), sessionOf(request).uid, input.matchId),
);

export const sharePhoneInChat = defineCallable(
  'sharePhoneInChat',
  { input: SharePhoneInChatInput, output: OkOutput },
  async ({ input, request, now }) => {
    await chat.sharePhone(db(), sessionOf(request).uid, input.matchId, now);
    return ok;
  },
);

/** FR-60 — warm instance to avoid cold starts in the chat (05 §2.7b). */
export const sendMessage = defineCallable(
  'sendMessage',
  {
    input: SendMessageInput,
    output: SendMessageOutput,
    options: process.env.FUNCTIONS_EMULATOR === 'true' ? {} : { minInstances: 1 },
  },
  async ({ input, request, now }) => ({
    message: await chat.sendMessage(db(), sessionOf(request).uid, input, await getParams(), now),
  }),
);

export const markConversationRead = defineCallable(
  'markConversationRead',
  { input: MarkConversationReadInput, output: OkOutput },
  async ({ input, request, now }) => {
    await chat.markConversationRead(db(), sessionOf(request).uid, input.matchId, now);
    return ok;
  },
);

export const deleteMessageForMe = defineCallable(
  'deleteMessageForMe',
  { input: DeleteMessageForMeInput, output: OkOutput },
  async ({ input, request }) => {
    await chat.deleteMessageForMe(db(), sessionOf(request).uid, input.matchId, input.messageId);
    return ok;
  },
);

/** FR-41 — BR-10. */
export const blockUser = defineCallable(
  'blockUser',
  { input: BlockUserInput, output: OkOutput },
  async ({ input, request }) => {
    await blocks.blockUser(db(), sessionOf(request).uid, input.targetUid);
    return ok;
  },
);

export const unblockUser = defineCallable(
  'unblockUser',
  { input: UnblockUserInput, output: OkOutput },
  async ({ input, request }) => {
    await blocks.unblockUser(db(), sessionOf(request).uid, input.targetUid);
    return ok;
  },
);

export const listBlocked = defineCallable(
  'listBlocked',
  { input: EmptyInput, output: ListBlockedOutput },
  async ({ request }) => ({ items: await blocks.listBlocked(db(), sessionOf(request).uid) }),
);
