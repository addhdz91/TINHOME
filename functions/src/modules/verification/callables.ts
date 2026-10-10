import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '@tinhome/shared/constants';
import {
  AdminDecideLocationReviewInput,
  AdminDecideLocationReviewOutput,
  AdminDecideVerificationInput,
  AdminDecideVerificationOutput,
  AdminGetVerificationFileUrlInput,
  AdminGetVerificationFileUrlOutput,
  AdminGetVerificationInput,
  AdminGetVerificationOutput,
  AdminListLocationReviewsOutput,
  AdminListVerificationsInput,
  AdminListVerificationsOutput,
  EmptyInput,
  GetMyVerificationOutput,
  OkOutput,
  RequestLocationReviewInput,
  SubmitIdentityVerificationInput,
  SubmitIdentityVerificationOutput,
  VerifyHomeLocationInput,
  VerifyHomeLocationOutput,
} from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { clock } from '../../core/clock.js';
import { docHashPepper } from '../../core/doc-hash.js';
import { db } from '../../core/firebase.js';
import { requireAdmin, verifiedUid } from '../../core/guards.js';
import { logger } from '../../core/logger.js';
import { getParams } from '../../core/params.js';
import { purgeLocationCoordinates, purgeVerificationFiles } from './jobs.js';
import * as location from './location.js';
import * as verification from './service.js';

/** FR-08 — A, EV, PV, ACT. */
export const submitIdentityVerification = defineCallable(
  'submitIdentityVerification',
  {
    input: SubmitIdentityVerificationInput,
    output: SubmitIdentityVerificationOutput,
    secrets: [docHashPepper],
  },
  async ({ input, request, now }) =>
    verification.submitVerification(db(), verifiedUid(request), input, now),
);

/** S-14 — A, EV. */
export const getMyVerification = defineCallable(
  'getMyVerification',
  { input: EmptyInput, output: GetMyVerificationOutput },
  async ({ request }) => ({
    verification: await verification.myVerification(db(), verifiedUid(request)),
  }),
);

export const adminListVerifications = defineCallable(
  'adminListVerifications',
  { input: AdminListVerificationsInput, output: AdminListVerificationsOutput },
  async ({ input, request }) => {
    requireAdmin(request);
    return verification.listVerifications(db(), input);
  },
);

export const adminGetVerification = defineCallable(
  'adminGetVerification',
  { input: AdminGetVerificationInput, output: AdminGetVerificationOutput },
  async ({ input, request }) => verification.getVerification(db(), requireAdmin(request), input.id),
);

export const adminGetVerificationFileUrl = defineCallable(
  'adminGetVerificationFileUrl',
  { input: AdminGetVerificationFileUrlInput, output: AdminGetVerificationFileUrlOutput },
  async ({ input, request, now }) =>
    verification.verificationFileUrl(db(), requireAdmin(request), input.id, input.file, now),
);

export const adminDecideVerification = defineCallable(
  'adminDecideVerification',
  { input: AdminDecideVerificationInput, output: AdminDecideVerificationOutput },
  async ({ input, request, now }) => ({
    verification: await verification.decideVerification(
      db(),
      requireAdmin(request),
      input,
      await getParams(),
      now,
    ),
  }),
);

/** FR-63 — A, EV, ACT. */
export const verifyHomeLocation = defineCallable(
  'verifyHomeLocation',
  { input: VerifyHomeLocationInput, output: VerifyHomeLocationOutput },
  async ({ input, request, now }) =>
    location.verifyLocation(db(), verifiedUid(request), input, await getParams(), now),
);

export const requestLocationReview = defineCallable(
  'requestLocationReview',
  { input: RequestLocationReviewInput, output: OkOutput },
  async ({ input, request }) => {
    await location.requestLocationReview(db(), verifiedUid(request), input.note);
    return { ok: true as const };
  },
);

export const adminListLocationReviews = defineCallable(
  'adminListLocationReviews',
  { input: EmptyInput, output: AdminListLocationReviewsOutput },
  async ({ request }) => {
    requireAdmin(request);
    return { items: await location.listLocationReviews(db()) };
  },
);

export const adminDecideLocationReview = defineCallable(
  'adminDecideLocationReview',
  { input: AdminDecideLocationReviewInput, output: AdminDecideLocationReviewOutput },
  async ({ input, request }) => ({
    homeId: input.homeId,
    locationCheck: await location.decideLocationReview(
      db(),
      requireAdmin(request),
      input,
      await getParams(),
    ),
  }),
);

const schedule = { region: REGION, timeZone: 'Europe/Madrid' } as const;

/** J-04 — 03:00 daily. */
export const jobPurgeVerificationFiles = onSchedule(
  { ...schedule, schedule: '0 3 * * *' },
  async () => {
    logger.info('J-04', { purged: await purgeVerificationFiles(db(), clock.now()) });
  },
);

/** J-10 — 03:15 daily. */
export const jobPurgeLocationCoordinates = onSchedule(
  { ...schedule, schedule: '15 3 * * *' },
  async () => {
    logger.info('J-10', { purged: await purgeLocationCoordinates(db(), clock.now()) });
  },
);
