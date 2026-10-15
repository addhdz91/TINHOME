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
