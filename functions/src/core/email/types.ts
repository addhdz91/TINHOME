import type { EmailTemplateId } from '@tinhome/shared/constants';
import type { WelcomeData } from './templates/n02-welcome.js';
import type { WaitlistConfirmationData } from './templates/n19-waitlist-confirmation.js';
import type { SecurityData } from './templates/n27-security.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  /** Every e-mail has a plain-text version (M8 DoD). */
  text: string;
}

/** Template data by id, so `mailQueue` items are type-checked end to end. */
export interface EmailTemplateData {
  'N-02': WelcomeData;
  'N-19': WaitlistConfirmationData;
  'N-27': SecurityData;
}

export type MailQueueItem = {
  [K in EmailTemplateId]: { to: string; templateId: K; data: EmailTemplateData[K] };
}[EmailTemplateId];

/** 03_TECHNICAL_SPEC.md §11 — provider adapter (console in dev, HTTP in prod, DEC-69). */
export interface EmailProvider {
  readonly name: string;
  send(message: { to: string; email: RenderedEmail }): Promise<void>;
}
