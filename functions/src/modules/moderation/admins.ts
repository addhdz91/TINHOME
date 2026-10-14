import type { Firestore } from 'firebase-admin/firestore';
import { enqueueMailNow } from '../../core/email/queue.js';
import type { AdminAlertData } from '../../core/email/templates/n26-admin-alert.js';
import { publicUrl } from '../../core/public-url.js';

/**
 * N-26 recipients: `adminDirectory/{uid}` (`email`, `role`), kept by `set-role` and
 * `adminSetRole` because roles live in Auth custom claims (10_DECISIONS §5, M9).
 */
export async function adminEmails(db: Firestore, only?: 'superadmin'): Promise<string[]> {
  const snaps = await db.collection('adminDirectory').get();
  return snaps.docs
    .filter((doc) => (only ? doc.get('role') === only : true))
    .map((doc) => String(doc.get('email') ?? ''))
    .filter((email) => email.includes('@'));
}

/** N-26 by e-mail to every admin (or only superadmins for escalations). */
export async function emailAdmins(
  db: Firestore,
  data: Omit<AdminAlertData, 'url'> & { path: string },
  now: Date,
  only?: 'superadmin',
): Promise<void> {
  const emails = await adminEmails(db, only);
  for (const to of emails) {
    await enqueueMailNow(
      db,
      {
        to,
        templateId: 'N-26',
        data: { kind: data.kind, summary: data.summary, url: `${publicUrl()}${data.path}` },
      },
      now,
    );
  }
}
