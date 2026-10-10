/** Lower-case without accents (same normalisation as BR-22). */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

const PAYMENT_PATTERNS = [
  /\bbizum\b/,
  /\btransferencia\b/,
  /\biban\b/,
  /\bes\d{2}[\s\d]{10,}/,
  /\bpag(?:ar|o|ame|amos|as|ad)\b/,
  /\bpaypal\b/,
  /\bfianza\b/,
  /\bse[nñ]al\b/,
  /\bdeposito\b/,
];

/**
 * FR-60 — a message that mentions payments (Bizum, transferencia, IBAN, «pagar»…) is delivered
 * with a safety notice for the receiver; it is never blocked.
 */
export function mentionsPayment(text: string): boolean {
  const value = normalize(text);
  return PAYMENT_PATTERNS.some((pattern) => pattern.test(value));
}

/** BR-07 — the pair key of two users, always in the same order (`uidA < uidB`). */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/**
 * Match id for a pair: the pair key the first time, then `pairKey_n` for the n-th rematch
 * after an unmatch, so an old conversation never reappears (BR-45).
 */
export function matchIdFor(a: string, b: string, rematchCount: number): string {
  const key = pairKey(a, b);
  return rematchCount > 0 ? `${key}_${String(rematchCount)}` : key;
}

/** Minute bucket for the BR-36 rate limit (`YYYYMMDDHHmm`, UTC). */
export function minuteBucket(now: Date): string {
  return now.toISOString().slice(0, 16).replace(/[-T:]/g, '');
}

/** «https://wa.me/34612345678» for a Spanish mobile (FR-28). */
export function whatsappUrl(e164: string): string {
  return `https://wa.me/${e164.replace(/^\+/, '')}`;
}
