import { useQuery } from '@tanstack/react-query';
import type { SponsoredPlacement } from '@tinhome/shared/constants';
import { getSponsored } from '@/lib/callables';

/** BR-28 — at most one card per screen; a failure simply shows nothing. */
export function useSponsored(placement: SponsoredPlacement, enabled = true) {
  return useQuery({
    queryKey: ['sponsored', placement],
    queryFn: async () => (await getSponsored({ placement })).card,
    enabled,
    staleTime: 10 * 60_000,
    retry: false,
  });
}
