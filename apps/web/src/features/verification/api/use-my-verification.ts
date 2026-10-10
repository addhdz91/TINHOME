import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/app/auth/auth-context';
import { getMyVerification } from '@/lib/callables';

export const verificationKeys = { mine: (uid: string) => ['verification', 'mine', uid] as const };

/** S-14 — latest identity verification (refetched when `Me` changes, e.g. after a decision). */
export function useMyVerification() {
  const me = useMe();
  return useQuery({
    queryKey: [...verificationKeys.mine(me.uid), me.verification.identity],
    queryFn: async () => (await getMyVerification({})).verification,
  });
}

export function useInvalidateMyVerification() {
  const me = useMe();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: verificationKeys.mine(me.uid) });
}
