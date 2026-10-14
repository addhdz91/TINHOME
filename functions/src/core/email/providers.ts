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
 * 03 §11 — generic HTTP provider: POSTs `{ from, to, subject, html, text }` as JSON with a
 * bearer key. The EU provider is still DEC-69, so the URL and sender come from the environment
 * (`EMAIL_API_URL`, `EMAIL_FROM`) and the key from Secret Manager (`EMAIL_API_KEY`). A
 * provider with another body shape needs a small adapter here.
 */
export function httpEmailProvider(config: {
  url: string;
  apiKey: string;
  from: string;
  fetchImpl?: typeof fetch;
}): EmailProvider {
  const doFetch = config.fetchImpl ?? fetch;
  return {
    name: 'http',
    async send({ to, email }) {
      const response = await doFetch(config.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          from: config.from,
          to,
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      // The status only: provider bodies may echo the address.
      if (!response.ok) throw new Error(`email provider answered ${String(response.status)}`);
    },
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

/** Chooses the provider from `EMAIL_PROVIDER` (`console` in the emulator, `http` deployed). */
export function resolveEmailProvider(): EmailProvider {
  // An empty variable counts as "not configured".
  const configured = process.env.EMAIL_PROVIDER?.trim();
  const fallback = process.env.FUNCTIONS_EMULATOR === 'true' ? 'console' : '';
  const name = configured !== undefined && configured !== '' ? configured : fallback;
  if (name === 'console') return consoleEmailProvider;
  if (name === 'http') {
    return httpEmailProvider({
      url: requiredEnv('EMAIL_API_URL'),
      apiKey: requiredEnv('EMAIL_API_KEY'),
      from: requiredEnv('EMAIL_FROM'),
    });
  }
  throw new Error(`No e-mail provider configured (EMAIL_PROVIDER="${name}")`);
}
