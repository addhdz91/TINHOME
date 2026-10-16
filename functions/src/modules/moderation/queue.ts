import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import type {
  AdminAlertType,
  ReportPriority,
  ReportReason,
  ReportStatus,
  ReportTarget,
  StrikeSeverity,
} from '@tinhome/shared/constants';
import type {
  AdminGetReportOutput,
  GetMyStandingOutput,
  ReportSummary,
  StatementInput,
} from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { cursorOffset } from '../../core/pagination.js';
import { releaseHolds } from '../home/holds.js';
import { actionView } from './appeals.js';
import { moderate, type Actor } from './moderate.js';
import type { ReportSnapshot } from './reports.js';

function iso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}

export function toReportSummary(snap: DocumentSnapshot): ReportSummary {
  return {
    id: snap.id,
    targetType: snap.get('targetType') as ReportTarget,
    targetId: String(snap.get('targetId') ?? ''),
    targetUid: String(snap.get('targetUid') ?? ''),
    reason: snap.get('reason') as ReportReason,
    priority: snap.get('priority') as ReportPriority,
    status: snap.get('status') as ReportStatus,
    reporterVerified: snap.get('reporterVerified') === true,
    public: snap.get('public') === true,
    dueAt: iso(snap.get('dueAt')),
    createdAt: iso(snap.get('createdAt')),
  };
}

/** FR-44 — moderation queue: high priority first, then the closest deadline. */
export async function listReports(
  db: Firestore,
  input: {
    status?: ReportStatus | undefined;
    priority?: ReportPriority | undefined;
    cursor?: string | undefined;
    limit: number;
  },
): Promise<{ items: ReportSummary[]; nextCursor: string | null }> {
  let query = db.collection('reports').where('status', '==', input.status ?? 'OPEN');
  if (input.priority) query = query.where('priority', '==', input.priority);
  const snaps = await query.orderBy('dueAt', 'asc').limit(200).get();
  const sorted = snaps.docs
    .map(toReportSummary)
    .toSorted((a, b) =>
      a.priority === b.priority ? a.dueAt.localeCompare(b.dueAt) : a.priority === 'HIGH' ? -1 : 1,
    );
  const offset = cursorOffset(input.cursor);
  const page = sorted.slice(offset, offset + input.limit);
  const next = offset + input.limit;
  return { items: page, nextCursor: next < sorted.length ? String(next) : null };
}

async function strikesOf(db: Firestore, uid: string, now: Date) {
  const strikes = await db
    .collection('strikes')
    .where('uid', '==', uid)
    .where('expiresAt', '>', Timestamp.fromDate(now))
    .get();
  return strikes.docs
    .filter((doc) => !doc.get('revokedAt'))
    .map((doc) => ({
      id: doc.id,
      reason: String(doc.get('reason')),
      severity: doc.get('severity') as StrikeSeverity,
      createdAt: iso(doc.get('createdAt')),
      expiresAt: iso(doc.get('expiresAt')),
    }));
}

