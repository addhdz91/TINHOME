import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { Params } from '@tinhome/shared/types';
import { recomputeHome } from '../home/visibility.js';
import { emailAdmins } from './admins.js';
import { recomputeStrikes } from './moderate.js';

const BATCH = 200;
const HOUR_MS = 3_600_000;

/** J-07 — suspensions whose end date has passed are lifted (BR-26). */
export async function reactivateSuspended(
  db: Firestore,
  params: Params,
  now: Date,
): Promise<number> {
  const due = await db
    .collection('users')
    .where('status', '==', 'SUSPENDED')
    .where('suspendedUntil', '<=', Timestamp.fromDate(now))
    .limit(BATCH)
    .get();
  for (const user of due.docs) {
    await user.ref.update({
      status: 'ACTIVE',
      suspendedUntil: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await recomputeHome(db, user.id, params);
  }
  return due.size;
}

/** J-11 — strikes older than P-31 months stop counting (BR-41). */
export async function expireStrikes(db: Firestore, now: Date): Promise<number> {
  const due = await db
    .collection('strikes')
    .where('active', '==', true)
    .where('expiresAt', '<=', Timestamp.fromDate(now))
    .limit(BATCH)
    .get();
  const uids = new Set<string>();
  for (const strike of due.docs) {
    await strike.ref.update({ active: false });
    uids.add(String(strike.get('uid')));
  }
  for (const uid of uids) await recomputeStrikes(db, uid, now);
  return due.size;
}

/**
 * J-12 — reports, holds and complaints close to their deadline (2 h) raise an admin alert and
 * an e-mail; past the deadline they are escalated to the superadmins (once each).
 */
export async function alertDeadlines(db: Firestore, now: Date): Promise<number> {
  const soon = Timestamp.fromMillis(now.getTime() + 2 * HOUR_MS);
  const nowTs = Timestamp.fromDate(now);
  let alerts = 0;

  const reports = await db
    .collection('reports')
    .where('status', '==', 'OPEN')
    .where('dueAt', '<=', soon)
    .limit(BATCH)
    .get();
  for (const report of reports.docs) {
    const overdue = (report.get('dueAt') as Timestamp).toMillis() <= now.getTime();
    if (!report.get('dueAlertedAt')) {
      await db.collection('adminAlerts').add({
        type: 'REPORT_DUE',
        refType: 'report',
        refId: report.id,
        priority: (report.get('priority') as string | undefined) ?? 'NORMAL',
        createdAt: FieldValue.serverTimestamp(),
        handledAt: null,
      });
      await emailAdmins(
        db,
        {
          kind: 'REPORT_DUE',
          summary: 'Una denuncia está a punto de vencer.',
          path: `/admin/denuncias/${report.id}`,
        },
        now,
      );
      await report.ref.update({ dueAlertedAt: nowTs });
      alerts += 1;
    }
    if (overdue && !report.get('escalatedAt')) {
      await emailAdmins(
        db,
        {
          kind: 'ESCALATION',
          summary: 'Una denuncia ha superado su plazo de revisión.',
          path: `/admin/denuncias/${report.id}`,
        },
        now,
        'superadmin',
      );
      await report.ref.update({ escalatedAt: nowTs });
      alerts += 1;
    }
  }

  for (const collection of ['homes', 'users'] as const) {
    const held = await db
      .collection(collection)
      .where('moderationHold.active', '==', true)
      .where('moderationHold.dueAt', '<=', nowTs)
      .limit(BATCH)
      .get();
    for (const snap of held.docs) {
      if (snap.get('moderationHold.escalatedAt')) continue;
      await db.collection('adminAlerts').add({
        type: 'HOLD_OVERDUE',
        refType: collection === 'homes' ? 'home' : 'user',
        refId: snap.id,
        priority: 'HIGH',
        createdAt: FieldValue.serverTimestamp(),
        handledAt: null,
      });
      await emailAdmins(
        db,
        {
          kind: 'HOLD_OVERDUE',
          summary: 'Una retención preventiva ha superado su plazo (P-35).',
          path: '/admin/retenciones',
        },
        now,
      );
      await emailAdmins(
        db,
        {
          kind: 'ESCALATION',
          summary: 'Una retención preventiva ha superado su plazo (P-35).',
          path: '/admin/retenciones',
        },
        now,
        'superadmin',
      );
      await snap.ref.update({ 'moderationHold.escalatedAt': nowTs });
      alerts += 1;
    }
  }

  const tickets = await db
    .collection('supportTickets')
    .where('status', 'in', ['RECEIVED', 'IN_REVIEW'])
    .where('dueAt', '<=', Timestamp.fromMillis(now.getTime() + 24 * HOUR_MS))
    .limit(BATCH)
    .get();
  for (const ticket of tickets.docs) {
    if (ticket.get('dueAlertedAt')) continue;
    await db.collection('adminAlerts').add({
      type: 'COMPLAINT_DUE',
      refType: 'ticket',
      refId: ticket.id,
      priority: 'NORMAL',
      createdAt: FieldValue.serverTimestamp(),
      handledAt: null,
    });
    await emailAdmins(
      db,
      {
        kind: 'COMPLAINT_DUE',
        summary: `La queja ${String(ticket.get('number'))} vence en menos de 24 h.`,
        path: `/admin/quejas/${ticket.id}`,
      },
      now,
    );
    await ticket.ref.update({ dueAlertedAt: nowTs });
    alerts += 1;
  }
  return alerts;
}
