import { z } from 'zod';
import { ANALYTICS_EVENTS, GDPR_REQUEST_STATUS, GDPR_REQUEST_TYPES } from '../constants/enums.js';
import { PaginationInput } from './common.js';

/** FR-59 — `submitGdprRequest` (A). */
export const SubmitGdprRequestInput = z.object({
  type: z.enum(GDPR_REQUEST_TYPES),
  details: z.string().trim().min(10).max(2000),
});
export const SubmitGdprRequestOutput = z.object({ requestId: z.string(), dueAt: z.string() });

export const GdprRequestView = z.object({
  id: z.string(),
  type: z.enum(GDPR_REQUEST_TYPES),
  details: z.string(),
  status: z.enum(GDPR_REQUEST_STATUS),
  dueAt: z.string(),
  createdAt: z.string(),
  closedAt: z.string().nullable(),
  note: z.string().nullable(),
});
export type GdprRequestView = z.infer<typeof GdprRequestView>;
export const ListMyGdprRequestsOutput = z.object({ items: z.array(GdprRequestView) });

/** FR-59 — admin queue (ADM). */
export const AdminListGdprRequestsInput = PaginationInput.extend({
  status: z.enum(GDPR_REQUEST_STATUS).optional(),
});
export const AdminGdprRequestView = GdprRequestView.extend({
  uid: z.string(),
  displayName: z.string(),
  overdue: z.boolean(),
});
export const AdminListGdprRequestsOutput = z.object({
  items: z.array(AdminGdprRequestView),
  nextCursor: z.string().nullable(),
});
export const AdminCloseGdprRequestInput = z.object({
  id: z.string().min(1).max(128),
  status: z.enum(['DONE', 'REJECTED']),
  note: z.string().trim().min(5).max(2000),
});

/** BR-29 — `requestAccountDeletion` (A, re-authenticated < 5 min). */
export const RequestAccountDeletionInput = z.object({ confirm: z.literal('ELIMINAR') });
export const RequestAccountDeletionOutput = z.object({ purgeAt: z.string() });

/** 03 §6 — `trackEvent` (A). */
export const TrackEventInput = z.object({
  name: z.enum(ANALYTICS_EVENTS),
  props: z
    .record(z.string().min(1).max(40), z.union([z.string().max(200), z.number(), z.boolean()]))
    .optional(),
});
