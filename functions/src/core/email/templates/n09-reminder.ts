import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface ExchangeReminderData {
  otherName: string;
  dates: string;
  url: string;
}

/** N-09 — three days before the exchange, with the hand-over checklist. */
export function exchangeReminder(data: ExchangeReminderData): RenderedEmail {
  return simpleEmail({
    subject: 'Tu intercambio empieza en 3 días',
    paragraphs: [
      `Tu intercambio con ${data.otherName} es ${data.dates}. Antes de salir:`,
      '• Acordad la entrega de llaves y un teléfono de contacto.',
      '• Dejad sábanas y toallas limpias y espacio libre en armarios.',
      '• Explicad electrodomésticos, wifi, basuras y normas del edificio.',
      '• Revisad juntos el kit de acuerdo.',
    ],
    cta: { label: 'Ver el intercambio', url: data.url },
  });
}
