import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onIdTokenChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTheme } from '@/app/theme-context';
import { toAppError } from '@/lib/app-error';
import { getMe, updateSettings } from '@/lib/callables';
import { firebase } from '@/lib/firebase';
import { AuthContext, meKey, type AuthContextValue, type AuthState } from './auth-context';

/**
 * 03 §4.3 — session state: Firebase user + `getMe` (computed by the server), refreshed in
 * real time whenever `users/{uid}` changes. Only mounted in the app and auth areas so the
 * public landing does not load the Auth SDK.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onIdTokenChanged(firebase().auth, (next) => setUser(next)), []);

  const uid = user?.uid;
  const me = useQuery({
    queryKey: meKey(uid ?? 'anonymous'),
    enabled: uid !== undefined,
    retry: (count, error) => toAppError(error).code !== 'E_NOT_FOUND' && count < 2,
    staleTime: 30_000,
    queryFn: async () => {
      try {
        return await getMe({});
      } catch (error) {
        const appError = toAppError(error);
        if (appError.code === 'E_NOT_FOUND') return null;
        throw appError;
      }
    },
  });

  // Real-time: any server-side change to users/{uid} refreshes Me.
  useEffect(() => {
    if (!uid) return undefined;
    return onSnapshot(
      doc(firebase().db, 'users', uid),
      () => void queryClient.invalidateQueries({ queryKey: meKey(uid) }),
      () => undefined,
    );
  }, [uid, queryClient]);

  useThemeSync(me.data?.settings.theme, uid);

  const refreshMe = useCallback(async () => {
    if (!uid) return;
    const current = firebase().auth.currentUser;
    if (current) await current.getIdToken(true);
    await queryClient.invalidateQueries({ queryKey: meKey(uid) });
  }, [uid, queryClient]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(firebase().auth);
    queryClient.removeQueries({ queryKey: ['me'] });
  }, [queryClient]);

  const state = useMemo<AuthState>(() => {
    if (user === undefined) return { status: 'loading' };
    if (user === null) return { status: 'signedOut' };
    if (me.isPending) return { status: 'loading' };
    if (me.isError) return { status: 'error', user, retry: () => void me.refetch() };
    if (me.data === null) return { status: 'needsProfile', user };
    return { status: 'signedIn', user, me: me.data };
  }, [user, me]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, refreshMe, signOut }),
    [state, refreshMe, signOut],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

/**
 * C-26 — the theme saved in the account wins on every device; if the account still has the
 * default (`system`) and this device chose something else, the device choice is saved.
 */
function useThemeSync(serverTheme: string | undefined, uid: string | undefined) {
  const { preference, setPreference } = useTheme();
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || !serverTheme || syncedFor.current === uid) return;
    syncedFor.current = uid;
    if (serverTheme === 'system' && preference !== 'system') {
      // Best effort: the local choice still applies if saving fails.
      void updateSettings({ theme: preference }).catch(() => undefined);
      return;
    }
    if (
      serverTheme === 'system' ||
      serverTheme === 'light' ||
      serverTheme === 'dark' ||
      serverTheme === 'black'
    ) {
      setPreference(serverTheme);
    }
  }, [uid, serverTheme, preference, setPreference]);
}
