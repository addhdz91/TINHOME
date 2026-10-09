import type { CallableRequest } from 'firebase-functions/v2/https';
import { ADMIN_ROLES, type AdminRole, type UserStatus } from '@tinhome/shared/constants';
import { appError } from './app-error.js';

export interface AuthContext {
  uid: string;
  emailVerified: boolean;
  role: AdminRole | null;
  hasSecondFactor: boolean;
}

function readRole(value: unknown): AdminRole | null {
  return ADMIN_ROLES.find((role) => role === value) ?? null;
}

/** Step 1 — a valid session is required (E_UNAUTHENTICATED). */
export function requireAuth(request: Pick<CallableRequest, 'auth'>): AuthContext {
  const auth = request.auth;
  if (!auth) throw appError('E_UNAUTHENTICATED');
  const firebaseClaim: unknown = auth.token.firebase;
  const secondFactor =
    typeof firebaseClaim === 'object' && firebaseClaim !== null
      ? (firebaseClaim as { sign_in_second_factor?: unknown }).sign_in_second_factor
      : undefined;
  return {
    uid: auth.uid,
    emailVerified: auth.token.email_verified === true,
    role: readRole(auth.token.role),
    hasSecondFactor: typeof secondFactor === 'string' && secondFactor.length > 0,
  };
}

/** Guard `EV` — e-mail verified. */
export function requireEmailVerified(auth: AuthContext): void {
  if (!auth.emailVerified) throw appError('E_EMAIL_NOT_VERIFIED');
}

/**
 * Guards `ADM` / `SADM` — admin role (custom claim) **and** a second factor in the session
 * (03_TECHNICAL_SPEC.md §6). `superadmin` satisfies `admin`.
 */
export function requireRole(auth: AuthContext, role: AdminRole): void {
  const allowed = role === 'admin' ? auth.role !== null : auth.role === 'superadmin';
  if (!allowed) throw appError('E_ROLE_REQUIRED');
  if (!auth.hasSecondFactor) throw appError('E_MFA_REQUIRED');
}

/** Guard `ACT` — account not suspended, banned or being deleted. */
export function requireActive(status: UserStatus): void {
  switch (status) {
    case 'ACTIVE':
      return;
    case 'SUSPENDED':
      throw appError('E_ACCOUNT_SUSPENDED');
    case 'BANNED':
    case 'DELETION_PENDING':
    case 'DELETED':
      throw appError('E_ACCOUNT_BANNED');
  }
}
