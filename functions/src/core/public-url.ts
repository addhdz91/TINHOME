/**
 * Base URL of the web app used in e-mail links. `PUBLIC_URL` is set per environment
 * (the production domain is still undecided, see 10_DECISIONS §5).
 */
export function publicUrl(): string {
  return (process.env.PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}
