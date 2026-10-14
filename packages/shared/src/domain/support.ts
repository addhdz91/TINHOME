const DAY_MS = 86_400_000;

/** BR-43 — tracking number `TH-2026-000123` (year of creation + yearly sequence). */
export function ticketNumber(year: number, sequence: number): string {
  return `TH-${String(year)}-${String(sequence).padStart(6, '0')}`;
}

/** BR-43 — answer due P-38 days after receiving the complaint. */
export function complaintDueAt(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

/** A ticket is closed to new messages once resolved or closed. */
export function isTicketOpen(status: string): boolean {
  return status !== 'RESOLVED' && status !== 'CLOSED';
}
