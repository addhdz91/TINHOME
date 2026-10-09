import type { EmailTemplateId } from '@tinhome/shared/constants';
import type { EmailTemplateData, MailQueueItem, RenderedEmail } from '../types.js';
import { waitlistConfirmation } from './n19-waitlist-confirmation.js';

/** One renderer per template id: adding an id to EMAIL_TEMPLATES forces a renderer here. */
const RENDERERS: { [K in EmailTemplateId]: (data: EmailTemplateData[K]) => RenderedEmail } = {
  'N-19': waitlistConfirmation,
};

/** Renders a queued e-mail (subject, HTML and plain text). */
export function renderEmail(item: MailQueueItem): RenderedEmail {
  return RENDERERS[item.templateId](item.data);
}
