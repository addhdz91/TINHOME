import { useInfiniteQuery } from '@tanstack/react-query';
import { getDiscoverDeck } from '@/lib/callables';

export interface DeckFilters {
  destinationCityIds?: string[];
  windowId?: string;
}

const MAX_EXCLUDED = 200;

/** FR-20 — batches of 20; each new batch excludes the ids already served in this session. */
export function useDeck(filters: DeckFilters) {
  return useInfiniteQuery({
    queryKey: ['discover', 'deck', filters],
    initialPageParam: [] as string[],
    staleTime: 5 * 60_000,
    queryFn: ({ pageParam }) => getDiscoverDeck({ ...filters, excludeIds: pageParam }),
    getNextPageParam: (last, pages) =>
      last.cards.length === 0
        ? undefined
        : pages.flatMap((page) => page.cards.map((card) => card.homeId)).slice(-MAX_EXCLUDED),
  });
}
