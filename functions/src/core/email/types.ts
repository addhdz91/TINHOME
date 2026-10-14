import type { EmailTemplateId } from '@tinhome/shared/constants';
import type { WelcomeData } from './templates/n02-welcome.js';
import type { IdentityData } from './templates/n03-identity.js';
import type { FounderData } from './templates/n04-founder.js';
import type { LikesDigestData } from './templates/n06-likes-digest.js';
import type { MatchData } from './templates/n07-match.js';
import type { ExchangeData } from './templates/n08-exchange.js';
import type { ExchangeReminderData } from './templates/n09-reminder.js';
import type { ReviewInviteData } from './templates/n10-review.js';
import type { ReviewsPublishedData } from './templates/n11-reviews-published.js';
import type { BillingData } from './templates/n12-billing.js';
import type { ReferralData } from './templates/n13-referral.js';
import type { ReportAckData } from './templates/n14-report-ack.js';
import type { StatementData } from './templates/n15-statement.js';
import type { ResultData } from './templates/n16-result.js';
import type { WaitlistConfirmationData } from './templates/n19-waitlist-confirmation.js';
import type { UnreadDigestData } from './templates/n20-unread.js';
import type { MessageLikeData } from './templates/n21-message-like.js';
import type { HoldData } from './templates/n23-hold.js';
import type { AdminAlertData } from './templates/n26-admin-alert.js';
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
  'N-03': IdentityData;
  'N-04': FounderData;
  'N-07': MatchData;
  'N-12': BillingData;
  'N-13': ReferralData;
  'N-14': ReportAckData;
  'N-15': StatementData;
  'N-16': ResultData;
  'N-24': StatementData;
  'N-26': AdminAlertData;
  'N-19': WaitlistConfirmationData;
  'N-06': LikesDigestData;
  'N-08': ExchangeData;
  'N-09': ExchangeReminderData;
  'N-10': ReviewInviteData;
  'N-11': ReviewsPublishedData;
  'N-20': UnreadDigestData;
  'N-21': MessageLikeData;
  'N-23': HoldData;
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
