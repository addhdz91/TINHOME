import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface IdentityData {
  result: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED';
  /** Reason (rejection) or the team's request (more information). */
  message: string | null;
  url: string;
}

/** N-03 — identity approved, rejected or more information requested (FR-09). */
export function identity(data: IdentityData): RenderedEmail {
  switch (data.result) {
    case 'APPROVED':
      return simpleEmail({
        subject: 'Tu identidad está verificada',
        paragraphs: [
          'Hemos revisado tus documentos y todo está en orden.',
          'Si tu casa está publicada y su ubicación verificada, ya es visible para otras personas.',
          'Hemos programado el borrado de tus documentos: solo guardamos el resultado de la revisión.',
        ],
        cta: { label: 'Abrir TinHome', url: data.url },
      });
    case 'REJECTED':
      return simpleEmail({
        subject: 'No hemos podido verificar tu identidad',
        paragraphs: [
          `Motivo: ${data.message ?? 'los documentos no son válidos.'}`,
          'Puedes volver a enviar tus documentos cuando quieras.',
        ],
        cta: { label: 'Volver a enviar', url: data.url },
      });
    case 'INFO_REQUESTED':
      return simpleEmail({
        subject: 'Necesitamos algo más para verificar tu identidad',
        paragraphs: [
          `El equipo te pide: ${data.message ?? 'revisar tus documentos.'}`,
          'Envíalo desde la app y seguiremos con la revisión.',
        ],
        cta: { label: 'Completar verificación', url: data.url },
      });
  }
}
