import { FieldValue } from 'firebase-admin/firestore';
import type { AuditEntry } from '@tinhome/shared/types';
import { db } from './firebase.js';

/** Minimal writer so the audit can be tested without Firestore. */
export type AuditSink = (entry: AuditEntry & { createdAt: unknown }) => Promise<void>;

const firestoreSink: AuditSink = async (entry) => {
  await db().collection('auditLog').add(entry);
};

/** Appends an insert-only `auditLog` entry (every admin action and every identity-document access). */
export async function writeAudit(
  entry: AuditEntry,
  sink: AuditSink = firestoreSink,
): Promise<void> {
  await sink({ ...entry, createdAt: FieldValue.serverTimestamp() });
}
