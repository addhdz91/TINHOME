import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { appError } from './app-error.js';
import { sha256Hex } from './crypto.js';

export interface RateLimitOptions {
  /** Logical bucket, e.g. `joinWaitlist`. */
  scope: string;
  /** Raw key (IP, uid…). Only its hash is stored. */
  key: string;
  limit: number;
  windowMs: number;
  now: Date;
}

/**
 * Fixed-window counter in `rateLimits/{scope}_{hash}_{window}` (server-only, TTL on
 * `expiresAt`). Throws `E_RATE_LIMIT` once `limit` requests were made in the window.
 */
export async function consumeRateLimit(db: Firestore, options: RateLimitOptions): Promise<void> {
  const { scope, key, limit, windowMs, now } = options;
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  const ref = db.doc(`rateLimits/${scope}_${sha256Hex(key).slice(0, 32)}_${windowStart}`);

  const allowed = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const count = snapshot.exists ? Number(snapshot.get('count')) : 0;
    if (count >= limit) return false;
    tx.set(ref, {
      scope,
      count: count + 1,
      expiresAt: Timestamp.fromMillis(windowStart + windowMs * 2),
    });
    return true;
  });

  if (!allowed)
    throw appError('E_RATE_LIMIT', {
      meta: { retryAfterMs: windowStart + windowMs - now.getTime() },
    });
}

const IP_LIKE = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * Client IP of a request, for rate limits and the /24 of legal evidence. The Functions
 * framework enables Express `trust proxy`, so `req.ip` is the LEFTMOST X-Forwarded-For entry,
 * which the client can write itself (rotating it would bypass every IP limit). Google's
 * front end appends the address it saw, so the trustworthy value is the RIGHTMOST entry.
 */
export function requestIp(
  rawRequest: { ip?: string | undefined; headers?: Record<string, unknown> } | undefined,
): string {
  const header = rawRequest?.headers?.['x-forwarded-for'];
  const forwarded = Array.isArray(header) ? header.join(',') : header;
  if (typeof forwarded === 'string') {
    const last = forwarded
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .at(-1);
    if (last && IP_LIKE.test(last)) return last;
  }
  return rawRequest?.ip ?? 'unknown';
}
