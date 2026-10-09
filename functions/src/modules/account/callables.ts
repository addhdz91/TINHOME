import {
  AcceptLegalDocsInput,
  CompleteSignupInput,
  CompleteSignupOutput,
  ConfirmPhoneLinkedInput,
  ConfirmPhoneLinkedOutput,
  GetMeInput,
  GetMeOutput,
  OkOutput,
  SignOutEverywhereInput,
  UpdateSettingsInput,
} from '@tinhome/shared/schemas';
import { appError } from '../../core/app-error.js';
import { defineCallable } from '../../core/callable.js';
import { adminAuth, db } from '../../core/firebase.js';
import { requireAuth, requireEmailVerified } from '../../core/guards.js';
import { getParams } from '../../core/params.js';
import { requestIp } from '../../core/rate-limit.js';
import { buildMe, type SessionInfo } from './me.js';
import * as account from './service.js';

function sessionInfo(request: Parameters<typeof requireAuth>[0]): SessionInfo {
  const auth = requireAuth(request);
  const email = request.auth?.token.email;
  if (!email) throw appError('E_VALIDATION', { fields: { email: 'missing' } });
  return { uid: auth.uid, email, emailVerified: auth.emailVerified, role: auth.role };
}

/** FR-01 — guards: A. */
export const completeSignup = defineCallable(
  'completeSignup',
  { input: CompleteSignupInput, output: CompleteSignupOutput },
  async ({ input, request, now }) => {
    const session = sessionInfo(request);
    await account.completeSignup(
      db(),
      {
        uid: session.uid,
        email: session.email,
        emailVerified: session.emailVerified,
        ip: requestIp(request.rawRequest),
      },
      input,
      now,
    );
    return { me: await buildMe(db(), session, await getParams(), now) };
  },
);

/** 05 §2.1 — getMe (guards: A). */
export const getMe = defineCallable(
  'getMe',
  { input: GetMeInput, output: GetMeOutput },
  async ({ request, now }) => buildMe(db(), sessionInfo(request), await getParams(), now),
);

/** updateSettings (guards: A). */
export const updateSettings = defineCallable(
  'updateSettings',
  { input: UpdateSettingsInput, output: OkOutput },
  async ({ input, request }) => {
    const auth = requireAuth(request);
    await account.updateSettings(db(), auth.uid, input);
    return { ok: true as const };
  },
);

/** FR-07 — confirmPhoneLinked (guards: A, EV). */
export const confirmPhoneLinked = defineCallable(
  'confirmPhoneLinked',
  { input: ConfirmPhoneLinkedInput, output: ConfirmPhoneLinkedOutput },
  async ({ request }) => {
    const auth = requireAuth(request);
    requireEmailVerified(auth);
    const authUser = await adminAuth().getUser(auth.uid);
    await account.confirmPhoneLinked(db(), auth.uid, authUser.phoneNumber);
    return { phoneVerified: true as const };
  },
);

/** FR-58 — acceptLegalDocs (guards: A). */
export const acceptLegalDocs = defineCallable(
  'acceptLegalDocs',
  { input: AcceptLegalDocsInput, output: OkOutput },
  async ({ input, request }) => {
    const auth = requireAuth(request);
    await account.acceptLegalDocs(db(), auth.uid, input, requestIp(request.rawRequest));
    return { ok: true as const };
  },
);

/** FR-71 — signOutEverywhere (guards: A + recent sign-in). Revokes refresh tokens; N-27. */
export const signOutEverywhere = defineCallable(
  'signOutEverywhere',
  { input: SignOutEverywhereInput, output: OkOutput },
  async ({ request, now }) => {
    const auth = requireAuth(request);
    account.requireRecentSignIn(request.auth?.token.auth_time, now);
    await adminAuth().revokeRefreshTokens(auth.uid);
    await account.notifySignedOutEverywhere(db(), auth.uid, now);
    return { ok: true as const };
  },
);
