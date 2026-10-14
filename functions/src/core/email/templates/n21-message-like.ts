import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface MessageLikeData {
  otherName: string;
  url: string;
}

/** N-21 — someone liked your home with a message (FR-61). */
export function messageLike(data: MessageLikeData): RenderedEmail {
  return simpleEmail({
    subject: `${data.otherName} te ha escrito con su me gusta`,
    paragraphs: [`A ${data.otherName} le gusta tu casa y te ha dejado un mensaje.`],
    cta: { label: 'Leer el mensaje', url: data.url },
  });
}
