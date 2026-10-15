import { z } from 'zod/mini';
import {
  ADMIN_ALERT_TYPES,
  APPEAL_DECISIONS,
  APPEAL_STATUS,
  HOLD_DECISIONS,
  MODERATION_ACTIONS,
  REPORT_PRIORITIES,
  REPORT_REASONS,
  REPORT_STATUS,
  REPORT_TARGETS,
  SANCTION_SUGGESTIONS,
  STATEMENT_GROUNDS,
  STATEMENT_TEMPLATES,
} from '../constants/enums.js';
import { PaginationInput } from './common.js';

const Id = z.string().check(z.minLength(1), z.maxLength(256));

/** FR-42 — `submitReport`. MESSAGE targets are `matchId/messageId`. */
export const SubmitReportInput = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: Id,
  reason: z.enum(REPORT_REASONS),
  description: z.string().check(z.trim(), z.minLength(20), z.maxLength(2000)),
  attachmentPaths: z.optional(z.array(z.string().check(z.maxLength(300))).check(z.maxLength(5))),
  alsoBlock: z.optional(z.boolean()),
});
export type SubmitReportInput = z.infer<typeof SubmitReportInput>;
export const SubmitReportOutput = z.object({
  reportId: z.string(),
  priority: z.enum(REPORT_PRIORITIES),
  preventiveHold: z.boolean(),
});

/** FR-44 / BR-27 — statement of reasons chosen by the admin (scope, duration and redress are added by the server). */
export const StatementInput = z.object({
  templateId: z.enum(STATEMENT_TEMPLATES),
  facts: z.string().check(z.trim(), z.minLength(20), z.maxLength(2000)),
  ground: z.enum(STATEMENT_GROUNDS),
  groundDetail: z.string().check(z.trim(), z.minLength(5), z.maxLength(500)),
});
export type StatementInput = z.infer<typeof StatementInput>;
export const StatementOfReasons = z.extend(StatementInput, {
  scope: z.string(),
  duration: z.string(),
  redress: z.string(),
});
export type StatementOfReasons = z.infer<typeof StatementOfReasons>;

export const ReportSummary = z.object({
  id: z.string(),
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string(),
  targetUid: z.string(),
  reason: z.enum(REPORT_REASONS),
  priority: z.enum(REPORT_PRIORITIES),
  status: z.enum(REPORT_STATUS),
  reporterVerified: z.boolean(),
  public: z.boolean(),
  dueAt: z.string(),
  createdAt: z.string(),
});
export type ReportSummary = z.infer<typeof ReportSummary>;

export const AdminListReportsInput = z.extend(PaginationInput, {
  status: z.optional(z.enum(REPORT_STATUS)),
  priority: z.optional(z.enum(REPORT_PRIORITIES)),
});
export const AdminListReportsOutput = z.object({
  items: z.array(ReportSummary),
  nextCursor: z.nullable(z.string()),
});

