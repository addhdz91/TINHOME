import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { MAIL_MAX_ATTEMPTS } from '@tinhome/shared/constants';
import { renderEmail } from '../../core/email/templates/index.js';
import type { EmailProvider, MailQueueItem } from '../../core/email/types.js';
import { logger } from '../../core/logger.js';

/**
 * Sends one `mailQueue` item. Returns `true` when the caller should retry (the trigger
 * re-throws so Cloud Functions retries the event); after MAIL_MAX_ATTEMPTS it gives up.
 */
export async function deliverMail(
  ref: DocumentReference,
  item: MailQueueItem & { status: string; attempts: number },
  provider: EmailProvider,
): Promise<{ retry: boolean }> {
  if (item.status !== 'QUEUED') return { retry: false };
  try {
    await provider.send({ to: item.to, email: renderEmail(item) });
    await ref.update({
      status: 'SENT',
      sentAt: FieldValue.serverTimestamp(),
      attempts: item.attempts + 1,
    });
    return { retry: false };
  } catch (error) {
    const attempts = item.attempts + 1;
    const failed = attempts >= MAIL_MAX_ATTEMPTS;
    const lastError = error instanceof Error ? error.message.slice(0, 200) : 'unknown';
    await ref.update({ attempts, lastError, status: failed ? 'FAILED' : 'QUEUED' });
    logger.error('mail delivery failed', {
      mailId: ref.id,
      templateId: item.templateId,
      attempts,
      provider: provider.name,
    });
    return { retry: !failed };
  }
}
