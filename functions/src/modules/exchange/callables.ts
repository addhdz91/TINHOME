import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '@tinhome/shared/constants';
import {
  CancelExchangeInput,
  ExchangeOutput,
  ProposeExchangeInput,
  RespondExchangeInput,
} from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { clock } from '../../core/clock.js';
import { db } from '../../core/firebase.js';
import { logger } from '../../core/logger.js';
import { getParams } from '../../core/params.js';
import { publicUrl } from '../../core/public-url.js';
import { sessionOf } from '../discover/viewer.js';
import { sendLikesDigests } from '../notifications/digest.js';
import { resolvePushSender } from '../notifications/push.js';
import * as exchanges from './service.js';

const push = () => resolvePushSender(publicUrl());

/** FR-30 — A, EV, ACT, LEG. */
export const proposeExchange = defineCallable(
  'proposeExchange',
  { input: ProposeExchangeInput, output: ExchangeOutput },
  async ({ input, request, now }) => ({
    exchange: await exchanges.proposeExchange(
      db(),
      push(),
      sessionOf(request).uid,
      input,
      await getParams(),
      now,
    ),
  }),
);

/** FR-30 — A, EV, ACT. */
export const respondExchange = defineCallable(
  'respondExchange',
  { input: RespondExchangeInput, output: ExchangeOutput },
  async ({ input, request, now }) => ({
    exchange: await exchanges.respondExchange(db(), push(), sessionOf(request).uid, input, now),
  }),
);

/** FR-31 — A, EV. */
export const cancelExchange = defineCallable(
  'cancelExchange',
  { input: CancelExchangeInput, output: ExchangeOutput },
  async ({ input, request, now }) => ({
    exchange: await exchanges.cancelExchange(db(), push(), sessionOf(request).uid, input, now),
  }),
);

const schedule = { region: REGION, timeZone: 'Europe/Madrid' } as const;

/** J-01 — hourly. */
export const jobExpireExchangeProposals = onSchedule(
  { ...schedule, schedule: '0 * * * *' },
  async () => {
    logger.info('J-01', { expired: await exchanges.expireProposals(db(), push(), clock.now()) });
  },
);

/** J-02 — 01:00 daily. */
export const jobCompleteExchanges = onSchedule({ ...schedule, schedule: '0 1 * * *' }, async () => {
  const completed = await exchanges.completeExchanges(db(), push(), await getParams(), clock.now());
  logger.info('J-02', { completed });
});

/** J-06 — 09:00 daily: likes digest (N-06), exchange (N-09) and review (N-10) reminders. */
export const jobDailyReminders = onSchedule({ ...schedule, schedule: '0 9 * * *' }, async () => {
  const now = clock.now();
  const sender = push();
  logger.info('J-06', {
    likesDigests: await sendLikesDigests(db(), sender, now),
    exchangeReminders: await exchanges.remindUpcoming(db(), sender, now),
    reviewReminders: await exchanges.remindReviews(db(), sender, now),
  });
});
