import { QueryClient } from '@tanstack/react-query';

/** 03_TECHNICAL_SPEC.md §4.3 — 30 s stale time; 2 retries for queries, none for mutations. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 2 },
      mutations: { retry: 0 },
    },
  });
}
