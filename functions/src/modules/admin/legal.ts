import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { SIGNUP_LEGAL_DOCS, type LegalDocSlug } from '@tinhome/shared/constants';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { enqueueMailNow } from '../../core/email/queue.js';
import { publicUrl } from '../../core/public-url.js';
import type { Actor } from '../moderation/moderate.js';

const NOTIFY_BATCH = 500;

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

/** Next version: «0.1-provisional» → «0.2», «1.4» → «1.5». */
export function nextVersion(current: string | null): string {
  const match = current ? /^(\d+)\.(\d+)/.exec(current) : null;
  if (!match) return '1.0';
  return `${match[1] ?? '0'}.${String(Number(match[2] ?? '0') + 1)}`;
}

export async function getLegalDoc(db: Firestore, slug: LegalDocSlug) {
  const meta = await db.doc(`legalDocs/${slug}`).get();
  const currentVersion = (meta.get('currentVersion') as string | undefined) ?? null;
  const versions = await db.collection(`legalDocs/${slug}/versions`).get();
  const current = versions.docs.find((doc) => doc.id === currentVersion);
  return {
    slug,
    title: String(meta.get('title') ?? slug),
    currentVersion,
    markdown: String(current?.get('markdown') ?? ''),
    versions: versions.docs
      .map((doc) => ({
        version: doc.id,
        publishedAt: iso(doc.get('publishedAt')),
        requiresReacceptance: doc.get('requiresReacceptance') === true,
        changeSummary: String(doc.get('changeSummary') ?? ''),
      }))
      .toSorted((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')),
  };
}

/**
 * FR-56 / FR-58 — publishes a new version (SADM, audited). Versions are never edited. When it
 * needs re-acceptance, the next `getMe` lists it in `legalPending` (modal in the app); every
 * active user also gets N-17 for the sign-up texts.
 */
export async function publishLegalDoc(
  db: Firestore,
  actor: Actor,
  input: {
    slug: LegalDocSlug;
    markdown: string;
    requiresReacceptance: boolean;
    changeSummary: string;
  },
  now: Date,
): Promise<{ version: string }> {
  const metaRef = db.doc(`legalDocs/${input.slug}`);
  const meta = await metaRef.get();
  if (!meta.exists) throw appError('E_NOT_FOUND');
  const version = nextVersion((meta.get('currentVersion') as string | undefined) ?? null);
  const versionRef = metaRef.collection('versions').doc(version);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(versionRef)).exists) throw appError('E_STATE');
    tx.create(versionRef, {
      markdown: input.markdown,
      publishedAt: Timestamp.fromDate(now),
      requiresReacceptance: input.requiresReacceptance,
      changeSummary: input.changeSummary,
      publishedBy: actor.uid,
    });
    tx.update(metaRef, { currentVersion: version, updatedAt: FieldValue.serverTimestamp() });
  });
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: 'legal.publish',
    targetType: 'legalDoc',
    targetId: input.slug,
    after: { version, requiresReacceptance: input.requiresReacceptance },
  });
  if (input.slug in SIGNUP_LEGAL_DOCS) {
    const title = String(meta.get('title') ?? input.slug);
    let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
      let query = db
        .collection('users')
        .where('status', '==', 'ACTIVE')
        .orderBy('__name__')
        .limit(NOTIFY_BATCH);
      if (last) query = query.startAfter(last);
      const page = await query.get();
      for (const user of page.docs) {
        const email = user.get('email') as string | undefined;
        if (!email) continue;
        await enqueueMailNow(
          db,
          {
            to: email,
            templateId: 'N-17',
            data: {
              title,
              changeSummary: input.changeSummary,
              requiresReacceptance: input.requiresReacceptance,
              url: `${publicUrl()}/legal/${input.slug}`,
            },
          },
          now,
        );
      }
      if (page.size < NOTIFY_BATCH) break;
      last = page.docs[page.docs.length - 1];
    }
  }
  return { version };
}
