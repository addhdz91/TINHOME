import type { CallableOptions } from 'firebase-functions/v2/https';
import { REGION } from '@tinhome/shared/constants';

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

/** Comma-separated extra origins (the public domain is not decided yet; see docs/PROGRESS.md). */
const extraOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

/** Common options for every `onCall` (03_TECHNICAL_SPEC.md §5.1, §7). */
export const callableOptions: CallableOptions = {
  region: REGION,
  // App Check is enforced in deployed environments; the emulator uses debug tokens.
  enforceAppCheck: !isEmulator,
  cors: isEmulator ? true : [/\.web\.app$/, /\.firebaseapp\.com$/, ...extraOrigins],
  memory: '256MiB',
  timeoutSeconds: 30,
};
