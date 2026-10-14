import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '@tinhome/shared/constants';
import {
  AdminCloseGdprRequestInput,
  AdminListGdprRequestsInput,
  AdminListGdprRequestsOutput,
  EmptyInput,
  ListMyGdprRequestsOutput,
  OkOutput,
  RequestAccountDeletionInput,
  RequestAccountDeletionOutput,
  SubmitGdprRequestInput,
  SubmitGdprRequestOutput,
  TrackEventInput,
  UrlWithExpiryOutput,
} from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { clock } from '../../core/clock.js';
import { db } from '../../core/firebase.js';
import { requireAdmin, requireAuth } from '../../core/guards.js';
import { logger } from '../../core/logger.js';
import { getParams } from '../../core/params.js';
import { publicUrl } from '../../core/public-url.js';
import { consumeRateLimit } from '../../core/rate-limit.js';
import { resolvePushSender } from '../notifications/push.js';
import { paymentsGateway, stripeSecretKey, stripeWebhookSecret } from '../premium/gateway.js';
import { trackEvent as track } from './analytics.js';
import { purgeClosedChats } from './chats.js';
import { purgeDueAccounts, requestAccountDeletion as requestDeletion } from './deletion.js';
import { exportMyData as exportData } from './export.js';
import * as gdpr from './gdpr.js';

const ok = { ok: true as const };
const HOUR_MS = 3_600_000;
const push = () => resolvePushSender(publicUrl());
const schedule = { region: REGION, timeZone: 'Europe/Madrid' } as const;

function authTimeOf(request: { auth?: { token: { auth_time?: unknown } } | undefined }) {
  const value = request.auth?.token.auth_time;
  return typeof value === 'number' ? value : undefined;
}

/** FR-59 — A (5 per day). */
export const submitGdprRequest = defineCallable(
  'submitGdprRequest',
  { input: SubmitGdprRequestInput, output: SubmitGdprRequestOutput },
  async ({ input, request, now }) => {
    const { uid } = requireAuth(request);
    await consumeRateLimit(db(), {
      scope: 'gdpr',
      key: uid,
      limit: 5,
      windowMs: 24 * HOUR_MS,
      now,
    });
    return gdpr.submitGdprRequest(db(), uid, input, await getParams(), now);
  },
);

export const listMyGdprRequests = defineCallable(
  'listMyGdprRequests',
  { input: EmptyInput, output: ListMyGdprRequestsOutput },
  async ({ request }) => gdpr.listMine(db(), requireAuth(request).uid),
);

/** FR-59 — A, re-authenticated < 5 min. */
export const exportMyData = defineCallable(
  'exportMyData',
  {
    input: EmptyInput,
    output: UrlWithExpiryOutput,
    options: { timeoutSeconds: 120, memory: '512MiB' },
  },
  async ({ request, now }) => {
    const { uid } = requireAuth(request);
    await consumeRateLimit(db(), {
      scope: 'export',
      key: uid,
      limit: 5,
      windowMs: 24 * HOUR_MS,
      now,
    });
    return exportData(db(), uid, authTimeOf(request), now);
  },
);

/** BR-29 — A, re-authenticated < 5 min. */
export const requestAccountDeletion = defineCallable(
  'requestAccountDeletion',
  {
    input: RequestAccountDeletionInput,
    output: RequestAccountDeletionOutput,
    secrets: [stripeSecretKey, stripeWebhookSecret],
  },
  async ({ request, now }) =>
    requestDeletion(
      db(),
      push(),
      () => paymentsGateway(publicUrl()),
      requireAuth(request).uid,
      authTimeOf(request),
      await getParams(),
      now,
    ),
);

/** 03 §6 — A (300 per hour). */
export const trackEvent = defineCallable(
  'trackEvent',
  { input: TrackEventInput, output: OkOutput },
  async ({ input, request, now }) => {
    const { uid } = requireAuth(request);
    await consumeRateLimit(db(), { scope: 'event', key: uid, limit: 300, windowMs: HOUR_MS, now });
    await track(db(), uid, input, now);
    return ok;
  },
);

/** FR-59 — ADM. */
export const adminListGdprRequests = defineCallable(
  'adminListGdprRequests',
  { input: AdminListGdprRequestsInput, output: AdminListGdprRequestsOutput },
  async ({ input, request, now }) => {
    requireAdmin(request);
    return gdpr.adminList(db(), input, now);
  },
);

export const adminCloseGdprRequest = defineCallable(
  'adminCloseGdprRequest',
  { input: AdminCloseGdprRequestInput, output: OkOutput },
  async ({ input, request, now }) => {
    await gdpr.adminClose(db(), push(), requireAdmin(request), input, now);
    return ok;
  },
);

/** J-05 — 03:30 daily. */
export const jobPurgeAccounts = onSchedule(
  { ...schedule, schedule: '30 3 * * *', timeoutSeconds: 540 },
  async () => {
    logger.info('J-05', { purged: await purgeDueAccounts(db(), clock.now()) });
  },
);

/** J-14 — 02:30 daily. */
export const jobPurgeClosedChats = onSchedule(
  { ...schedule, schedule: '30 2 * * *', timeoutSeconds: 540 },
  async () => {
    const params = await getParams();
    logger.info('J-14', {
      purged: await purgeClosedChats(db(), params.chatRetentionMonthsAfterClose, clock.now()),
    });
  },
);
