import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import type { GdprRequestStatus, GdprRequestType } from '@tinhome/shared/constants';
import { gdprDueAt } from '@tinhome/shared/domain';
import type { GdprRequestView } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { publicUrl } from '../../core/public-url.js';
import type { Actor } from '../moderation/moderate.js';
import type { PushSender } from '../notifications/push.js';
import { notify } from '../notifications/service.js';

/** Labels for the e-mail (the app uses es.json). */
const TYPE_LABEL: Record<GdprRequestType, string> = {
  ACCESS: 'Acceso',
  RECTIFICATION: 'Rectificación',
  ERASURE: 'Supresión',
  OBJECTION: 'Oposición',
  RESTRICTION: 'Limitación',
  PORTABILITY: 'Portabilidad',
};

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

function view(snap: DocumentSnapshot): GdprRequestView {
  return {
    id: snap.id,
    type: snap.get('type') as GdprRequestType,
    details: String(snap.get('details') ?? ''),
    status: snap.get('status') as GdprRequestStatus,
    dueAt: iso(snap.get('dueAt')) ?? '',
    createdAt: iso(snap.get('createdAt')) ?? '',
    closedAt: iso(snap.get('closedAt')),
    note: (snap.get('note') as string | null | undefined) ?? null,
  };
}

/** FR-59 / BR-30 — registered with a due date of P-16R days; admins see it in their queue. */
export async function submitGdprRequest(
  db: Firestore,
  uid: string,
  input: { type: GdprRequestType; details: string },
  params: Params,
  now: Date,
): Promise<{ requestId: string; dueAt: string }> {
  const dueAt = gdprDueAt(now, params.gdprResponseDays);
  const ref = await db.collection('gdprRequests').add({
    uid,
    type: input.type,
    details: input.details,
    status: 'OPEN',
    dueAt: Timestamp.fromDate(dueAt),
    createdAt: Timestamp.fromDate(now),
    closedAt: null,
    note: null,
  });
  return { requestId: ref.id, dueAt: dueAt.toISOString() };
}

export async function listMine(db: Firestore, uid: string): Promise<{ items: GdprRequestView[] }> {
  const snaps = await db
    .collection('gdprRequests')
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return { items: snaps.docs.map(view) };
}

/** FR-59 — queue ordered by due date (oldest first), flagging the overdue ones. */
export async function adminList(
  db: Firestore,
  input: { status?: GdprRequestStatus | undefined; cursor?: string | undefined; limit: number },
  now: Date,
) {
  let query = db.collection('gdprRequests').orderBy('dueAt', 'asc');
  if (input.status) query = query.where('status', '==', input.status);
  if (input.cursor) {
    const after = await db.doc(`gdprRequests/${input.cursor}`).get();
    if (after.exists) query = query.startAfter(after);
  }
  const page = await query.limit(input.limit + 1).get();
  const docs = page.docs.slice(0, input.limit);
  const items = await Promise.all(
    docs.map(async (snap) => {
      const uid = String(snap.get('uid'));
      const profile = await db.doc(`publicProfiles/${uid}`).get();
      const base = view(snap);
      return {
        ...base,
        uid,
        displayName: String(profile.get('displayName') ?? uid),
        overdue: base.status === 'OPEN' && new Date(base.dueAt).getTime() < now.getTime(),
      };
    }),
  );
  return { items, nextCursor: page.size > input.limit ? (docs.at(-1)?.id ?? null) : null };
}

/** FR-59 — closes with a note that the person receives (N-30, in-app + e-mail). Audited. */
export async function adminClose(
  db: Firestore,
  push: PushSender,
  actor: Actor,
  input: { id: string; status: 'DONE' | 'REJECTED'; note: string },
  now: Date,
): Promise<void> {
  const ref = db.doc(`gdprRequests/${input.id}`);
  const snap = await ref.get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  if (snap.get('status') !== 'OPEN') throw appError('E_VALIDATION', { fields: { id: 'closed' } });
  await ref.update({
    status: input.status,
    note: input.note,
    closedAt: Timestamp.fromDate(now),
    closedBy: actor.uid,
  });
  const uid = String(snap.get('uid'));
  const type = snap.get('type') as GdprRequestType;
  await notify(
    db,
    push,
    {
      uid,
      type: 'N-30',
      title: `Respuesta a tu solicitud de ${TYPE_LABEL[type].toLowerCase()}`,
      body: input.note.slice(0, 140),
      link: '/app/privacidad',
      mail: {
        templateId: 'N-30',
        data: {
          typeLabel: TYPE_LABEL[type],
          done: input.status === 'DONE',
          note: input.note,
          url: `${publicUrl()}/app/privacidad`,
        },
      },
    },
    now,
  );
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: 'gdpr.close',
    targetType: 'gdprRequest',
    targetId: input.id,
    after: { status: input.status },
    reason: input.note,
  });
}
