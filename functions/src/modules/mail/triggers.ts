import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { REGION } from '@tinhome/shared/constants';
import { resolveEmailProvider } from '../../core/email/providers.js';
import type { MailQueueItem } from '../../core/email/types.js';
import { deliverMail } from './service.js';

/** 03_TECHNICAL_SPEC.md §5.4 — sends queued e-mails; retried by the platform on failure. */
export const onMailQueued = onDocumentCreated(
  { document: 'mailQueue/{mailId}', region: REGION, retry: true },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const item = snapshot.data() as MailQueueItem & { status: string; attempts: number };
    const provider = resolveEmailProvider();
    const { retry } = await deliverMail(snapshot.ref, item, provider);
    if (retry) throw new Error(`mail ${snapshot.id} will be retried`);
  },
);
