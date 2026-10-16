import { setGlobalOptions } from 'firebase-functions/v2';
import type { CallableOptions } from 'firebase-functions/v2/https';
import { REGION } from '@tinhome/shared/constants';

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

/** Comma-separated extra origins (the public domain is not decided yet; see docs/PROGRESS.md). */
const extraOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? '';

/**
 * ASVS V14.5 — only this project's own Hosting sites (exact origins, https) plus the custom
 * domains in CORS_ORIGINS; a regex on `*.web.app` would accept anybody's Firebase site.
 */
export const allowedOrigins: string[] = [
  ...(projectId ? [`https://${projectId}.web.app`, `https://${projectId}.firebaseapp.com`] : []),
  ...extraOrigins,
];

/**
 * Cost ceiling per function (03 §7): without it a flood of requests or uploads scales to the
 * platform default. Generous for Phase 1 traffic; raise per function if metrics ask for it.
 */
export const MAX_INSTANCES = { callable: 20, http: 10, trigger: 10, photo: 5 } as const;

/**
 * Defaults for every function (callables, HTTP, triggers and jobs). This module is imported by
 * every module that defines functions, so it runs before any definition. FUNCTIONS_SERVICE_ACCOUNT
 * (functions/.env.<project>) selects the least-privilege account created by configure-gcp.sh.
 */
const serviceAccount = process.env.FUNCTIONS_SERVICE_ACCOUNT;
setGlobalOptions({
  region: REGION,
  maxInstances: MAX_INSTANCES.trigger,
  ...(serviceAccount ? { serviceAccount } : {}),
});

/** Common options for every `onCall` (03_TECHNICAL_SPEC.md §5.1, §7). */
export const callableOptions: CallableOptions = {
  region: REGION,
  // App Check is enforced in deployed environments; the emulator uses debug tokens.
  enforceAppCheck: !isEmulator,
  cors: isEmulator ? true : allowedOrigins,
  memory: '256MiB',
  timeoutSeconds: 30,
  maxInstances: MAX_INSTANCES.callable,
};
