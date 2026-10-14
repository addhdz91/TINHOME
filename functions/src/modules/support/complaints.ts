import {
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase-admin/firestore';
import type { ComplaintCategory, TicketStatus } from '@tinhome/shared/constants';
import { complaintDueAt, isTicketOpen, ticketNumber } from '@tinhome/shared/domain';
import type { SubmitComplaintInput, TicketDetail, TicketSummary } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { enqueueMailNow } from '../../core/email/queue.js';
import { publicUrl } from '../../core/public-url.js';
import type { Actor } from '../moderation/moderate.js';
import { resolvePushSender } from '../notifications/push.js';
import { notify } from '../notifications/service.js';

const longDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
});

function iso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}

export function toTicketSummary(snap: DocumentSnapshot): TicketSummary {
  return {
    id: snap.id,
    number: String(snap.get('number')),
    category: snap.get('category') as ComplaintCategory,
    subject: String(snap.get('subject')),
    status: snap.get('status') as TicketStatus,
    dueAt: iso(snap.get('dueAt')),
    createdAt: iso(snap.get('createdAt')),
    updatedAt: iso(snap.get('updatedAt') ?? snap.get('createdAt')),
  };
}

/**
 * FR-67 / BR-43 — creates a complaint with an atomic yearly number (`TH-2026-000123`),
 * deadline P-38 and an immediate acknowledgement (N-25). Visitors must give an e-mail.
 */
export async function submitComplaint(
  db: Firestore,
  uid: string | null,
  input: SubmitComplaintInput,
  params: Params,
  now: Date,
): Promise<{ ticketId: string; number: string; dueAt: string }> {
  let email = input.email ?? null;
  if (uid) {
    const user = await db.doc(`users/${uid}`).get();
    email = (user.get('email') as string | undefined) ?? email;
  }
  if (!email) throw appError('E_VALIDATION', { fields: { email: 'required' } });
  const attachments = uid
    ? (input.attachmentPaths ?? []).filter((path) => path.startsWith(`private/reports/${uid}/`))
    : [];
  const year = Number(
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'Europe/Madrid' }).format(now),
  );
  const counter = db.doc(`counters/supportTickets-${String(year)}`);
  const ref = db.collection('supportTickets').doc();
  const dueAt = complaintDueAt(now, params.complaintResponseDays);
  const number = await db.runTransaction(async (tx) => {
    const current = await tx.get(counter);
    const sequence = Number(current.get('value') ?? 0) + 1;
    tx.set(counter, { value: sequence });
    const value = ticketNumber(year, sequence);
    tx.create(ref, {
      number: value,
      uid,
      email,
      name: input.name ?? null,
      category: input.category,
      subject: input.subject,
      description: input.description,
      attachments,
      status: 'RECEIVED',
      assignedTo: null,
      dueAt: Timestamp.fromDate(dueAt),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      resolvedAt: null,
    });
    return value;
  });
  await enqueueMailNow(
    db,
    {
      to: email,
      templateId: 'N-25',
      data: {
        kind: 'RECEIVED',
        number,
        dueDate: longDate.format(dueAt),
        url: uid ? `${publicUrl()}/app/soporte/${ref.id}` : null,
      },
    },
    now,
  );
  return { ticketId: ref.id, number, dueAt: dueAt.toISOString() };
}

async function ticketWithMessages(snap: DocumentSnapshot): Promise<TicketDetail> {
  const messages = await snap.ref.collection('messages').orderBy('createdAt', 'asc').get();
  return {
    ticket: {
      ...toTicketSummary(snap),
      description: String(snap.get('description') ?? ''),
      email: (snap.get('email') as string | null | undefined) ?? null,
    },
    messages: messages.docs.map((doc) => ({
      id: doc.id,
      authorType: doc.get('authorType') === 'ADMIN' ? 'ADMIN' : 'USER',
      text: String(doc.get('text') ?? ''),
      createdAt: iso(doc.get('createdAt')),
    })),
  };
}

async function ownTicket(db: Firestore, uid: string, ticketId: string): Promise<DocumentSnapshot> {
  const snap = await db.doc(`supportTickets/${ticketId}`).get();
  if (!snap.exists || snap.get('uid') !== uid) throw appError('E_NOT_FOUND');
  return snap;
}

