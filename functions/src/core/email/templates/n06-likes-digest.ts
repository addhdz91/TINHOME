import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface LikesDigestData {
  count: number;
  url: string;
}

/** N-06 — daily digest of likes received (at most one a day). */
export function likesDigest(data: LikesDigestData): RenderedEmail {
  const people = data.count === 1 ? '1 persona quiere' : `${String(data.count)} personas quieren`;
  return simpleEmail({
    subject: `${people} intercambiar contigo`,
    paragraphs: [`Hoy ${people} intercambiar su casa con la tuya. Entra para descubrir quién.`],
    cta: { label: 'Ver mis me gusta', url: data.url },
  });
}
