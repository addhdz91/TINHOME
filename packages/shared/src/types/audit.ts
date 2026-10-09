/** `auditLog/{id}` (04 §2.25). Insert-only; written by the server for every admin action. */
export interface AuditEntry {
  actorUid: string;
  actorRole: 'admin' | 'superadmin' | 'system' | 'user';
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
}
