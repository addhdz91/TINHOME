import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface BillingData {
  kind: 'RENEWED' | 'PAYMENT_FAILED' | 'WITHDRAWN';
  amountCents: number;
  url: string;
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

/** N-12 — Premium billing: renewal, failed payment, withdrawal (durable medium, FR-37). */
export function billing(data: BillingData): RenderedEmail {
  switch (data.kind) {
    case 'RENEWED':
      return simpleEmail({
        subject: 'Tu Premium se ha renovado',
        paragraphs: [
          `Hemos cobrado ${euros(data.amountCents)} (IVA incluido). Puedes ver la factura o cancelar cuando quieras desde la app.`,
        ],
        cta: { label: 'Gestionar suscripción', url: data.url },
      });
    case 'PAYMENT_FAILED':
      return simpleEmail({
        subject: 'No hemos podido cobrar tu Premium',
        paragraphs: ['Revisa tu método de pago para no perder tus ventajas Premium.'],
        cta: { label: 'Actualizar método de pago', url: data.url },
      });
    case 'WITHDRAWN':
      return simpleEmail({
        subject: 'Hemos tramitado tu desistimiento',
        paragraphs: [
          'Tu suscripción Premium se ha cancelado con efecto inmediato.',
          `Reembolso: ${euros(data.amountCents)}. Llegará a tu método de pago en unos días.`,
          'Guarda este email como justificante.',
        ],
        cta: { label: 'Abrir TinHome', url: data.url },
      });
  }
}
