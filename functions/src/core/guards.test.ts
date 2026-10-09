import type { HttpsError } from 'firebase-functions/v2/https';
import { describe, expect, it } from 'vitest';
import {
  requireActive,
  requireAuth,
  requireEmailVerified,
  requireRole,
  type AuthContext,
} from './guards.js';

type AuthArg = Parameters<typeof requireAuth>[0];

function request(token: Record<string, unknown> | null): AuthArg {
  if (token === null) return {};
  return { auth: { uid: 'u1', token, rawToken: 'raw' } } as unknown as AuthArg;
}

function codeOf(fn: () => void): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return ((error as HttpsError).details as { code: string }).code;
  }
}

const base: AuthContext = { uid: 'u1', emailVerified: true, role: null, hasSecondFactor: false };

describe('requireAuth', () => {
  it('rejects anonymous calls', () => {
    expect(codeOf(() => requireAuth(request(null)))).toBe('E_UNAUTHENTICATED');
  });

  it('reads verification, role and second factor from the token', () => {
    const auth = requireAuth(
      request({ email_verified: true, role: 'admin', firebase: { sign_in_second_factor: 'totp' } }),
    );
    expect(auth).toEqual({ uid: 'u1', emailVerified: true, role: 'admin', hasSecondFactor: true });
  });

  it('ignores unknown roles and missing claims', () => {
    const auth = requireAuth(request({ role: 'root', firebase: 'nope' }));
    expect(auth).toEqual({ uid: 'u1', emailVerified: false, role: null, hasSecondFactor: false });
  });
});

describe('requireEmailVerified', () => {
  it('passes when verified and fails otherwise', () => {
    expect(codeOf(() => requireEmailVerified(base))).toBeUndefined();
    expect(codeOf(() => requireEmailVerified({ ...base, emailVerified: false }))).toBe(
      'E_EMAIL_NOT_VERIFIED',
    );
  });
});

describe('requireRole', () => {
  it('requires a role', () => {
    expect(codeOf(() => requireRole(base, 'admin'))).toBe('E_ROLE_REQUIRED');
  });

  it('requires the second factor even with the right role', () => {
    expect(codeOf(() => requireRole({ ...base, role: 'admin' }, 'admin'))).toBe('E_MFA_REQUIRED');
  });

  it('lets superadmin act as admin but not the other way round', () => {
    const superadmin = { ...base, role: 'superadmin' as const, hasSecondFactor: true };
    const admin = { ...base, role: 'admin' as const, hasSecondFactor: true };
    expect(codeOf(() => requireRole(superadmin, 'admin'))).toBeUndefined();
    expect(codeOf(() => requireRole(superadmin, 'superadmin'))).toBeUndefined();
    expect(codeOf(() => requireRole(admin, 'superadmin'))).toBe('E_ROLE_REQUIRED');
  });
});

describe('requireActive', () => {
  it('maps each account status', () => {
    expect(codeOf(() => requireActive('ACTIVE'))).toBeUndefined();
    expect(codeOf(() => requireActive('SUSPENDED'))).toBe('E_ACCOUNT_SUSPENDED');
    expect(codeOf(() => requireActive('BANNED'))).toBe('E_ACCOUNT_BANNED');
    expect(codeOf(() => requireActive('DELETION_PENDING'))).toBe('E_ACCOUNT_BANNED');
    expect(codeOf(() => requireActive('DELETED'))).toBe('E_ACCOUNT_BANNED');
  });
});
