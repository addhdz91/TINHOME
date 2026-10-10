import { layout } from './html.js';
import type { RenderedEmail } from './types.js';

const ACCOUNT_FOOTER = 'Recibes este email porque tienes una cuenta en TinHome.';

/** Builds the HTML and plain-text versions of a short e-mail from the same paragraphs. */
export function simpleEmail(input: {
  subject: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footer?: string;
}): RenderedEmail {
  const text = [
    'TinHome',
    '',
    input.subject,
    '',
    ...input.paragraphs,
    ...(input.cta ? ['', `${input.cta.label}: ${input.cta.url}`] : []),
    '',
    input.footer ?? ACCOUNT_FOOTER,
  ].join('\n');
  return {
    subject: input.subject,
    text,
    html: layout({
      title: input.subject,
      paragraphs: input.paragraphs,
      ...(input.cta ? { cta: input.cta } : {}),
      footer: input.footer ?? ACCOUNT_FOOTER,
    }),
  };
}
