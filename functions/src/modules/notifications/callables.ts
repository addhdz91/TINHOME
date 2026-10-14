import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '@tinhome/shared/constants';
import {
  EmptyInput,
  MarkAllNotificationsReadOutput,
  OkOutput,
  RegisterPushTokenInput,
  UnregisterPushTokenInput,
} from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { clock } from '../../core/clock.js';
import { db } from '../../core/firebase.js';
import { requireAuth } from '../../core/guards.js';
import { logger } from '../../core/logger.js';
import { publicUrl } from '../../core/public-url.js';
import { sendUnreadDigests } from './digest.js';
import { resolvePushSender } from './push.js';
import * as notifications from './service.js';

const ok = { ok: true as const };

/** FR-46 — A. */
export const markAllNotificationsRead = defineCallable(
  'markAllNotificationsRead',
  { input: EmptyInput, output: MarkAllNotificationsReadOutput },
  async ({ request, now }) => ({
    updated: await notifications.markAllRead(db(), requireAuth(request).uid, now),
  }),
);

/** FR-70 — A. */
export const registerPushToken = defineCallable(
  'registerPushToken',
  { input: RegisterPushTokenInput, output: OkOutput },
  async ({ input, request }) => {
    const header = (request.rawRequest as { headers?: Record<string, unknown> } | undefined)
      ?.headers?.['user-agent'];
    const userAgent = typeof header === 'string' ? header : '';
    await notifications.registerPushToken(db(), requireAuth(request).uid, input.token, userAgent);
    return ok;
  },
);

export const unregisterPushToken = defineCallable(
  'unregisterPushToken',
  { input: UnregisterPushTokenInput, output: OkOutput },
  async ({ input, request }) => {
    await notifications.unregisterPushToken(db(), requireAuth(request).uid, input.token);
    return ok;
  },
);

/** J-13 — every 30 minutes. */
export const jobUnreadDigest = onSchedule(
  { region: REGION, timeZone: 'Europe/Madrid', schedule: '*/30 * * * *' },
  async () => {
    const sent = await sendUnreadDigests(db(), resolvePushSender(publicUrl()), clock.now());
    logger.info('J-13', { sent });
  },
);
