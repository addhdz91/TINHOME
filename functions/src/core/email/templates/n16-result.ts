import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface ResultData {
  kind: 'REPORT_ACTIONED' | 'REPORT_NO_ACTION' | 'APPEAL_UPHELD' | 'APPEAL_REJECTED';
  text: string | null;
  url: string | null;
}

const COPY: Record<ResultData['kind'], { subject: string; body: string }> = {
  REPORT_ACTIONED: {
    subject: 'Hemos revisado tu denuncia',
    body: 'Gracias por avisarnos. Hemos revisado el contenido y hemos tomado medidas según nuestras normas.',
  },
  REPORT_NO_ACTION: {
    subject: 'Hemos revisado tu denuncia',
    body: 'Gracias por avisarnos. Hemos revisado el contenido y no hemos encontrado un incumplimiento de nuestras normas.',
  },
  APPEAL_UPHELD: {
    subject: 'Hemos aceptado tu recurso',
    body: 'Hemos revisado tu recurso y hemos revertido la decisión.',
  },
  APPEAL_REJECTED: {
    subject: 'Hemos revisado tu recurso',
    body: 'Hemos revisado tu recurso y mantenemos la decisión.',
  },
};

/** N-16 — result of a report (to the reporter) or of an appeal (to the affected person). */
export function result(data: ResultData): RenderedEmail {
  const copy = COPY[data.kind];
  return simpleEmail({
    subject: copy.subject,
    paragraphs: [copy.body, ...(data.text ? [data.text] : [])],
    ...(data.url ? { cta: { label: 'Ver en TinHome', url: data.url } } : {}),
  });
}
