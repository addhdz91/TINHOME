import { FieldValue, Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { MailQueueItem } from './types.js';

const MAIL_TTL_DAYS = 90;

function mailDocument(item: MailQueueItem, now: Date): Record<string, unknown> {
  return {
    ...item,
    status: 'QUEUED',
    attempts: 0,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now.getTime() + MAIL_TTL_DAYS * 86_400_000),
  };
}

/** ADR-016 — e-mails are queued in `mailQueue` and sent by a trigger (retries, audit). */
export function enqueueMail(db: Firestore, tx: Transaction, item: MailQueueItem, now: Date): void {
  tx.create(db.collection('mailQueue').doc(), mailDocument(item, now));
}

/** Same as `enqueueMail` when there is no transaction to join. */
export async function enqueueMailNow(db: Firestore, item: MailQueueItem, now: Date): Promise<void> {
  await db.collection('mailQueue').add(mailDocument(item, now));
}
