import { z } from 'zod';
import {
  COMPLAINT_CATEGORIES,
  FAQ_CATEGORIES,
  REPORT_REASONS,
  TICKET_STATUS,
} from '../constants/enums.js';
import { PaginationInput } from './common.js';

const Attachments = z.array(z.string().max(300)).max(5).optional();

/** FR-67 — `submitComplaint`: signed-in users or visitors (with e-mail). */
export const SubmitComplaintInput = z.object({
  category: z.enum(COMPLAINT_CATEGORIES),
  subject: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(4000),
  attachmentPaths: Attachments,
  email: z.email().max(254).optional(),
  name: z.string().trim().min(2).max(80).optional(),
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
  ticket: TicketSummary.extend({ description: z.string(), email: z.string().nullable() }),
  messages: z.array(TicketMessage),
});
export type TicketDetail = z.infer<typeof TicketDetail>;

export const ListMyComplaintsOutput = z.object({ items: z.array(TicketSummary) });
export const GetComplaintInput = z.object({ ticketId: z.string().min(1).max(128) });
export const AddComplaintMessageInput = z.object({
  ticketId: z.string().min(1).max(128),
  text: z.string().trim().min(1).max(4000),
});

export const AdminListComplaintsInput = PaginationInput.extend({
  status: z.enum(TICKET_STATUS).optional(),
});
export const AdminListComplaintsOutput = z.object({
  items: z.array(TicketSummary),
  nextCursor: z.string().nullable(),
});
export const AdminReplyComplaintInput = z.object({
  ticketId: z.string().min(1).max(128),
  text: z.string().trim().min(1).max(4000),
  status: z.enum(TICKET_STATUS),
});

/** FR-66 — FAQ articles. */
export const RateFaqInput = z.object({ slug: z.string().min(1).max(100), helpful: z.boolean() });
export const FaqAdminView = z.object({
  slug: z.string(),
  category: z.enum(FAQ_CATEGORIES),
  question: z.string(),
  answerMarkdown: z.string(),
  order: z.number().int(),
  published: z.boolean(),
  tags: z.array(z.string()),
  helpfulYes: z.number().int(),
  helpfulNo: z.number().int(),
});
export type FaqAdminView = z.infer<typeof FaqAdminView>;
export const AdminUpsertFaqInput = z.object({
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(FAQ_CATEGORIES),
  question: z.string().trim().min(5).max(200),
  answerMarkdown: z.string().trim().min(10).max(20_000),
  order: z.number().int().min(0).max(1000),
  published: z.boolean(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
});
export const AdminUpsertFaqOutput = z.object({ faq: FaqAdminView });
export const AdminListFaqsOutput = z.object({ items: z.array(FaqAdminView) });

/** FR-43 — public report without an account (App Check + IP limit). */
export const SubmitPublicReportInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  targetUrl: z.string().trim().min(5).max(500),
  reason: z.enum(REPORT_REASONS).optional(),
  description: z.string().trim().min(20).max(4000),
  goodFaith: z.literal(true),
});
export const SubmitPublicReportOutput = z.object({ reportId: z.string() });
