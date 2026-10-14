import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface ReviewInviteData {
  otherName: string;
  /** «11 de abril de 2027». */
  deadline: string;
  url: string;
}

/** N-10 — rate your exchange (end + 1 and + 10 days). */
export function reviewInvite(data: ReviewInviteData): RenderedEmail {
  return simpleEmail({
    subject: `¿Qué tal el intercambio con ${data.otherName}?`,
    paragraphs: [
      `Tienes hasta el ${data.deadline} para valorarlo. Las valoraciones son de doble ciego: la tuya se publica cuando ${data.otherName} también valore o al terminar el plazo.`,
    ],
    cta: { label: 'Valorar', url: data.url },
  });
}
