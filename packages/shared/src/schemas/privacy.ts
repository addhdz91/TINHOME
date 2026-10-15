import { z } from 'zod/mini';
import { ANALYTICS_EVENTS, GDPR_REQUEST_STATUS, GDPR_REQUEST_TYPES } from '../constants/enums.js';
import { PaginationInput } from './common.js';

/** FR-59 — `submitGdprRequest` (A). */
export const SubmitGdprRequestInput = z.object({
  type: z.enum(GDPR_REQUEST_TYPES),
  details: z.string().check(z.trim(), z.minLength(10), z.maxLength(2000)),
});
export const SubmitGdprRequestOutput = z.object({ requestId: z.string(), dueAt: z.string() });

export const GdprRequestView = z.object({
  id: z.string(),
  type: z.enum(GDPR_REQUEST_TYPES),
  details: z.string(),
  status: z.enum(GDPR_REQUEST_STATUS),
  dueAt: z.string(),
  createdAt: z.string(),
  closedAt: z.nullable(z.string()),
  note: z.nullable(z.string()),
});
export type GdprRequestView = z.infer<typeof GdprRequestView>;
export const ListMyGdprRequestsOutput = z.object({ items: z.array(GdprRequestView) });

/** FR-59 — admin queue (ADM). */
export const AdminListGdprRequestsInput = z.extend(PaginationInput, {
  status: z.optional(z.enum(GDPR_REQUEST_STATUS)),
});
export const AdminGdprRequestView = z.extend(GdprRequestView, {
  uid: z.string(),
  displayName: z.string(),
  overdue: z.boolean(),
});
export const AdminListGdprRequestsOutput = z.object({
  items: z.array(AdminGdprRequestView),
  nextCursor: z.nullable(z.string()),
});
export const AdminCloseGdprRequestInput = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(128)),
  status: z.enum(['DONE', 'REJECTED']),
  note: z.string().check(z.trim(), z.minLength(5), z.maxLength(2000)),
});

/** BR-29 — `requestAccountDeletion` (A, re-authenticated < 5 min). */
export const RequestAccountDeletionInput = z.object({ confirm: z.literal('ELIMINAR') });
export const RequestAccountDeletionOutput = z.object({ purgeAt: z.string() });

/** 03 §6 — `trackEvent` (A). */
export const TrackEventInput = z.object({
  name: z.enum(ANALYTICS_EVENTS),
  props: z.optional(
    z.record(
      z.string().check(z.minLength(1), z.maxLength(40)),
      z.union([z.string().check(z.maxLength(200)), z.number(), z.boolean()]),
    ),
  ),
});
