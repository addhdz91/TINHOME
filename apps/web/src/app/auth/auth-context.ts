import type { User } from 'firebase/auth';
import { createContext, useContext } from 'react';
import type { Me } from '@tinhome/shared/schemas';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** Firebase user exists but `completeSignup` has not run yet (e.g. first Google sign-in). */
  | { status: 'needsProfile'; user: User }
  | { status: 'error'; user: User; retry: () => void }
  | { status: 'signedIn'; user: User; me: Me };

export interface AuthContextValue {
  state: AuthState;
  /** Re-reads `getMe` (after callables that change the user). */
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
}

/** TanStack Query key of `getMe` for a user. */
export const meKey = (uid: string) => ['me', uid] as const;

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** Shortcut for screens that are only rendered once the user is fully signed in. */
export function useMe(): Me {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('useMe requires a signed-in user');
  return state.me;
}
