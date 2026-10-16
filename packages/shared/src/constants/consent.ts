import type { ConsentDoc } from './enums.js';

/**
 * Exact wording of each consent checkbox. It lives here (not in es.json) because the server
 * stores the very same text in every `legalAcceptances` record as evidence of what the person
 * saw. Changing a text is a legal change: keep the old one in Git history and note it in
 * 10_DECISIONS §5. PROVISIONAL until the lawyer validates the forms.
 */
export const CONSENT_TEXTS: Record<ConsentDoc, string> = {
  terminos: 'Acepto los Términos y condiciones de TinHome',
  privacidad: 'He leído y acepto la Política de privacidad',
  cookies: 'He leído la Política de cookies',
};

/**
 * LSSI art. 21 / RGPD art. 7 — specific, separate and revocable consent to commercial e-mails
 * (FR-46: none without it). Shown next to the switch in Ajustes and stored with each opt-in or
 * opt-out. PROVISIONAL until the lawyer validates it.
 */
export const MARKETING_CONSENT_TEXT =
  'Quiero recibir por email ofertas y novedades de TinHome. Puedo darme de baja cuando quiera.';
/** Version of that wording (bump it when the text changes). */
export const MARKETING_CONSENT_VERSION = '1';
