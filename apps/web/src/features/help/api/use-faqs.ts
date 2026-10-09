import { useQuery } from '@tanstack/react-query';
import { FaqDocSchema, type FaqDoc } from '@tinhome/shared/schemas';
import { readPublicCollection, where } from '@/lib/firestore-public';

export type Faq = FaqDoc & { slug: string };

/** FR-66 — published FAQ articles (the query must filter by `published`, rules require it). */
export function useFaqs() {
  return useQuery({
    queryKey: ['faqs', 'published'],
    queryFn: async (): Promise<Faq[]> => {
      const rows = await readPublicCollection('faqs', where('published', '==', true));
      return rows
        .flatMap(({ id, data }) => {
          const parsed = FaqDocSchema.safeParse(data);
          return parsed.success ? [{ slug: id, ...parsed.data }] : [];
        })
        .toSorted((a, b) => a.order - b.order);
    },
    staleTime: 5 * 60_000,
  });
}
