import { ADMIN_ROLES } from '@tinhome/shared/constants';
import { appError } from './app-error.js';
import { adminAuth } from './firebase.js';

interface TokenClaims {
  role?: unknown;
  iat?: unknown;
}

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
  const issuedAtMs = typeof token.iat === 'number' ? token.iat * 1000 : 0;
  const validAfterMs = user.tokensValidAfterTime ? Date.parse(user.tokensValidAfterTime) : 0;
  if (issuedAtMs < validAfterMs) throw appError('E_REAUTH_REQUIRED');
}

type Check = (uid: string, token: TokenClaims) => Promise<void>;
let check: Check = assertLivePrivilegedSession;

/** Called by `defineCallable` before the handler; a no-op for non-admin tokens. */
export async function checkPrivilegedSession(uid: string, token: TokenClaims): Promise<void> {
  if (!(ADMIN_ROLES as readonly unknown[]).includes(token.role)) return;
  await check(uid, token);
}

/**
 * Test helper (like `setClock`): integration tests use made-up admin tokens without Auth
 * accounts; `privileged-session.int.test.ts` exercises the real check against the emulator.
 */
export function setPrivilegedSessionCheck(next: Check | null): void {
  check = next ?? assertLivePrivilegedSession;
}
