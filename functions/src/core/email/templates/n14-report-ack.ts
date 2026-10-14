import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface ReportAckData {
  reference: string;
}

/** N-14 — the report was received (FR-42). Never says who or what was reported. */
export function reportAck(data: ReportAckData): RenderedEmail {
  return simpleEmail({
    subject: 'Hemos recibido tu denuncia',
    paragraphs: [
      'Hemos recibido tu denuncia. La revisaremos a fondo y te informaremos del resultado.',
      `Referencia: ${data.reference}. La persona denunciada no sabrá quién la ha denunciado.`,
    ],
    footer: 'Recibes este email porque has enviado una denuncia a TinHome.',
  });
}
