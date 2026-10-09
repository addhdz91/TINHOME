import { layout } from '../html.js';
import type { RenderedEmail } from '../types.js';

export interface WelcomeData {
  firstName: string;
  onboardingUrl: string;
}

/** N-02 — Welcome and next steps (sent after completeSignup). */
export function welcome(data: WelcomeData): RenderedEmail {
  const subject = `Te damos la bienvenida a TinHome, ${data.firstName}`;
  const paragraphs = [
    `Hola, ${data.firstName}: ya tienes tu cuenta en TinHome.`,
    'Siguientes pasos: verifica tu teléfono, publica tu casa con fotos de cada estancia, dinos adónde y cuándo quieres viajar y verifica tu identidad.',
    'Publicar tu casa no cuesta nada. Solo pagas si quieres Premium.',
  ];
  const footer = 'Recibes este email porque has creado una cuenta en TinHome.';
  return {
    subject,
    text: [
      'TinHome',
      '',
      subject,
      '',
      ...paragraphs,
      '',
      `Continuar: ${data.onboardingUrl}`,
      '',
      footer,
    ].join('\n'),
    html: layout({
      title: subject,
      paragraphs,
      cta: { label: 'Continuar', url: data.onboardingUrl },
      footer,
    }),
  };
}
