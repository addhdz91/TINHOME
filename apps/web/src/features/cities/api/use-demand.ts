import { useQuery } from '@tanstack/react-query';
import { PARAM_DEFAULTS } from '@tinhome/shared/constants';
import { visibleDemand } from '@tinhome/shared/domain';
import { DemandStatDocSchema } from '@tinhome/shared/schemas';
import type { DemandStatDoc } from '@tinhome/shared/types';
import { limit, orderBy, readPublicCollection } from '@/lib/firestore-public';
import { cityKeys } from './use-cities';

/**
 * FR-18 — highest demand pairs. The server only publishes pairs ≥ P-18; the client filters
 * again as a second safety net.
 */
export function useTopDemand(max = 3) {
  return useQuery({
    queryKey: [...cityKeys.demand, max],
    queryFn: async (): Promise<(DemandStatDoc & { id: string })[]> => {
      const rows = await readPublicCollection(
        'demandStats',
        orderBy('count', 'desc'),
        limit(max * 2),
      );
      const stats = rows.flatMap(({ id, data }) => {
        const parsed = DemandStatDocSchema.safeParse(data);
        return parsed.success ? [{ id, ...parsed.data }] : [];
      });
      return visibleDemand(stats, PARAM_DEFAULTS.demandCounterMin, max);
    },
    staleTime: 60_000,
  });
}
