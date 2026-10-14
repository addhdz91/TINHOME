import { useQuery } from '@tanstack/react-query';
import { getMyStanding } from '@/lib/callables';

export const standingKey = ['standing'] as const;

/** FR-68 — my strikes, decisions about me and preventive holds. */
export function useStanding() {
  return useQuery({ queryKey: standingKey, queryFn: () => getMyStanding({}), staleTime: 60_000 });
}