/** «Mis solicitudes». */
export async function listMine(db: Firestore, uid: string): Promise<{ items: TicketSummary[] }> {
  const snaps = await db
    .collection('supportTickets')
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return { items: snaps.docs.map(toTicketSummary) };
}

export async function getMine(db: Firestore, uid: string, ticketId: string): Promise<TicketDetail> {
  return ticketWithMessages(await ownTicket(db, uid, ticketId));
}

/** FR-67 — the person answers (e.g. when the team asked for information). */
export async function addMessage(
  db: Firestore,
  uid: string,
  input: { ticketId: string; text: string },
  now: Date,
): Promise<void> {
  const snap = await ownTicket(db, uid, input.ticketId);
  if (!isTicketOpen(String(snap.get('status')))) throw appError('E_TICKET_CLOSED');
  await snap.ref.collection('messages').add({
    authorType: 'USER',
    authorUid: uid,
    text: input.text,
    createdAt: Timestamp.fromDate(now),
  });
  await snap.ref.update({
    status:
      snap.get('status') === 'WAITING_USER' ? 'IN_REVIEW' : (snap.get('status') as TicketStatus),
    updatedAt: Timestamp.fromDate(now),
  });
}

export async function adminList(
  db: Firestore,
  input: { status?: TicketStatus | undefined; cursor?: string | undefined; limit: number },
): Promise<{ items: TicketSummary[]; nextCursor: string | null }> {
  const statuses: TicketStatus[] = input.status
    ? [input.status]
    : ['RECEIVED', 'IN_REVIEW', 'WAITING_USER'];
  const snaps = await db
    .collection('supportTickets')
    .where('status', 'in', statuses)
    .orderBy('dueAt', 'asc')
    .limit(200)
    .get();
  const offset = input.cursor ? Number(input.cursor) : 0;
  const items = snaps.docs.map(toTicketSummary);
  const next = offset + input.limit;
  return {
    items: items.slice(offset, next),
    nextCursor: next < items.length ? String(next) : null,
  };
}

export async function adminGet(db: Firestore, ticketId: string): Promise<TicketDetail> {
  const snap = await db.doc(`supportTickets/${ticketId}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  return ticketWithMessages(snap);
}

/** FR-67 — the team answers and sets the status; the person gets N-25 (and the in-app notice). */
export async function adminReply(
  db: Firestore,
  actor: Actor,
  input: { ticketId: string; text: string; status: TicketStatus },
  now: Date,
): Promise<void> {
  const snap = await db.doc(`supportTickets/${input.ticketId}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  await snap.ref.collection('messages').add({
    authorType: 'ADMIN',
    authorUid: actor.uid,
    text: input.text,
    createdAt: Timestamp.fromDate(now),
  });
  const resolved = input.status === 'RESOLVED' || input.status === 'CLOSED';
  await snap.ref.update({
    status: input.status,
    assignedTo: (snap.get('assignedTo') as string | null | undefined) ?? actor.uid,
    updatedAt: Timestamp.fromDate(now),
    resolvedAt: resolved ? Timestamp.fromDate(now) : null,
    dueAlertedAt: FieldValue.delete(),
  });
  const number = String(snap.get('number'));
  const uid = snap.get('uid') as string | null;
  const kind = resolved ? 'RESOLVED' : 'REPLIED';
  const url = uid ? `${publicUrl()}/app/soporte/${snap.id}` : null;
  if (uid) {
    await notify(
      db,
      resolvePushSender(publicUrl()),
      {
        uid,
        type: 'N-25',
        title: resolved ? `Solicitud ${number} resuelta` : `Respuesta a tu solicitud ${number}`,
        body: input.text.slice(0, 140),
        link: `/app/soporte/${snap.id}`,
        mail: { templateId: 'N-25', data: { kind, number, dueDate: null, url } },
      },
      now,
    );
  } else {
    const email = snap.get('email') as string | null;
    // Visitors get the answer by e-mail (they have no account to read it in).
    if (email) {
      await enqueueMailNow(
        db,
        { to: email, templateId: 'N-25', data: { kind, number, dueDate: null, url: null } },
        now,
      );
    }
  }
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: 'complaint.reply',
    targetType: 'ticket',
    targetId: snap.id,
    after: { status: input.status },
  });
}
