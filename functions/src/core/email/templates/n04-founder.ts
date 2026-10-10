import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface FounderData {
  months: number;
  cityName: string;
  url: string;
}

/** N-04 — founding member (FR-40, BR-19). */
export function founder(data: FounderData): RenderedEmail {
  return simpleEmail({
    subject: '¡Eres socio fundador de TinHome!',
    paragraphs: [
      `Eres de las primeras personas verificadas en ${data.cityName}. Gracias por confiar en TinHome desde el principio.`,
      `Te regalamos ${String(data.months)} meses de Premium y verás el distintivo «Fundador» en tu perfil.`,
    ],
    cta: { label: 'Ver mis ventajas', url: data.url },
  });
}
