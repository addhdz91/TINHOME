import type { MailQueueItem, RenderedEmail } from '../types.js';
import { welcome } from './n02-welcome.js';
import { identity } from './n03-identity.js';
import { founder } from './n04-founder.js';
import { cityOpen } from './n05-city-open.js';
import { likesDigest } from './n06-likes-digest.js';
import { match } from './n07-match.js';
import { exchange } from './n08-exchange.js';
import { exchangeReminder } from './n09-reminder.js';
import { reviewInvite } from './n10-review.js';
import { reviewsPublished } from './n11-reviews-published.js';
import { billing } from './n12-billing.js';
import { referral } from './n13-referral.js';
import { reportAck } from './n14-report-ack.js';
import { statement } from './n15-statement.js';
import { result } from './n16-result.js';
import { legalUpdate } from './n17-legal.js';
import { deletion } from './n18-deletion.js';
import { waitlistConfirmation } from './n19-waitlist-confirmation.js';
import { unreadDigest } from './n20-unread.js';
import { messageLike } from './n21-message-like.js';
import { hold } from './n23-hold.js';
import { complaint } from './n25-complaint.js';
import { adminAlert } from './n26-admin-alert.js';
import { security } from './n27-security.js';
import { gdprReply } from './n30-gdpr.js';

/** Renders a queued e-mail. Adding a template id makes this switch non-exhaustive (type error). */
export function renderEmail(item: MailQueueItem): RenderedEmail {
  switch (item.templateId) {
    case 'N-02':
      return welcome(item.data);
    case 'N-03':
      return identity(item.data);
    case 'N-04':
      return founder(item.data);
    case 'N-07':
      return match(item.data);
    case 'N-12':
      return billing(item.data);
    case 'N-13':
      return referral(item.data);
    case 'N-14':
      return reportAck(item.data);
    case 'N-15':
      return statement(item.data);
    case 'N-16':
      return result(item.data);
    case 'N-24':
      return statement(item.data);
    case 'N-25':
      return complaint(item.data);
    case 'N-26':
      return adminAlert(item.data);
    case 'N-17':
      return legalUpdate(item.data);
    case 'N-18':
      return deletion(item.data);
    case 'N-30':
      return gdprReply(item.data);
    case 'N-19':
      return waitlistConfirmation(item.data);
    case 'N-05':
      return cityOpen(item.data);
    case 'N-06':
      return likesDigest(item.data);
    case 'N-08':
      return exchange(item.data);
    case 'N-09':
      return exchangeReminder(item.data);
    case 'N-10':
      return reviewInvite(item.data);
    case 'N-11':
      return reviewsPublished(item.data);
    case 'N-20':
      return unreadDigest(item.data);
    case 'N-21':
      return messageLike(item.data);
    case 'N-23':
      return hold(item.data);
    case 'N-27':
      return security(item.data);
  }
}
