import type { Firestore } from 'firebase-admin/firestore';
import type { CurrentLegalVersion } from '@tinhome/shared/domain';

/** Current version of each legal text (`legalDocs/{slug}` + its version document). */
export async function currentLegalVersions(
  db: Firestore,
  slugs: readonly string[],
): Promise<CurrentLegalVersion[]> {
  const metas = await db.getAll(...slugs.map((slug) => db.doc(`legalDocs/${slug}`)));
  const present = metas.filter((meta) => meta.exists);
  const versions = present.length
    ? await db.getAll(
        ...present.map((meta) =>
          db.doc(`legalDocs/${meta.id}/versions/${String(meta.get('currentVersion'))}`),
        ),
      )
    : [];
  return present.map((meta, index) => ({
    slug: meta.id,
    version: String(meta.get('currentVersion')),
    requiresReacceptance: versions[index]?.get('requiresReacceptance') === true,
  }));
}
