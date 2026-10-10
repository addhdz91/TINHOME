import type { CallableRequest } from 'firebase-functions/v2/https';
import {
  GetDiscoverDeckInput,
  GetDiscoverDeckOutput,
  GetHomeDetailInput,
  GetHomeDetailOutput,
  OkOutput,
  PassHomeInput,
  SearchHomesInput,
  SearchHomesOutput,
  UndoPassInput,
} from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { db } from '../../core/firebase.js';
import { requireAuth, requireEmailVerified } from '../../core/guards.js';
import { getParams } from '../../core/params.js';
import * as discover from './service.js';
import { loadViewer, type Viewer } from './viewer.js';

/** Guards `A, EV` and the viewer context. */
async function viewerOf(request: CallableRequest, now: Date): Promise<Viewer> {
  const auth = requireAuth(request);
  requireEmailVerified(auth);
  const session = {
    uid: auth.uid,
    email: typeof request.auth?.token.email === 'string' ? request.auth.token.email : '',
    emailVerified: auth.emailVerified,
    role: auth.role,
  };
  return loadViewer(db(), session, await getParams(), now);
}

/** FR-20 — A, EV. */
export const getDiscoverDeck = defineCallable(
  'getDiscoverDeck',
  { input: GetDiscoverDeckInput, output: GetDiscoverDeckOutput },
  async ({ input, request, now }) =>
    discover.discoverDeck(db(), await viewerOf(request, now), input, await getParams(), now),
);

/** FR-21 — A, EV. */
export const searchHomes = defineCallable(
  'searchHomes',
  { input: SearchHomesInput, output: SearchHomesOutput },
  async ({ input, request, now }) =>
    discover.searchHomes(db(), await viewerOf(request, now), input, await getParams(), now),
);

/** FR-22 — A, EV. */
export const getHomeDetail = defineCallable(
  'getHomeDetail',
  { input: GetHomeDetailInput, output: GetHomeDetailOutput },
  async ({ input, request, now }) =>
    discover.homeDetail(db(), await viewerOf(request, now), input.homeId, now),
);

/** BR-11 — A, EV. */
export const passHome = defineCallable(
  'passHome',
  { input: PassHomeInput, output: OkOutput },
  async ({ input, request, now }) => {
    await discover.passHome(
      db(),
      await viewerOf(request, now),
      input.homeId,
      await getParams(),
      now,
    );
    return { ok: true as const };
  },
);

/** AC-20.3 — A, EV. */
export const undoPass = defineCallable(
  'undoPass',
  { input: UndoPassInput, output: OkOutput },
  async ({ input, request, now }) => {
    await discover.undoPass(db(), await viewerOf(request, now), input, now);
    return { ok: true as const };
  },
);
