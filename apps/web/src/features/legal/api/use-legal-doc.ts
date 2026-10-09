import { useQuery } from '@tanstack/react-query';
import { LegalDocMetaSchema, LegalDocVersionSchema } from '@tinhome/shared/schemas';
import { readPublicDoc } from '@/lib/firestore-public';

export interface LegalDocument {
  slug: string;
  title: string;
  version: string;
  markdown: string;
  changeSummary: string | null;
  publishedAt: Date | null;
}

function toDate(value: unknown): Date | null {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const fn = value.toDate;
    if (typeof fn === 'function') {
      const result: unknown = fn.call(value);
      return result instanceof Date ? result : null;
    }
  }
  return null;
}

export const legalKeys = {
  meta: (slug: string) => ['legalDocs', slug, 'meta'] as const,
  doc: (slug: string) => ['legalDocs', slug, 'current'] as const,
};

/** Current version id of a legal text (needed to record what the visitor accepted). */
export function useLegalVersion(slug: string) {
  return useQuery({
    queryKey: legalKeys.meta(slug),
    queryFn: async (): Promise<{ title: string; currentVersion: string } | null> => {
      const parsed = LegalDocMetaSchema.safeParse(await readPublicDoc(`legalDocs/${slug}`));
      return parsed.success ? parsed.data : null;
    },
  });
}

/** FR-57 — current version of a legal text; `null` when it does not exist. */
export function useLegalDoc(slug: string) {
  return useQuery({
    queryKey: legalKeys.doc(slug),
    queryFn: async (): Promise<LegalDocument | null> => {
      const meta = LegalDocMetaSchema.safeParse(await readPublicDoc(`legalDocs/${slug}`));
      if (!meta.success) return null;
      const raw = await readPublicDoc(`legalDocs/${slug}/versions/${meta.data.currentVersion}`);
      const version = LegalDocVersionSchema.safeParse(raw);
      if (!version.success) return null;
      return {
        slug,
        title: meta.data.title,
        version: meta.data.currentVersion,
        markdown: version.data.markdown,
        changeSummary: version.data.changeSummary ?? null,
        publishedAt: toDate(raw?.publishedAt),
      };
    },
  });
}
