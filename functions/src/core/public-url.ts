/**
 * Base URL of the web app used in e-mail links. `PUBLIC_URL` is set per environment
 * (the production domain is still undecided, see 10_DECISIONS §5).
 */
export function publicUrl(): string {
  const configured = process.env.PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, '');
  // Fail closed: e-mails and Stripe return URLs must never point to localhost in production.
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.VITEST)
    return 'http://localhost:5173';
  throw new Error('PUBLIC_URL is not configured');
}
