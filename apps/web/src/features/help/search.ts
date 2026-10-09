import type { Faq } from './api/use-faqs';

/** Lower-case and strip accents so «verificacion» finds «verificación». */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** C-30 — instant search over question, tags and answer; every word must match. */
export function searchFaqs(faqs: readonly Faq[], query: string): Faq[] {
  const words = normalizeText(query)
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (words.length === 0) return [...faqs];
  return faqs.filter((faq) => {
    const haystack = normalizeText(`${faq.question} ${faq.tags.join(' ')} ${faq.answerMarkdown}`);
    return words.every((word) => haystack.includes(word));
  });
}
