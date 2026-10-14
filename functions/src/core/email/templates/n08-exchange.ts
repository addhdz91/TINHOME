import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface ExchangeData {
  kind: 'PROPOSED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  otherName: string;
  /** «del 20 de marzo al 28 de marzo de 2027». */
  dates: string;
  url: string;
}

/** N-08 — exchange proposed / confirmed / declined / cancelled / expired (FR-30, FR-31). */
export function exchange(data: ExchangeData): RenderedEmail {
  const cta = { label: 'Ver el intercambio', url: data.url };
  switch (data.kind) {
    case 'PROPOSED':
      return simpleEmail({
        subject: `${data.otherName} te propone un intercambio`,
        paragraphs: [
          `${data.otherName} ha declarado un intercambio ${data.dates}. Revisa las fechas y las personas y confírmalo o recházalo desde la app.`,
          'Recuerda: el acuerdo lo cerráis vosotros. TinHome no participa ni cobra nada por el intercambio.',
        ],
        cta,
      });
    case 'CONFIRMED':
      return simpleEmail({
        subject: `¡${data.otherName} ha confirmado el intercambio!`,
        paragraphs: [
          `Vuestro intercambio ${data.dates} está confirmado. Descargad el kit de acuerdo y repasad juntos la lista de entrega de la casa.`,
        ],
        cta,
      });
    case 'DECLINED':
      return simpleEmail({
        subject: `${data.otherName} no ha confirmado el intercambio`,
        paragraphs: [
          `${data.otherName} ha rechazado el intercambio ${data.dates}. Podéis hablarlo en el chat y proponer otras fechas.`,
        ],
        cta,
      });
    case 'CANCELLED':
      return simpleEmail({
        subject: `${data.otherName} ha cancelado el intercambio`,
        paragraphs: [`El intercambio ${data.dates} se ha cancelado.`],
        cta,
      });
    case 'EXPIRED':
      return simpleEmail({
        subject: 'Tu propuesta de intercambio ha caducado',
        paragraphs: [
          `${data.otherName} no ha respondido a tiempo a la propuesta ${data.dates}. Puedes escribirle y volver a proponerla.`,
        ],
        cta,
      });
  }
}
