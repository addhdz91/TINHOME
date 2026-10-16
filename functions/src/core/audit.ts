import { FieldValue } from 'firebase-admin/firestore';
import type { AuditEntry } from '@tinhome/shared/types';
import { db } from './firebase.js';

/** Minimal writer so the audit can be tested without Firestore. */
export type AuditSink = (entry: AuditEntry & { createdAt: unknown }) => Promise<void>;

const firestoreSink: AuditSink = async (entry) => {
  await db().collection('auditLog').add(entry);
};

/** Audit entry for a staff read of personal data (who looked at what, never the data). */
export async function viewAudit(
  actor: { uid: string; role: 'admin' | 'superadmin' },
  action: string,
  targetType: string,
  targetId: string,
): Promise<void> {
  await writeAudit({ actorUid: actor.uid, actorRole: actor.role, action, targetType, targetId });
}

/** Appends an insert-only `auditLog` entry (every admin action and every identity-document access). */
export async function writeAudit(
  entry: AuditEntry,
  sink: AuditSink = firestoreSink,
): Promise<void> {
  await sink({ ...entry, createdAt: FieldValue.serverTimestamp() });
}