async function actionsOf(db: Firestore, uid: string, params: Params, now: Date) {
  const actions = await db
    .collection('moderationActions')
    .where('targetUid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();
  return Promise.all(actions.docs.map((doc) => actionView(db, doc, params, now)));
}

function holdOf(home: DocumentSnapshot, user: DocumentSnapshot) {
  for (const [scope, snap] of [
    ['HOME', home],
    ['USER', user],
  ] as const) {
    const hold = snap.get('moderationHold') as
      { active?: boolean; reason?: string; dueAt?: unknown } | null | undefined;
    if (hold?.active)
      return {
        scope,
        reason: hold.reason ?? '',
        dueAt: hold.dueAt ? iso(hold.dueAt) : null,
      };
  }
  return null;
}

/** FR-44 — detail: the snapshot, the implicated messages and the person's history. */
export async function getReport(
  db: Firestore,
  id: string,
  params: Params,
  now: Date,
): Promise<AdminGetReportOutput> {
  const snap = await db.doc(`reports/${id}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  const targetUid = String(snap.get('targetUid') ?? '');
  const [profile, user, home, open] = await Promise.all([
    db.doc(`publicProfiles/${targetUid}`).get(),
    db.doc(`users/${targetUid}`).get(),
    db.doc(`homes/${targetUid}`).get(),
    db
      .collection('reports')
      .where('targetUid', '==', targetUid)
      .where('status', '==', 'OPEN')
      .count()
      .get(),
  ]);
  const snapshot = (snap.get('targetSnapshot') ?? {}) as Partial<ReportSnapshot>;
  const hold = holdOf(home, user);
  return {
    report: {
      ...toReportSummary(snap),
      description: String(snap.get('description') ?? ''),
      reporterName: (snap.get('reporterName') as string | null | undefined) ?? null,
      targetUrl: (snap.get('targetUrl') as string | null | undefined) ?? null,
      snapshot: {
        title: snapshot.title ?? null,
        text: snapshot.text ?? null,
        photoUrls: snapshot.photoUrls ?? [],
        messages: snapshot.messages ?? [],
      },
      attachmentCount: ((snap.get('attachments') as unknown[] | undefined) ?? []).length,
    },
    targetUserHistory: {
      displayName: String(profile.get('displayName') ?? targetUid),
      status: String(user.get('status') ?? 'UNKNOWN'),
      strikesActive: Number(user.get('strikesActive') ?? 0),
      strikes: targetUid ? await strikesOf(db, targetUid, now) : [],
      actions: targetUid ? await actionsOf(db, targetUid, params, now) : [],
      openReports: open.data().count,
      hold: hold ? { reason: hold.reason, dueAt: hold.dueAt } : null,
    },
  };
}

/** FR-68 — what the person sees in Perfil › Mi cuenta (S-20). */
export async function myStanding(
  db: Firestore,
  uid: string,
  params: Params,
  now: Date,
): Promise<GetMyStandingOutput> {
  const [home, user] = await Promise.all([
    db.doc(`homes/${uid}`).get(),
    db.doc(`users/${uid}`).get(),
  ]);
  return {
    strikes: await strikesOf(db, uid, now),
    actions: await actionsOf(db, uid, params, now),
    hold: holdOf(home, user),
  };
}

/** FR-45 — open appeals for the admin queue. */
export async function listAppeals(db: Firestore, params: Params, now: Date) {
  const appeals = await db
    .collection('appeals')
    .where('status', '==', 'OPEN')
    .orderBy('createdAt', 'asc')
    .limit(100)
    .get();
  const items = [];
  for (const appeal of appeals.docs) {
    const action = await db.doc(`moderationActions/${String(appeal.get('actionId'))}`).get();
    if (!action.exists) continue;
    items.push({
      id: appeal.id,
      actionId: action.id,
      uid: String(appeal.get('uid')),
      text: String(appeal.get('text')),
      status: 'OPEN' as const,
      action: await actionView(db, action, params, now),
      createdAt: iso(appeal.get('createdAt')),
    });
  }
  return { items };
}

/** FR-69 — release or confirm a preventive hold (confirming needs a statement). */
export async function resolveHold(
  db: Firestore,
  actor: Actor,
  input: {
    uid: string;
    scope: 'HOME' | 'USER';
    decision: 'RELEASE' | 'CONFIRM';
    statement?: StatementInput | undefined;
  },
  params: Params,
  now: Date,
): Promise<void> {
  const ref = db.doc(input.scope === 'HOME' ? `homes/${input.uid}` : `users/${input.uid}`);
  const snap = await ref.get();
  if (!(snap.get('moderationHold') as { active?: boolean } | null | undefined)?.active)
    throw appError('E_STATE');
  if (input.decision === 'RELEASE') {
    await releaseHolds(db, input.uid, params);
    await writeAudit({
      actorUid: actor.uid,
      actorRole: actor.role,
      action: 'hold.release',
      targetType: input.scope.toLowerCase(),
      targetId: input.uid,
    });
    return;
  }
  if (!input.statement) throw appError('E_STATEMENT_REQUIRED');
  await moderate(
    db,
    actor,
    input.scope === 'HOME'
      ? {
          targetType: 'HOME',
          targetId: input.uid,
          targetUid: input.uid,
          action: 'HIDE_CONTENT',
          statement: input.statement,
        }
      : {
          targetType: 'USER',
          targetId: input.uid,
          targetUid: input.uid,
          action: 'SUSPEND',
          statement: input.statement,
        },
    params,
    now,
  );
}

export async function listAlerts(db: Firestore) {
  const alerts = await db
    .collection('adminAlerts')
    .where('handledAt', '==', null)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  return {
    items: alerts.docs.map((doc) => ({
      id: doc.id,
      type: doc.get('type') as AdminAlertType,
      refType: String(doc.get('refType') ?? ''),
      refId: String(doc.get('refId') ?? ''),
      priority: (doc.get('priority') as ReportPriority | undefined) ?? 'NORMAL',
      createdAt: iso(doc.get('createdAt')),
    })),
  };
}

export async function handleAlert(db: Firestore, actor: Actor, alertId: string, now: Date) {
  const ref = db.doc(`adminAlerts/${alertId}`);
  if (!(await ref.get()).exists) throw appError('E_NOT_FOUND');
  await ref.update({ handledBy: actor.uid, handledAt: Timestamp.fromDate(now) });
}

/** FR-69 — everything on preventive hold, closest deadline first. */
export async function listHolds(db: Firestore) {
  const items = [];
  for (const [collection, scope] of [
    ['homes', 'HOME'],
    ['users', 'USER'],
  ] as const) {
    const held = await db
      .collection(collection)
      .where('moderationHold.active', '==', true)
      .limit(200)
      .get();
    for (const snap of held.docs) {
      const hold = (snap.get('moderationHold') ?? {}) as {
        reason?: string;
        since?: unknown;
        dueAt?: unknown;
      };
      const profile = await db.doc(`publicProfiles/${snap.id}`).get();
      items.push({
        uid: snap.id,
        scope,
        displayName: String(profile.get('displayName') ?? snap.id),
        reason: hold.reason ?? '',
        since: hold.since ? iso(hold.since) : null,
        dueAt: hold.dueAt ? iso(hold.dueAt) : null,
      });
    }
  }
  return { items: items.toSorted((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')) };
}
