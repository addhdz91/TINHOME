import type { MailQueueItem, RenderedEmail } from '../types.js';
import { welcome } from './n02-welcome.js';
import { waitlistConfirmation } from './n19-waitlist-confirmation.js';
import { security } from './n27-security.js';

/** Renders a queued e-mail. Adding a template id makes this switch non-exhaustive (type error). */
export function renderEmail(item: MailQueueItem): RenderedEmail {
  switch (item.templateId) {
    case 'N-02':
      return welcome(item.data);
    case 'N-19':
      return waitlistConfirmation(item.data);
    case 'N-27':
      return security(item.data);
  }
}
