import { z } from 'zod/mini';
import {
  COMPLAINT_CATEGORIES,
  FAQ_CATEGORIES,
  REPORT_REASONS,
  TICKET_STATUS,
} from '../constants/enums.js';
import { PaginationInput } from './common.js';

const Attachments = z.optional(z.array(z.string().check(z.maxLength(300))).check(z.maxLength(5)));

/** FR-67 — `submitComplaint`: signed-in users or visitors (with e-mail). */
export const SubmitComplaintInput = z.object({
  category: z.enum(COMPLAINT_CATEGORIES),
  subject: z.string().check(z.trim(), z.minLength(5), z.maxLength(120)),
  description: z.string().check(z.trim(), z.minLength(20), z.maxLength(4000)),
  attachmentPaths: Attachments,
  email: z.optional(z.email().check(z.maxLength(254))),
  name: z.optional(z.string().check(z.trim(), z.minLength(2), z.maxLength(80))),
});
export type SubmitComplaintInput = z.infer<typeof SubmitComplaintInput>;
export const SubmitComplaintOutput = z.object({
  ticketId: z.string(),
  number: z.string(),
  dueAt: z.string(),
});

export const TicketSummary = z.object({
  id: z.string(),
  number: z.string(),
  category: z.enum(COMPLAINT_CATEGORIES),
  subject: z.string(),
  status: z.enum(TICKET_STATUS),
  dueAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TicketSummary = z.infer<typeof TicketSummary>;
export const TicketMessage = z.object({
  id: z.string(),
  authorType: z.enum(['USER', 'ADMIN']),
  text: z.string(),
  createdAt: z.string(),
});
export const TicketDetail = z.object({
  ticket: z.extend(TicketSummary, { description: z.string(), email: z.nullable(z.string()) }),
  messages: z.array(TicketMessage),
});
export type TicketDetail = z.infer<typeof TicketDetail>;

export const ListMyComplaintsOutput = z.object({ items: z.array(TicketSummary) });
export const GetComplaintInput = z.object({
  ticketId: z.string().check(z.minLength(1), z.maxLength(128)),
});
export const AddComplaintMessageInput = z.object({
  ticketId: z.string().check(z.minLength(1), z.maxLength(128)),
  text: z.string().check(z.trim(), z.minLength(1), z.maxLength(4000)),
});

export const AdminListComplaintsInput = z.extend(PaginationInput, {
  status: z.optional(z.enum(TICKET_STATUS)),
});
export const AdminListComplaintsOutput = z.object({
  items: z.array(TicketSummary),
  nextCursor: z.nullable(z.string()),
});
export const AdminReplyComplaintInput = z.object({
  ticketId: z.string().check(z.minLength(1), z.maxLength(128)),
  text: z.string().check(z.trim(), z.minLength(1), z.maxLength(4000)),
  status: z.enum(TICKET_STATUS),
});

/** FR-66 — FAQ articles. */
export const RateFaqInput = z.object({
  slug: z.string().check(z.minLength(1), z.maxLength(100)),
  helpful: z.boolean(),
});
export const FaqAdminView = z.object({
  slug: z.string(),
  category: z.enum(FAQ_CATEGORIES),
  question: z.string(),
  answerMarkdown: z.string(),
  order: z.int(),
  published: z.boolean(),
  tags: z.array(z.string()),
  helpfulYes: z.int(),
  helpfulNo: z.int(),
});
export type FaqAdminView = z.infer<typeof FaqAdminView>;
export const AdminUpsertFaqInput = z.object({
  slug: z.string().check(z.minLength(3), z.maxLength(100), z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  category: z.enum(FAQ_CATEGORIES),
  question: z.string().check(z.trim(), z.minLength(5), z.maxLength(200)),
  answerMarkdown: z.string().check(z.trim(), z.minLength(10), z.maxLength(20_000)),
  order: z.int().check(z.gte(0), z.lte(1000)),
  published: z.boolean(),
  tags: z.array(z.string().check(z.trim(), z.minLength(1), z.maxLength(40))).check(z.maxLength(20)),
});
export const AdminUpsertFaqOutput = z.object({ faq: FaqAdminView });
export const AdminListFaqsOutput = z.object({ items: z.array(FaqAdminView) });

/** FR-43 — public report without an account (App Check + IP limit). */
export const SubmitPublicReportInput = z.object({
  name: z.string().check(z.trim(), z.minLength(2), z.maxLength(80)),
  email: z.email().check(z.maxLength(254)),
  targetUrl: z.string().check(z.trim(), z.minLength(5), z.maxLength(500)),
  reason: z.optional(z.enum(REPORT_REASONS)),
  description: z.string().check(z.trim(), z.minLength(20), z.maxLength(4000)),
  goodFaith: z.literal(true),
});
export const SubmitPublicReportOutput = z.object({ reportId: z.string() });
