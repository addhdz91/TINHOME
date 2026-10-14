import type { CallableRequest } from 'firebase-functions/v2/https';
import {
  AddComplaintMessageInput,
  AdminListComplaintsInput,
  AdminListComplaintsOutput,
  AdminListFaqsOutput,
  AdminReplyComplaintInput,
  AdminUpsertFaqInput,
  AdminUpsertFaqOutput,
  EmptyInput,
  GetComplaintInput,
  ListMyComplaintsOutput,
  OkOutput,
  RateFaqInput,
  SubmitComplaintInput,
  SubmitComplaintOutput,
  SubmitPublicReportInput,
  SubmitPublicReportOutput,
  TicketDetail,
} from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { db } from '../../core/firebase.js';
import { requireAdmin, requireAuth } from '../../core/guards.js';
import { getParams } from '../../core/params.js';
import { consumeRateLimit, requestIp } from '../../core/rate-limit.js';
import { submitPublicReport as publicReport } from '../moderation/reports.js';
import * as complaints from './complaints.js';
import * as faqs from './faqs.js';

const ok = { ok: true as const };
const HOUR_MS = 3_600_000;

function optionalUid(request: CallableRequest): string | null {
  return request.auth ? requireAuth(request).uid : null;
}

/** FR-67 — A or PUB (visitors with e-mail; 5 per hour per IP). */
export const submitComplaint = defineCallable(
  'submitComplaint',
  { input: SubmitComplaintInput, output: SubmitComplaintOutput },
  async ({ input, request, now }) => {
    const uid = optionalUid(request);
    await consumeRateLimit(db(), {
      scope: 'complaint',
      key: uid ?? requestIp(request.rawRequest),
      limit: 5,
      windowMs: HOUR_MS,
      now,
    });
    return complaints.submitComplaint(db(), uid, input, await getParams(), now);
  },
);

export const listMyComplaints = defineCallable(
  'listMyComplaints',
  { input: EmptyInput, output: ListMyComplaintsOutput },
  async ({ request }) => complaints.listMine(db(), requireAuth(request).uid),
);

export const getComplaint = defineCallable(
  'getComplaint',
  { input: GetComplaintInput, output: TicketDetail },
  async ({ input, request }) => complaints.getMine(db(), requireAuth(request).uid, input.ticketId),
);

export const addComplaintMessage = defineCallable(
  'addComplaintMessage',
  { input: AddComplaintMessageInput, output: OkOutput },
  async ({ input, request, now }) => {
    await complaints.addMessage(db(), requireAuth(request).uid, input, now);
    return ok;
  },
);

export const adminListComplaints = defineCallable(
  'adminListComplaints',
  { input: AdminListComplaintsInput, output: AdminListComplaintsOutput },
  async ({ input, request }) => {
    requireAdmin(request);
    return complaints.adminList(db(), input);
  },
);

export const adminGetComplaint = defineCallable(
  'adminGetComplaint',
  { input: GetComplaintInput, output: TicketDetail },
  async ({ input, request }) => {
    requireAdmin(request);
    return complaints.adminGet(db(), input.ticketId);
  },
);

export const adminReplyComplaint = defineCallable(
  'adminReplyComplaint',
  { input: AdminReplyComplaintInput, output: OkOutput },
  async ({ input, request, now }) => {
    await complaints.adminReply(db(), requireAdmin(request), input, now);
    return ok;
  },
);

/** FR-66 — PUB. */
export const rateFaq = defineCallable(
  'rateFaq',
  { input: RateFaqInput, output: OkOutput },
  async ({ input, request, now }) => {
    await faqs.rateFaq(db(), input, requestIp(request.rawRequest), now);
    return ok;
  },
);

export const adminListFaqs = defineCallable(
  'adminListFaqs',
  { input: EmptyInput, output: AdminListFaqsOutput },
  async ({ request }) => {
    requireAdmin(request);
    return faqs.listFaqs(db());
  },
);

export const adminUpsertFaq = defineCallable(
  'adminUpsertFaq',
  { input: AdminUpsertFaqInput, output: AdminUpsertFaqOutput },
  async ({ input, request }) => ({ faq: await faqs.upsertFaq(db(), requireAdmin(request), input) }),
);

/** FR-43 — PUB (App Check in deployed environments + 3 per hour per IP). */
export const submitPublicReport = defineCallable(
  'submitPublicReport',
  { input: SubmitPublicReportInput, output: SubmitPublicReportOutput },
  async ({ input, request, now }) => publicReport(db(), input, requestIp(request.rawRequest), now),
);
