import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface StatementData {
  /** N-15 for hidden content, N-24 for warnings, suspensions and bans. */
  kind: 'HIDE_CONTENT' | 'HIDE_MESSAGE' | 'WARN' | 'SUSPEND' | 'BAN';
  facts: string;
  ground: string;
  scope: string;
  duration: string;
  redress: string;
  url: string;
}

const SUBJECT: Record<StatementData['kind'], string> = {
  HIDE_CONTENT: 'Hemos ocultado contenido de tu cuenta',
  HIDE_MESSAGE: 'Hemos ocultado un mensaje tuyo',
  WARN: 'Has recibido una advertencia en TinHome',
  SUSPEND: 'Tu cuenta de TinHome está suspendida temporalmente',
  BAN: 'Tu cuenta de TinHome ha sido cerrada',
};

/**
 * N-15 / N-24 — statement of reasons (DSA art. 17, BR-27): facts, ground, scope, duration and
 * how to appeal. Wording PROVISIONAL until the lawyer validates it (LEG-03).
 */
export function statement(data: StatementData): RenderedEmail {
  return simpleEmail({
    subject: SUBJECT[data.kind],
    paragraphs: [
      `Hechos: ${data.facts}`,
      `Motivo: ${data.ground}`,
      `Alcance: ${data.scope}`,
      `Duración: ${data.duration}`,
      `Cómo recurrir: ${data.redress}`,
    ],
    cta: { label: 'Ver la decisión y recurrir', url: data.url },
    footer: 'Declaración de motivos (texto PROVISIONAL pendiente de validación legal).',
  });
}
