import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface MatchData {
  /** Visible name of the other person («Javier S.»). */
  otherName: string;
  otherCity: string;
  chatUrl: string;
}

/** N-07 — new match (FR-24). */
export function match(data: MatchData): RenderedEmail {
  return simpleEmail({
    subject: `¡Tienes un match con ${data.otherName}!`,
    paragraphs: [
      `A ${data.otherName} (${data.otherCity}) también le gusta tu casa.`,
      'Escribidle desde el chat de TinHome para hablar de fechas. Recuerda: nunca envíes dinero ni datos bancarios; TinHome no participa en el acuerdo.',
    ],
    cta: { label: 'Abrir el chat', url: data.chatUrl },
  });
}
