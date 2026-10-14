import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface LegalUpdateData {
  title: string;
  changeSummary: string;
  requiresReacceptance: boolean;
  url: string;
}

/** N-17 — a new version of a legal text (re-acceptance asked in the app when required, FR-58). */
export function legalUpdate(data: LegalUpdateData): RenderedEmail {
  return simpleEmail({
    subject: `Hemos actualizado: ${data.title}`,
    paragraphs: [
      `Cambios principales: ${data.changeSummary}`,
      data.requiresReacceptance
        ? 'La próxima vez que entres en TinHome te pediremos que aceptes la nueva versión para seguir usando la app.'
        : 'No tienes que hacer nada. Puedes consultar el texto completo cuando quieras.',
    ],
    cta: { label: 'Leer el texto', url: data.url },
  });
}
