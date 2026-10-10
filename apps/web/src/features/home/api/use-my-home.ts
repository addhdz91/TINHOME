import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import type { HomeOwnerView } from '@tinhome/shared/schemas';
import { useMe } from '@/app/auth/auth-context';
import { toAppError } from '@/lib/app-error';
import { getMyHome } from '@/lib/callables';
import { firebase } from '@/lib/firebase';

export const homeKeys = { mine: (uid: string) => ['home', 'mine', uid] as const };

/**
 * The owner's home (`getMyHome`), refreshed whenever `homes/{uid}` changes, e.g. when the
 * server finishes processing an uploaded photo. `null` if it was never created.
 */
export function useMyHome() {
  const me = useMe();
  const queryClient = useQueryClient();
  const key = homeKeys.mine(me.uid);

  useEffect(
    () =>
      onSnapshot(
        doc(firebase().db, 'homes', me.uid),
        () => void queryClient.invalidateQueries({ queryKey: homeKeys.mine(me.uid) }),
        () => undefined,
      ),
    [me.uid, queryClient],
  );

  return useQuery({
    queryKey: key,
    queryFn: async (): Promise<HomeOwnerView | null> => {
      try {
        return (await getMyHome({})).home;
      } catch (error) {
        if (toAppError(error).code === 'E_NOT_FOUND') return null;
        throw error;
      }
    },
  });
}

export function useSetMyHome() {
  const me = useMe();
  const queryClient = useQueryClient();
  return (home: HomeOwnerView) => queryClient.setQueryData(homeKeys.mine(me.uid), home);
}
