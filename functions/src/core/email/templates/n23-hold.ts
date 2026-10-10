import type { HoldReason } from '@tinhome/shared/constants';
import { layout } from '../html.js';
import type { RenderedEmail } from '../types.js';

export interface HoldData {
  reason: HoldReason;
  hours: number;
  homeUrl: string;
}

const REASON_TEXT: Record<HoldReason, string> = {
  PHOTO_DUPLICATE: 'Alguna foto de tu casa coincide con la de otra casa publicada en TinHome.',
  PHOTO_CHANGES: 'Has cambiado muchas fotos de tu casa en poco tiempo.',
  CITY_CHANGE: 'Has cambiado la ciudad de tu casa.',
  REPORT: 'Hemos recibido una denuncia sobre tu casa.',
};

/**
 * N-23 — provisional statement of reasons for a preventive hold (FR-69). PROVISIONAL wording:
 * the final statements of reasons are validated by the lawyer (LEG-03).
 */
export function hold(data: HoldData): RenderedEmail {
  const subject = 'Tu casa está en revisión';
  const paragraphs = [
    `${REASON_TEXT[data.reason]} Por seguridad, la hemos ocultado mientras el equipo la revisa.`,
    `Lo revisaremos en un plazo máximo de ${String(data.hours)} horas y te contaremos el resultado. Esto no es una sanción.`,
    'Si crees que es un error, no tienes que hacer nada: una persona del equipo lo comprobará.',
  ];
  const footer =
    'Declaración provisional de motivos (texto PROVISIONAL pendiente de validación legal).';
  return {
    subject,
    text: [
      'TinHome',
      '',
      subject,
      '',
      ...paragraphs,
      '',
      `Ver mi casa: ${data.homeUrl}`,
      '',
      footer,
    ].join('\n'),
    html: layout({
      title: subject,
      paragraphs,
      cta: { label: 'Ver mi casa', url: data.homeUrl },
      footer,
    }),
  };
}
