import { PARAM_DEFAULTS } from '@tinhome/shared/constants';
import { ParamsSchema } from '@tinhome/shared/schemas';
import type { Clock, Params } from '@tinhome/shared/types';
import { clock as serverClock } from './clock.js';
import { db } from './firebase.js';
import { logger } from './logger.js';

export const PARAMS_CACHE_MS = 60_000;

/** Reads the raw `config/params` document (undefined if it does not exist). */
export type ParamsLoader = () => Promise<Record<string, unknown> | undefined>;

const firestoreLoader: ParamsLoader = async () => {
  const snapshot = await db().doc('config/params').get();
  return snapshot.data();
};

/**
 * Creates a cached reader of `config/params`. Stored values override the defaults of
 * `PARAM_DEFAULTS`; an invalid document is ignored (defaults win) and logged.
 */
export function createParamsReader(
  loader: ParamsLoader,
  clock: Clock,
  ttlMs: number = PARAMS_CACHE_MS,
): { get: () => Promise<Params>; invalidate: () => void } {
  let cached: { value: Params; expiresAt: number } | null = null;

  return {
    async get() {
      const nowMs = clock.now().getTime();
      if (cached && cached.expiresAt > nowMs) return cached.value;
      const stored = (await loader()) ?? {};
      const parsed = ParamsSchema.safeParse({ ...PARAM_DEFAULTS, ...stored });
      if (!parsed.success) {
        logger.error('config/params is invalid; using defaults', {
          fields: parsed.error.issues.map((issue) => issue.path.join('.')),
        });
      }
      const value: Params = parsed.success ? parsed.data : ParamsSchema.parse(PARAM_DEFAULTS);
      cached = { value, expiresAt: nowMs + ttlMs };
      return value;
    },
    invalidate() {
      cached = null;
    },
  };
}

const reader = createParamsReader(firestoreLoader, serverClock);

/** Step 4 of the callable template: business parameters with a 60 s cache. */
export const getParams = (): Promise<Params> => reader.get();

/** Call after `updateParams` so the same instance sees the new values immediately. */
export const invalidateParams = (): void => reader.invalidate();
