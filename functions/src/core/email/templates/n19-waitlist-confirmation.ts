import { layout } from '../html.js';
import type { RenderedEmail } from '../types.js';

export interface WaitlistConfirmationData {
  cityName: string;
  confirmUrl: string;
  expiresInDays: number;
}

/** N-19 — Waitlist double opt-in (FR-19). */
export function waitlistConfirmation(data: WaitlistConfirmationData): RenderedEmail {
  const subject = 'Confirma tu plaza en la lista de espera de TinHome';
  const paragraphs = [
    `Hola: alguien (seguramente tú) ha apuntado este email a la lista de espera de TinHome para ${data.cityName}.`,
    'Confírmalo para que contemos contigo y te avisemos cuando tu ciudad abra.',
    `El enlace caduca en ${data.expiresInDays} días. Si no has sido tú, ignora este mensaje y no te escribiremos más.`,
  ];
  const footer =
    'Recibes este email porque se pidió una plaza en la lista de espera de TinHome. Solo te escribiremos sobre la apertura de tu ciudad.';
  const text = [
    'TinHome',
    '',
    subject,
    '',
    ...paragraphs,
    '',
    `Confirmar: ${data.confirmUrl}`,
    '',
    footer,
  ].join('\n');
  return {
    subject,
    text,
    html: layout({
      title: subject,
      paragraphs,
      cta: { label: 'Confirmar mi plaza', url: data.confirmUrl },
      footer,
    }),
  };
}
