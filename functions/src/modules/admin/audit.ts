import { Timestamp, type Firestore } from 'firebase-admin/firestore';

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

/** FR-55 — insert-only audit log with filters (SADM). */
export async function listAudit(
  db: Firestore,
  input: {
    targetType?: string | undefined;
    targetId?: string | undefined;
    actorUid?: string | undefined;
    cursor?: string | undefined;
    limit: number;
  },
) {
  let query: FirebaseFirestore.Query = db.collection('auditLog');
  if (input.targetType) query = query.where('targetType', '==', input.targetType);
  if (input.targetId) query = query.where('targetId', '==', input.targetId);
  if (input.actorUid) query = query.where('actorUid', '==', input.actorUid);
  query = query.orderBy('createdAt', 'desc');
  if (input.cursor) {
    const after = await db.doc(`auditLog/${input.cursor}`).get();
    if (after.exists) query = query.startAfter(after);
  }
  const snaps = await query.limit(input.limit + 1).get();
  const docs = snaps.docs.slice(0, input.limit);
  return {
    items: docs.map((doc) => ({
      id: doc.id,
      actorUid: String(doc.get('actorUid') ?? ''),
      actorRole: String(doc.get('actorRole') ?? ''),
      action: String(doc.get('action') ?? ''),
      targetType: String(doc.get('targetType') ?? ''),
      targetId: String(doc.get('targetId') ?? ''),
      reason: (doc.get('reason') as string | undefined) ?? null,
      createdAt: iso(doc.get('createdAt')),
    })),
    nextCursor: snaps.size > input.limit ? (docs[docs.length - 1]?.id ?? null) : null,
  };
}
