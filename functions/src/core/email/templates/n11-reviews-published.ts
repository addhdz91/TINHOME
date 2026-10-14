import { simpleEmail } from '../simple.js';
import type { RenderedEmail } from '../types.js';

export interface ReviewsPublishedData {
  otherName: string;
  url: string;
}

/** N-11 — the reviews of an exchange are now public. */
export function reviewsPublished(data: ReviewsPublishedData): RenderedEmail {
  return simpleEmail({
    subject: 'Ya puedes ver tu valoración',
    paragraphs: [`Las valoraciones de tu intercambio con ${data.otherName} ya se han publicado.`],
    cta: { label: 'Ver mi casa', url: data.url },
  });
}
