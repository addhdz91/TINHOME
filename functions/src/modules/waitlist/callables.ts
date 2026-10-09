import { onCall } from 'firebase-functions/v2/https';
import { WAITLIST_IP_LIMIT_PER_HOUR } from '@tinhome/shared/constants';
import {
  ConfirmWaitlistInput,
  ConfirmWaitlistOutput,
  JoinWaitlistInput,
  JoinWaitlistOutput,
} from '@tinhome/shared/schemas';
import { toAppError } from '../../core/app-error.js';
import { clock } from '../../core/clock.js';
import { db } from '../../core/firebase.js';
import { logger } from '../../core/logger.js';
import { callableOptions } from '../../core/options.js';
import { getParams } from '../../core/params.js';
import { parseInput } from '../../core/parse-input.js';
import { consumeRateLimit, requestIp } from '../../core/rate-limit.js';
import * as waitlist from './service.js';

const HOUR_MS = 3_600_000;

/** FR-19 — public (PUB): no session, App Check in deployed environments, rate limited by IP. */
export const joinWaitlist = onCall(callableOptions, async (request) => {
  const startedAt = Date.now();
  try {
    const input = parseInput(JoinWaitlistInput, request.data);
    const now = clock.now();
    await consumeRateLimit(db(), {
      scope: 'joinWaitlist',
      key: requestIp(request.rawRequest),
      limit: WAITLIST_IP_LIMIT_PER_HOUR,
      windowMs: HOUR_MS,
      now,
    });
    const params = await getParams();
    const result = await waitlist.joinWaitlist(db(), input, params, now);
    logger.info('joinWaitlist', {
      callable: 'joinWaitlist',
      cityId: input.cityId,
      durationMs: Date.now() - startedAt,
    });
    return JoinWaitlistOutput.parse(result);
  } catch (error) {
    const appErr = toAppError(error, `joinWaitlist-${startedAt}`);
    logger.warn('joinWaitlist failed', {
      callable: 'joinWaitlist',
      errorCode: appErr.message,
      durationMs: Date.now() - startedAt,
    });
    throw appErr;
  }
});

/** FR-19 — confirms the double opt-in from the e-mail link. */
export const confirmWaitlist = onCall(callableOptions, async (request) => {
  const startedAt = Date.now();
  try {
    const input = parseInput(ConfirmWaitlistInput, request.data);
    const params = await getParams();
    const result = await waitlist.confirmWaitlist(db(), input, params, clock.now());
    return ConfirmWaitlistOutput.parse(result);
  } catch (error) {
    const appErr = toAppError(error, `confirmWaitlist-${startedAt}`);
    logger.warn('confirmWaitlist failed', {
      callable: 'confirmWaitlist',
      errorCode: appErr.message,
    });
    throw appErr;
  }
});
