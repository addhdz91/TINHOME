import type { Result } from '../types/common.js';

export const TEXT_VIOLATIONS = ['PHONE', 'EMAIL', 'URL', 'PRICE', 'RENTAL'] as const;
export type TextViolation = (typeof TEXT_VIOLATIONS)[number];

/** Lower-case without accents, so «Alquilo» and «alquiló» match the same pattern. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

const PATTERNS: Record<TextViolation, RegExp[]> = {
  // 9+ digits with optional separators, or +34 / 0034 prefixes.
  PHONE: [/(?:\+|00)\s?34[\s.-]?\d/, /(?:\d[\s.-]?){9,}/],
  EMAIL: [/[\w.+-]+@[\w-]+\.[\w.]+/, /\b[\w.+-]+\s?(?:\(at\)|\[at\]|\sarroba\s)\s?[\w-]+/],
  URL: [/https?:\/\//, /\bwww\./, /\b[\w-]+\.(?:com|es|net|org|io)\b/],
  PRICE: [/\d\s?(?:€|eur\b|euros?\b)/, /€/, /\bprecio\b/, /\btarifa\b/],
  RENTAL: [
    /\balquil\w*/,
    /\bse alquila\b/,
    /\bpor noche\b/,
    /\/\s?noche\b/,
    /\breserv(?:a|ar|as)\b/,
    /\bpago\b/,
    /\bbizum\b/,
    /\btransferencia\b/,
  ],
};

/**
 * BR-22 — listing and profile texts must not contain phones, e-mails, URLs, prices or rental
 * vocabulary (03_TECHNICAL_SPEC.md §9). Used on the server (decides) and the client (guides).
 */
export function validateListingText(text: string): Result<true, TextViolation[]> {
  const value = normalize(text);
  const reasons = TEXT_VIOLATIONS.filter((violation) =>
    PATTERNS[violation].some((re) => re.test(value)),
  );
  return reasons.length === 0 ? { ok: true, value: true } : { ok: false, error: reasons };
}
