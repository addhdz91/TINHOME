import type { SecretParam } from 'firebase-functions/params';
import { onCall, type CallableOptions, type CallableRequest } from 'firebase-functions/v2/https';
import type { z } from 'zod/mini';
import { toAppError } from './app-error.js';
import { clock } from './clock.js';
import { logger, pseudonymize } from './logger.js';
import { callableOptions } from './options.js';
import { parseInput } from './parse-input.js';
import { checkSession } from './privileged-session.js';

export interface CallableContext<I> {
  input: I;
  request: CallableRequest;
  now: Date;
}

/**
 * 06_CODING_STANDARDS.md §6 — wraps the callable template: zod input (E_VALIDATION), the
 * handler (session, guards, params, domain, transaction, effects), zod output, structured
 * logs without PII and catalogue errors only (anything unexpected → E_INTERNAL).
 * Guards stay explicit inside each handler so they read like the contract table.
 */
export function defineCallable<I extends z.ZodMiniType, O extends z.ZodMiniType>(
  name: string,
  schemas: { input: I; output: O; secrets?: SecretParam[]; options?: Partial<CallableOptions> },
  handler: (ctx: CallableContext<z.output<I>>) => Promise<z.input<O>>,
) {
  const options: CallableOptions = {
    ...callableOptions,
    ...schemas.options,
    ...(schemas.secrets ? { secrets: schemas.secrets } : {}),
  };
  return onCall(options, async (request): Promise<z.output<O>> => {
    const startedAt = Date.now();
    const requestId = `${name}-${String(startedAt)}-${Math.random().toString(36).slice(2, 8)}`;
    const uid = request.auth ? pseudonymize(request.auth.uid) : null;
    try {
      if (request.auth) await checkSession(request.auth.uid, request.auth.token);
      const input = parseInput(schemas.input, request.data);
      const result = await handler({ input, request, now: clock.now() });
      const output = schemas.output.parse(result);
      logger.info(name, { callable: name, requestId, uid, durationMs: Date.now() - startedAt });
      return output;
    } catch (error) {
      const appErr = toAppError(error, requestId);
      const level = appErr.code === 'internal' ? 'error' : 'warn';
      logger[level](`${name} failed`, {
        callable: name,
        requestId,
        uid,
        errorCode: appErr.message,
        durationMs: Date.now() - startedAt,
        ...(appErr.code === 'internal' && error instanceof Error
          ? { cause: error.message.slice(0, 200) }
          : {}),
      });
      throw appErr;
    }
  });
}
