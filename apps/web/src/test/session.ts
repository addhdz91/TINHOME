import type { User } from 'firebase/auth';
import { vi } from 'vitest';
import type { Me } from '@tinhome/shared/schemas';
import type { AuthContextValue, AuthState } from '@/app/auth/auth-context';

/** A signed-in user at onboarding step 2 with nothing else done. */
export function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    uid: 'laura',
    email: 'laura@demo.tinhome',
    firstName: 'Laura',
    status: 'ACTIVE',
    verification: { emailVerified: true, phoneVerified: false, identity: 'NONE' },
    onboarding: { step: 2, completed: false, percent: 17 },
    home: null,
    city: null,
    premium: {
      active: false,
      until: null,
      source: null,
      plan: null,
      cancelAtPeriodEnd: false,
      canWithdraw: false,
    },
    likes: { remainingToday: 10, resetsAt: '2027-03-01T23:00:00.000Z' },
    canLike: false,
    blockers: ['PHONE'],
    legalPending: [],
    foundingMember: false,
    referralCode: 'ABCDEFGH',
    roles: [],
    settings: { theme: 'system' },
    ...overrides,
  };
}

export function fakeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'laura',
    email: 'laura@demo.tinhome',
    emailVerified: true,
    displayName: null,
    providerData: [{ providerId: 'password' }],
    reload: vi.fn(async () => undefined),
    getIdToken: vi.fn(async () => 'token'),
    delete: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as User;
}

export function authValue(state: AuthState): AuthContextValue {
  return { state, refreshMe: vi.fn(async () => undefined), signOut: vi.fn(async () => undefined) };
}

export function signedIn(me: Partial<Me> = {}, user: Partial<User> = {}): AuthContextValue {
  return authValue({ status: 'signedIn', user: fakeUser(user), me: makeMe(me) });
}
