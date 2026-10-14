import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface GdprReplyData {
  typeLabel: string;
  done: boolean;
  note: string;
  url: string;
}

/** N-30 — answer to a GDPR rights request (FR-59, BR-30). PROVISIONAL wording. */
export function gdprReply(data: GdprReplyData): RenderedEmail {
  return simpleEmail({
    subject: `Respuesta a tu solicitud de ${data.typeLabel.toLowerCase()}`,
    paragraphs: [
      data.done
        ? 'Hemos atendido tu solicitud de protección de datos.'
        : 'Hemos revisado tu solicitud de protección de datos y no podemos atenderla.',
      data.note,
      'Si no estás de acuerdo, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
    ],
    cta: { label: 'Ver mis solicitudes', url: data.url },
    footer: 'Este es un aviso de servicio y no se puede desactivar.',
  });
}
