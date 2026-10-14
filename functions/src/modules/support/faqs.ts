import { FieldValue, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import type { FaqCategory } from '@tinhome/shared/constants';
import type { FaqAdminView } from '@tinhome/shared/schemas';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { consumeRateLimit } from '../../core/rate-limit.js';
import type { Actor } from '../moderation/moderate.js';

const HOUR_MS = 3_600_000;

function toView(snap: DocumentSnapshot): FaqAdminView {
  return {
    slug: snap.id,
    category: snap.get('category') as FaqCategory,
    question: String(snap.get('question') ?? ''),
    answerMarkdown: String(snap.get('answerMarkdown') ?? ''),
    order: Number(snap.get('order') ?? 0),
    published: snap.get('published') === true,
    tags: (snap.get('tags') as string[] | undefined) ?? [],
    helpfulYes: Number(snap.get('helpfulYes') ?? 0),
    helpfulNo: Number(snap.get('helpfulNo') ?? 0),
  };
}

/** FR-66 — «¿Te ha servido?» (public; 30 votes per hour per IP). Only published articles. */
export async function rateFaq(
  db: Firestore,
  input: { slug: string; helpful: boolean },
  ip: string,
  now: Date,
): Promise<void> {
  await consumeRateLimit(db, { scope: 'rateFaq', key: ip, limit: 30, windowMs: HOUR_MS, now });
  const ref = db.doc(`faqs/${input.slug}`);
  const snap = await ref.get();
  if (!snap.exists || snap.get('published') !== true) throw appError('E_NOT_FOUND');
  await ref.update({ [input.helpful ? 'helpfulYes' : 'helpfulNo']: FieldValue.increment(1) });
}

export async function listFaqs(db: Firestore): Promise<{ items: FaqAdminView[] }> {
  const snaps = await db.collection('faqs').get();
  return {
    items: snaps.docs
      .map(toView)
      .toSorted((a, b) => a.category.localeCompare(b.category) || a.order - b.order),
  };
}

/** FR-66 — admins edit articles without a deploy (audited). Stats are kept. */
export async function upsertFaq(
  db: Firestore,
  actor: Actor,
  input: Omit<FaqAdminView, 'helpfulYes' | 'helpfulNo'>,
): Promise<FaqAdminView> {
  const ref = db.doc(`faqs/${input.slug}`);
  const before = await ref.get();
  await ref.set(
    {
      category: input.category,
      question: input.question,
      answerMarkdown: input.answerMarkdown,
      order: input.order,
      published: input.published,
      tags: input.tags,
      updatedAt: FieldValue.serverTimestamp(),
      ...(before.exists ? {} : { helpfulYes: 0, helpfulNo: 0 }),
    },
    { merge: true },
  );
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: before.exists ? 'faq.update' : 'faq.create',
    targetType: 'faq',
    targetId: input.slug,
    after: { published: input.published },
  });
  return toView(await ref.get());
}
