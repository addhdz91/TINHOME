import { describe, expect, it } from 'vitest';
import { complaintDueAt, isTicketOpen, ticketNumber } from './support.js';

describe('complaints (FR-67, BR-43)', () => {
  it('numbers tickets per year and sets the deadline', () => {
    expect(ticketNumber(2026, 123)).toBe('TH-2026-000123');
    expect(complaintDueAt(new Date('2027-03-01T10:00:00Z'), 15).toISOString()).toBe(
      '2027-03-16T10:00:00.000Z',
    );
    expect(isTicketOpen('WAITING_USER')).toBe(true);
    expect(isTicketOpen('RESOLVED')).toBe(false);
  });
});
