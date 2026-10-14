import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface ComplaintData {
  kind: 'RECEIVED' | 'REPLIED' | 'RESOLVED';
  number: string;
  /** «16 de marzo de 2027» (RECEIVED). */
  dueDate: string | null;
  url: string | null;
}

/**
 * N-25 — complaint received (number and deadline, BR-43), answered or resolved. Official consumer
 * channels: PROVISIONAL wording pending the lawyer (LEG-06).
 */
export function complaint(data: ComplaintData): RenderedEmail {
  const cta = data.url ? { cta: { label: 'Ver mi solicitud', url: data.url } } : {};
  switch (data.kind) {
    case 'RECEIVED':
      return simpleEmail({
        subject: `Hemos recibido tu solicitud ${data.number}`,
        paragraphs: [
          `Tu número de seguimiento es ${data.number}. Te responderemos como tarde el ${data.dueDate ?? ''}.`,
          'Si no quedas satisfecho con nuestra respuesta, puedes acudir a las vías oficiales de consumo de tu comunidad autónoma (hojas de reclamaciones). Texto PROVISIONAL.',
        ],
        ...cta,
      });
    case 'REPLIED':
      return simpleEmail({
        subject: `Hemos respondido a tu solicitud ${data.number}`,
        paragraphs: [
          'Tienes una respuesta del equipo de TinHome. Entra para leerla y contestar si lo necesitas.',
        ],
        ...cta,
      });
    case 'RESOLVED':
      return simpleEmail({
        subject: `Tu solicitud ${data.number} está resuelta`,
        paragraphs: [
          'Hemos dado por resuelta tu solicitud. Si necesitas algo más, puedes escribirnos de nuevo.',
        ],
        ...cta,
      });
  }
}
