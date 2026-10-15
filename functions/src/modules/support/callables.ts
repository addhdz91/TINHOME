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
  type VisitorConsents,
} from '@tinhome/shared/schemas';
import { appError } from '../../core/app-error.js';
import { defineCallable } from '../../core/callable.js';
import {
  assertCurrentVersions,
  recordConsents,
  requestUserAgent,
  type ConsentItem,
} from '../../core/consent.js';
import { db } from '../../core/firebase.js';
import { requireAdmin, requireAuth } from '../../core/guards.js';
import { getParams } from '../../core/params.js';
import { consumeRateLimit, requestIp } from '../../core/rate-limit.js';
import { submitPublicReport as publicReport } from '../moderation/reports.js';
import * as complaints from './complaints.js';
import * as faqs from './faqs.js';

const ok = { ok: true as const };

/** Privacy and cookies policies accepted in a public form. */
function visitorConsentItems(consents: VisitorConsents): ConsentItem[] {
  return [
    { slug: 'privacidad', version: consents.privacidad, type: 'PRIVACY' },
    { slug: 'cookies', version: consents.cookies, type: 'COOKIES' },
  ];
}
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
    // Visitors accept the privacy and cookies policies in the form (signed-in people did at
    // sign-up); the evidence is stored only once the complaint exists.
    if (!uid) {
      if (!input.consents) throw appError('E_VALIDATION', { fields: { consents: 'required' } });
      await assertCurrentVersions(db(), input.consents);
    }
    const result = await complaints.submitComplaint(db(), uid, input, await getParams(), now);
    if (!uid && input.consents) {
      await recordConsents(db(), visitorConsentItems(input.consents), {
        uid: null,
        email: input.email ?? null,
        source: 'PUBLIC_COMPLAINT',
        ip: requestIp(request.rawRequest),
        userAgent: requestUserAgent(request.rawRequest),
      });
    }
    return result;
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
  async ({ input, request, now }) => {
    await assertCurrentVersions(db(), input.consents);
    const result = await publicReport(db(), input, requestIp(request.rawRequest), now);
    await recordConsents(db(), visitorConsentItems(input.consents), {
      uid: null,
      email: input.email,
      source: 'PUBLIC_REPORT',
      ip: requestIp(request.rawRequest),
      userAgent: requestUserAgent(request.rawRequest),
    });
    return result;
  },
);
