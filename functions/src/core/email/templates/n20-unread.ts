import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface UnreadDigestData {
  otherName: string;
  count: number;
  url: string;
}

/** N-20 — unread messages after 2 h (no text: the chat is private, 03 §17). */
export function unreadDigest(data: UnreadDigestData): RenderedEmail {
  const messages = data.count === 1 ? 'un mensaje' : `${String(data.count)} mensajes`;
  return simpleEmail({
    subject: `${data.otherName} te ha escrito`,
    paragraphs: [`Tienes ${messages} sin leer de ${data.otherName} en TinHome.`],
    cta: { label: 'Abrir el chat', url: data.url },
  });
}
