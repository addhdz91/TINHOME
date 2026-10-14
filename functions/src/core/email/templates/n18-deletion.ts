import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface DeletionData {
  /** Already formatted in Europe/Madrid by the sender. */
  purgeDate: string;
  helpUrl: string;
}

/** N-18 — account deletion confirmed with the erasure date (BR-29). PROVISIONAL wording. */
export function deletion(data: DeletionData): RenderedEmail {
  return simpleEmail({
    subject: 'Hemos recibido tu solicitud de baja',
    paragraphs: [
      `Tu cuenta ya no es visible para nadie y tus datos personales y fotos se borrarán el ${data.purgeDate}.`,
      'Tu suscripción Premium, si la tenías, no se renovará.',
      'Por obligación legal conservamos bloqueados durante un tiempo los registros de moderación, denuncias, quejas y facturación. Tus valoraciones escritas se mostrarán como «Usuario dado de baja».',
      'Si no has sido tú, escríbenos cuanto antes desde la ayuda.',
    ],
    cta: { label: 'Ir a la ayuda', url: data.helpUrl },
    footer: 'Este es un aviso de servicio y no se puede desactivar.',
  });
}
