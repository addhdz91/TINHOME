import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '@tinhome/shared/constants';
import { SubmitReviewInput, SubmitReviewOutput } from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { clock } from '../../core/clock.js';
import { db } from '../../core/firebase.js';
import { logger } from '../../core/logger.js';
import { getParams } from '../../core/params.js';
import { publicUrl } from '../../core/public-url.js';
import { sessionOf } from '../discover/viewer.js';
import { resolvePushSender } from '../notifications/push.js';
import * as reviews from './service.js';

/** FR-32 — A, EV, ACT. */
export const submitReview = defineCallable(
  'submitReview',
  { input: SubmitReviewInput, output: SubmitReviewOutput },
  async ({ input, request, now }) =>
    reviews.submitReview(
      db(),
      resolvePushSender(publicUrl()),
      sessionOf(request).uid,
      input,
      await getParams(),
      now,
    ),
);

/** J-03 — 02:00 daily. */
export const jobPublishReviews = onSchedule(
  { region: REGION, timeZone: 'Europe/Madrid', schedule: '0 2 * * *' },
  async () => {
    const published = await reviews.publishExpiredReviews(
      db(),
      resolvePushSender(publicUrl()),
      await getParams(),
      clock.now(),
    );
    logger.info('J-03', { published });
  },
);
