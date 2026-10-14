import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface CityOpenData {
  cityName: string;
  url: string;
}

/** N-05 — your city has opened (users of the city and confirmed waitlist). */
export function cityOpen(data: CityOpenData): RenderedEmail {
  return simpleEmail({
    subject: `¡TinHome ya está abierto en ${data.cityName}!`,
    paragraphs: [
      `Ya hay suficientes casas en ${data.cityName} para empezar a intercambiar. Publica la tuya, verifica tu identidad y empieza a descubrir.`,
    ],
    cta: { label: 'Entrar en TinHome', url: data.url },
  });
}