const SnapshotMessage = z.object({
  id: z.string(),
  senderUid: z.nullable(z.string()),
  text: z.string(),
  createdAt: z.nullable(z.string()),
  reported: z.boolean(),
});
export const ModerationActionView = z.object({
  id: z.string(),
  action: z.enum(MODERATION_ACTIONS),
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string(),
  statement: z.nullable(StatementOfReasons),
  suspendedUntil: z.nullable(z.string()),
  adminUid: z.nullable(z.string()),
  createdAt: z.string(),
  appeal: z.nullable(
    z.object({
      id: z.string(),
      status: z.enum(APPEAL_STATUS),
      decisionText: z.nullable(z.string()),
    }),
  ),
  appealable: z.boolean(),
});
export type ModerationActionView = z.infer<typeof ModerationActionView>;
export const StrikeView = z.object({
  id: z.string(),
  reason: z.string(),
  severity: z.enum(['MINOR', 'SERIOUS']),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export const AdminGetReportInput = z.object({ id: Id });
export const AdminGetReportOutput = z.object({
  report: z.extend(ReportSummary, {
    description: z.string(),
    reporterName: z.nullable(z.string()),
    targetUrl: z.nullable(z.string()),
    snapshot: z.object({
      title: z.nullable(z.string()),
      text: z.nullable(z.string()),
      photoUrls: z.array(z.string()),
      messages: z.array(SnapshotMessage),
    }),
    attachmentCount: z.int(),
  }),
  targetUserHistory: z.object({
    displayName: z.string(),
    status: z.string(),
    strikesActive: z.int(),
    strikes: z.array(StrikeView),
    actions: z.array(ModerationActionView),
    openReports: z.int(),
    hold: z.nullable(z.object({ reason: z.string(), dueAt: z.nullable(z.string()) })),
  }),
});
export type AdminGetReportOutput = z.infer<typeof AdminGetReportOutput>;

/** FR-44 — `adminModerate`. */
export const AdminModerateInput = z.object({
  reportId: z.optional(Id),
  targetType: z.enum(REPORT_TARGETS),
  targetId: Id,
  targetUid: Id,
  action: z.enum(MODERATION_ACTIONS),
  recordStrike: z.optional(z.boolean()),
  suspendedUntil: z.optional(z.iso.datetime()),
  statement: z.optional(StatementInput),
});
export type AdminModerateInput = z.infer<typeof AdminModerateInput>;
export const AdminModerateOutput = z.object({
  actionId: z.string(),
  strikesActive: z.int(),
  suggestedNext: z.enum(SANCTION_SUGGESTIONS),
});

/** FR-45 — appeals. */
export const SubmitAppealInput = z.object({
  actionId: Id,
  text: z.string().check(z.trim(), z.minLength(20), z.maxLength(2000)),
});
export const SubmitAppealOutput = z.object({ appealId: z.string() });
export const AdminDecideAppealInput = z.object({
  appealId: Id,
  decision: z.enum(APPEAL_DECISIONS),
  text: z.string().check(z.trim(), z.minLength(10), z.maxLength(2000)),
});
export const AdminDecideAppealOutput = z.object({
  appeal: z.object({ id: z.string(), status: z.enum(APPEAL_STATUS) }),
  sameAdmin: z.boolean(),
});
export const AppealSummary = z.object({
  id: z.string(),
  actionId: z.string(),
  uid: z.string(),
  text: z.string(),
  status: z.enum(APPEAL_STATUS),
  action: ModerationActionView,
  createdAt: z.string(),
});
export const AdminListAppealsOutput = z.object({ items: z.array(AppealSummary) });

/** FR-69 — resolve a preventive hold of a home or an account. */
export const AdminResolveHoldInput = z.object({
  uid: Id,
  scope: z.enum(['HOME', 'USER']),
  decision: z.enum(HOLD_DECISIONS),
  statement: z.optional(StatementInput),
});

export const AdminAlertView = z.object({
  id: z.string(),
  type: z.enum(ADMIN_ALERT_TYPES),
  refType: z.string(),
  refId: z.string(),
  priority: z.enum(REPORT_PRIORITIES),
  createdAt: z.string(),
});
export const AdminListAlertsOutput = z.object({ items: z.array(AdminAlertView) });
export const AdminHandleAlertInput = z.object({ alertId: Id });

/** FR-68 — my standing: active strikes, decisions about me and their appeals (Ajustes › Mi cuenta). */
export const GetMyStandingOutput = z.object({
  strikes: z.array(StrikeView),
  actions: z.array(ModerationActionView),
  hold: z.nullable(
    z.object({
      scope: z.enum(['HOME', 'USER']),
      reason: z.string(),
      dueAt: z.nullable(z.string()),
    }),
  ),
});
export type GetMyStandingOutput = z.infer<typeof GetMyStandingOutput>;

/** FR-69 — homes and accounts on preventive hold (admin «Retenciones»). */
export const AdminListHoldsOutput = z.object({
  items: z.array(
    z.object({
      uid: z.string(),
      scope: z.enum(['HOME', 'USER']),
      displayName: z.string(),
      reason: z.string(),
      since: z.nullable(z.string()),
      dueAt: z.nullable(z.string()),
    }),
  ),
});
