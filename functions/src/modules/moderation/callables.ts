import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '@tinhome/shared/constants';
import {
  AdminDecideAppealInput,
  AdminDecideAppealOutput,
  AdminGetReportInput,
  AdminGetReportOutput,
  AdminHandleAlertInput,
  AdminListAlertsOutput,
  AdminListAppealsOutput,
  AdminListHoldsOutput,
  AdminListReportsInput,
  AdminListReportsOutput,
  AdminModerateInput,
  AdminModerateOutput,
  AdminResolveHoldInput,
  EmptyInput,
  GetMyStandingOutput,
  OkOutput,
  SubmitAppealInput,
  SubmitAppealOutput,
  SubmitReportInput,
  SubmitReportOutput,
} from '@tinhome/shared/schemas';
import { viewAudit } from '../../core/audit.js';
import { defineCallable } from '../../core/callable.js';
import { clock } from '../../core/clock.js';
import { db } from '../../core/firebase.js';
import { requireAdmin, requireAuth } from '../../core/guards.js';
import { logger } from '../../core/logger.js';
import { getParams } from '../../core/params.js';
import { sessionOf } from '../discover/viewer.js';
import { decideAppeal, submitAppeal as appeal } from './appeals.js';
import { alertDeadlines, expireStrikes, reactivateSuspended } from './jobs.js';
import { moderate } from './moderate.js';
import * as queue from './queue.js';
import { submitReport as report } from './reports.js';

const ok = { ok: true as const };

/** FR-42 — A, EV. */
export const submitReport = defineCallable(
  'submitReport',
  { input: SubmitReportInput, output: SubmitReportOutput },
  async ({ input, request, now }) =>
    report(db(), sessionOf(request).uid, input, await getParams(), now),
);

/** FR-45 — A. */
export const submitAppeal = defineCallable(
  'submitAppeal',
  { input: SubmitAppealInput, output: SubmitAppealOutput },
  async ({ input, request, now }) => ({
    appealId: await appeal(db(), requireAuth(request).uid, input, await getParams(), now),
  }),
);

/** FR-68 — A: strikes, decisions and hold of the caller (S-20). */
export const getMyStanding = defineCallable(
  'getMyStanding',
  { input: EmptyInput, output: GetMyStandingOutput },
  async ({ request, now }) =>
    queue.myStanding(db(), requireAuth(request).uid, await getParams(), now),
);

export const adminListReports = defineCallable(
  'adminListReports',
  { input: AdminListReportsInput, output: AdminListReportsOutput },
  async ({ input, request }) => {
    requireAdmin(request);
    return queue.listReports(db(), input);
  },
);

export const adminGetReport = defineCallable(
  'adminGetReport',
  { input: AdminGetReportInput, output: AdminGetReportOutput },
  async ({ input, request, now }) => {
    const actor = requireAdmin(request);
    // The report carries a snapshot of the reported content (possibly chat messages).
    await viewAudit(actor, 'report.view', 'report', input.id);
    return queue.getReport(db(), input.id, await getParams(), now);
  },
);

/** FR-44 — ADM; every decision is audited. */
export const adminModerate = defineCallable(
  'adminModerate',
  { input: AdminModerateInput, output: AdminModerateOutput },
  async ({ input, request, now }) =>
    moderate(db(), requireAdmin(request), input, await getParams(), now),
);

export const adminListAppeals = defineCallable(
  'adminListAppeals',
  { input: EmptyInput, output: AdminListAppealsOutput },
  async ({ request, now }) => {
    requireAdmin(request);
    return queue.listAppeals(db(), await getParams(), now);
  },
);

export const adminDecideAppeal = defineCallable(
  'adminDecideAppeal',
  { input: AdminDecideAppealInput, output: AdminDecideAppealOutput },
  async ({ input, request, now }) =>
    decideAppeal(db(), requireAdmin(request), input, await getParams(), now),
);

export const adminResolveHold = defineCallable(
  'adminResolveHold',
  { input: AdminResolveHoldInput, output: OkOutput },
  async ({ input, request, now }) => {
    await queue.resolveHold(db(), requireAdmin(request), input, await getParams(), now);
    return ok;
  },
);

export const adminListAlerts = defineCallable(
  'adminListAlerts',
  { input: EmptyInput, output: AdminListAlertsOutput },
  async ({ request }) => {
    requireAdmin(request);
    return queue.listAlerts(db());
  },
);

export const adminHandleAlert = defineCallable(
  'adminHandleAlert',
  { input: AdminHandleAlertInput, output: OkOutput },
  async ({ input, request, now }) => {
    await queue.handleAlert(db(), requireAdmin(request), input.alertId, now);
    return ok;
  },
);

export const adminListHolds = defineCallable(
  'adminListHolds',
  { input: EmptyInput, output: AdminListHoldsOutput },
  async ({ request }) => {
    requireAdmin(request);
    return queue.listHolds(db());
  },
);

const schedule = { region: REGION, timeZone: 'Europe/Madrid' } as const;

/** J-07 — hourly. */
export const jobReactivateSuspended = onSchedule(
  { ...schedule, schedule: '5 * * * *' },
  async () => {
    logger.info('J-07', {
      reactivated: await reactivateSuspended(db(), await getParams(), clock.now()),
    });
  },
);

/** J-11 — 04:30 daily. */
export const jobExpireStrikes = onSchedule({ ...schedule, schedule: '30 4 * * *' }, async () => {
  logger.info('J-11', { expired: await expireStrikes(db(), clock.now()) });
});

/** J-12 — every 15 minutes. */
export const jobModerationDeadlines = onSchedule(
  { ...schedule, schedule: '*/15 * * * *' },
  async () => {
    logger.info('J-12', { alerts: await alertDeadlines(db(), clock.now()) });
  },
);
