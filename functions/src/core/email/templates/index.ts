import type { MailQueueItem, RenderedEmail } from '../types.js';
import { welcome } from './n02-welcome.js';
import { identity } from './n03-identity.js';
import { founder } from './n04-founder.js';
import { referral } from './n13-referral.js';
import { waitlistConfirmation } from './n19-waitlist-confirmation.js';
import { hold } from './n23-hold.js';
import { security } from './n27-security.js';

/** Renders a queued e-mail. Adding a template id makes this switch non-exhaustive (type error). */
export function renderEmail(item: MailQueueItem): RenderedEmail {
  switch (item.templateId) {
    case 'N-02':
      return welcome(item.data);
    case 'N-03':
      return identity(item.data);
    case 'N-04':
      return founder(item.data);
    case 'N-13':
      return referral(item.data);
    case 'N-19':
      return waitlistConfirmation(item.data);
    case 'N-23':
      return hold(item.data);
    case 'N-27':
      return security(item.data);
  }
}
