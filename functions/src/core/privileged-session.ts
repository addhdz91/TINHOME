import { ADMIN_ROLES } from '@tinhome/shared/constants';
import { appError } from './app-error.js';
import { adminAuth } from './firebase.js';

interface TokenClaims {
  role?: unknown;
  iat?: unknown;
}

const issuedAtMs = (token: TokenClaims) => (typeof token.iat === 'number' ? token.iat * 1000 : 0);
const validAfterMs = (value: string | undefined) => (value ? Date.parse(value) : 0);

/**
 * FR-48 / NFR-04 — an ID token lives up to 1 h and carries the admin role. For admin requests
 * the account is checked live: it must exist, be enabled, still hold that role (a role
 * removed by a superadmin stops working at once) and the token must be newer than the last
 * session revocation. Anything else → E_REAUTH_REQUIRED (sign in again).
 */
export async function assertLivePrivilegedSession(uid: string, token: TokenClaims): Promise<void> {
  const user = await adminAuth()
    .getUser(uid)
    .catch(() => null);
  if (!user || user.disabled) throw appError('E_REAUTH_REQUIRED');
  if ((user.customClaims?.role as unknown) !== token.role) throw appError('E_REAUTH_REQUIRED');
  if (issuedAtMs(token) < validAfterMs(user.tokensValidAfterTime)) {
    throw appError('E_REAUTH_REQUIRED');
  }
}

/** How long an instance trusts what it last read from Auth for a non-admin account. */
export const USER_SESSION_CACHE_MS = 30_000;
const CACHE_MAX = 5_000;
const userSessions = new Map<string, { readAt: number; disabled: boolean; validAfter: number }>();

/**
 * ASVS V3.3 — the Functions SDK verifies ID tokens without `checkRevoked`, so a banned or
 * deleted account, or a session ended with «cerrar sesión en todos los dispositivos», would
 * keep working until its token expires (1 h). Every signed-in request checks the account:
 * it must exist, be enabled and the token must be newer than the last revocation. To spare
 * one Auth lookup per call, the answer is kept for 30 s per instance (and dropped at once
 * by `forgetUserSession` on the instance that revokes).
 */
export async function assertLiveUserSession(uid: string, token: TokenClaims): Promise<void> {
  const now = Date.now();
  let state = userSessions.get(uid);
  if (!state || now - state.readAt > USER_SESSION_CACHE_MS) {
    const user = await adminAuth()
      .getUser(uid)
      .catch(() => null);
    if (!user) throw appError('E_REAUTH_REQUIRED');
    if (userSessions.size >= CACHE_MAX) userSessions.clear();
    state = {
      readAt: now,
      disabled: user.disabled,
      validAfter: validAfterMs(user.tokensValidAfterTime),
    };
    userSessions.set(uid, state);
  }
  if (state.disabled || issuedAtMs(token) < state.validAfter) throw appError('E_REAUTH_REQUIRED');
}

/** Call after revoking or disabling an account so this instance stops trusting its cache. */
export function forgetUserSession(uid: string): void {
  userSessions.delete(uid);
}

type Check = (uid: string, token: TokenClaims) => Promise<void>;
let override: Check | null = null;

/** Called by `defineCallable` before the handler, for every signed-in request. */
export async function checkSession(uid: string, token: TokenClaims): Promise<void> {
  if (override) return override(uid, token);
  if ((ADMIN_ROLES as readonly unknown[]).includes(token.role)) {
    return assertLivePrivilegedSession(uid, token);
  }
  return assertLiveUserSession(uid, token);
}

/**
 * Test helper (like `setClock`): integration tests use made-up tokens without Auth accounts;
 * `privileged-session.int.test.ts` exercises the real checks against the Auth emulator.
 */
export function setSessionCheck(next: Check | null): void {
  override = next;
  userSessions.clear();
}
