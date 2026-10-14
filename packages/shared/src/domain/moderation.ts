import {
  HIGH_PRIORITY_REASONS,
  type ReportPriority,
  type ReportReason,
  type SanctionSuggestion,
  type StrikeSeverity,
} from '../constants/enums.js';

const HOUR_MS = 3_600_000;

/** FR-44 — priority and target review time (high: 24 h, normal: 72 h). */
export function reportPriority(reason: ReportReason): ReportPriority {
  return (HIGH_PRIORITY_REASONS as readonly ReportReason[]).includes(reason) ? 'HIGH' : 'NORMAL';
}

export function reportDueAt(priority: ReportPriority, now: Date): Date {
  return new Date(now.getTime() + (priority === 'HIGH' ? 24 : 72) * HOUR_MS);
}

/** FR-68 — faults that may skip straight to suspension or ban. */
export function strikeSeverity(reason: ReportReason | null): StrikeSeverity {
  return reason !== null && (HIGH_PRIORITY_REASONS as readonly ReportReason[]).includes(reason)
    ? 'SERIOUS'
    : 'MINOR';
}

/**
 * BR-42 / FR-69 — preventive hold: a serious report from someone with a verified identity, or
 * at least P-34 independent reports in 30 days.
 */
export function shouldHold(input: {
  reason: ReportReason;
  reporterVerified: boolean;
  independentReporters30d: number;
  threshold: number;
}): 'REPORT' | 'REPORTS_THRESHOLD' | null {
  if (input.reporterVerified && reportPriority(input.reason) === 'HIGH') return 'REPORT';
  if (input.independentReporters30d >= input.threshold) return 'REPORTS_THRESHOLD';
  return null;
}

/**
 * BR-41 — sanction the system proposes after recording a strike (always confirmed by an admin):
 * 1st → warning only, 2nd → suspension of P-32 days, P-33rd → ban. A serious fault proposes at
 * least a suspension (and a ban if there was already another active strike).
 */
export function suggestedSanction(
  activeStrikes: number,
  severity: StrikeSeverity,
  strikesForBan: number,
): SanctionSuggestion {
  if (activeStrikes >= strikesForBan) return 'BAN';
  if (severity === 'SERIOUS') return activeStrikes >= 2 ? 'BAN' : 'SUSPEND';
  return activeStrikes >= 2 ? 'SUSPEND' : 'NONE';
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/** BR-41 — strikes expire after P-31 months. */
export function strikeExpiresAt(now: Date, months: number): Date {
  return addMonths(now, months);
}

/** BR-27 / FR-45 — an action can be appealed for P-14R months. */
export function isAppealOpen(actionAt: Date, now: Date, months: number): boolean {
  return now.getTime() <= addMonths(actionAt, months).getTime();
}
