import { useQuery } from '@tanstack/react-query';
import { CityDocSchema, WindowDocSchema } from '@tinhome/shared/schemas';
import type { CityDoc, WindowDoc } from '@tinhome/shared/types';
import { orderBy, readPublicCollection, where } from '@/lib/firestore-public';

export type City = CityDoc & { id: string };
export type ExchangeWindow = WindowDoc & { id: string };

export const cityKeys = {
  all: ['cities'] as const,
  windows: ['windows', 'active'] as const,
  demand: ['demandStats', 'top'] as const,
};

/** All cities except CLOSED, in display order (public read, FR-17). */
export function useCities() {
  return useQuery({
    queryKey: cityKeys.all,
    queryFn: async (): Promise<City[]> => {
      const rows = await readPublicCollection('cities', orderBy('order'));
      return rows.flatMap(({ id, data }) => {
        const parsed = CityDocSchema.safeParse(data);
        return parsed.success && parsed.data.status !== 'CLOSED' ? [{ id, ...parsed.data }] : [];
      });
    },
    staleTime: 60_000,
  });
}

/** Active exchange windows (ADR-017), in display order. */
export function useActiveWindows() {
  return useQuery({
    queryKey: cityKeys.windows,
    queryFn: async (): Promise<ExchangeWindow[]> => {
      const rows = await readPublicCollection('windows', where('active', '==', true));
      return rows
        .flatMap(({ id, data }) => {
          const parsed = WindowDocSchema.safeParse(data);
          return parsed.success ? [{ id, ...parsed.data }] : [];
        })
        .toSorted((a, b) => a.order - b.order);
    },
    staleTime: 5 * 60_000,
  });
}
