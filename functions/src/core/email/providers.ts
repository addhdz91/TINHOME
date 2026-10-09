import type { EmailProvider } from './types.js';

/**
 * Development provider: prints the e-mail to the emulator console. It refuses to run outside
 * the emulator so personal data never ends up in production logs.
 */
export const consoleEmailProvider: EmailProvider = {
  name: 'console',
  send({ to, email }) {
    if (process.env.FUNCTIONS_EMULATOR !== 'true') {
      return Promise.reject(new Error('Console e-mail provider is only allowed in the emulator'));
    }
    // STANDARDS-EXCEPTION: dev-only output of the full e-mail is the point of this provider.
    console.warn(
      `\n──── 📧 EMAIL (dev) ────\nPara: ${to}\nAsunto: ${email.subject}\n\n${email.text}\n───────────────────────\n`,
    );
    return Promise.resolve();
  },
};

/**
 * Chooses the provider from `EMAIL_PROVIDER`. Only `console` exists until DEC-69 decides the
 * EU provider; `HttpEmailProvider` arrives in M8 (see 10_DECISIONS §5).
 */
export function resolveEmailProvider(): EmailProvider {
  // An empty variable counts as "not configured".
  const configured = process.env.EMAIL_PROVIDER?.trim();
  const fallback = process.env.FUNCTIONS_EMULATOR === 'true' ? 'console' : '';
  const name = configured !== undefined && configured !== '' ? configured : fallback;
  if (name === 'console') return consoleEmailProvider;
  throw new Error(`No e-mail provider configured (EMAIL_PROVIDER="${name}")`);
}
