import { layout } from '../html.js';
import type { RenderedEmail } from '../types.js';

export interface SecurityData {
  event: 'SIGNED_OUT_EVERYWHERE' | 'PASSWORD_CHANGED' | 'EMAIL_CHANGED';
  /** Already formatted in Europe/Madrid by the sender. */
  when: string;
  helpUrl: string;
}

const EVENT_TEXT: Record<SecurityData['event'], string> = {
  SIGNED_OUT_EVERYWHERE: 'Se ha cerrado la sesión de tu cuenta en todos los dispositivos.',
  PASSWORD_CHANGED: 'Se ha cambiado la contraseña de tu cuenta.',
  EMAIL_CHANGED: 'Se ha cambiado el email de tu cuenta.',
};

/** N-27 — Security notice (FR-71). Never includes the e-mail, phone or IP. */
export function security(data: SecurityData): RenderedEmail {
  const subject = 'Aviso de seguridad de tu cuenta TinHome';
  const paragraphs = [
    `${EVENT_TEXT[data.event]} (${data.when}).`,
    'Si has sido tú, no tienes que hacer nada.',
    'Si no reconoces este cambio, cambia tu contraseña y escríbenos desde la ayuda.',
  ];
  const footer = 'Este es un aviso de seguridad y no se puede desactivar.';
  return {
    subject,
    text: [
      'TinHome',
      '',
      subject,
      '',
      ...paragraphs,
      '',
      `Ayuda: ${data.helpUrl}`,
      '',
      footer,
    ].join('\n'),
    html: layout({
      title: subject,
      paragraphs,
      cta: { label: 'Ir a la ayuda', url: data.helpUrl },
      footer,
    }),
  };
}
