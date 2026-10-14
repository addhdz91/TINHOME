import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import type { ModerationAction, ReportTarget } from '@tinhome/shared/constants';
import { isAppealOpen } from '@tinhome/shared/domain';
import type { ModerationActionView, StatementOfReasons } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { publicUrl } from '../../core/public-url.js';
import { resolvePushSender } from '../notifications/push.js';
import { notify } from '../notifications/service.js';
import { isRestrictive, recomputeStrikes, revertAction, type Actor } from './moderate.js';

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

export async function actionView(
  db: Firestore,
  snap: DocumentSnapshot,
  params: Params,
  now: Date,
): Promise<ModerationActionView> {
  const appeal = await db.doc(`appeals/${snap.id}`).get();
  const action = snap.get('action') as ModerationAction;
  const createdAt = (snap.get('createdAt') as Timestamp).toDate();
  return {
    id: snap.id,
    action,
    targetType: snap.get('targetType') as ReportTarget,
    targetId: String(snap.get('targetId')),
    statement: (snap.get('statementOfReasons') as StatementOfReasons | null) ?? null,
    suspendedUntil: iso(snap.get('suspendedUntil')),
    adminUid: (snap.get('adminUid') as string | null) ?? null,
    createdAt: createdAt.toISOString(),
    appeal: appeal.exists
      ? {
          id: appeal.id,
          status: appeal.get('status') as 'OPEN' | 'UPHELD' | 'REJECTED',
          decisionText: (appeal.get('decisionText') as string | null | undefined) ?? null,
        }
      : null,
    appealable:
      isRestrictive(action) &&
      !appeal.exists &&
      isAppealOpen(createdAt, now, params.appealWindowMonths),
  };
}

/** FR-45 — the affected person appeals a restrictive decision once, within P-14R months. */
export async function submitAppeal(
  db: Firestore,
  uid: string,
  input: { actionId: string; text: string },
  params: Params,
  now: Date,
): Promise<string> {
  const action = await db.doc(`moderationActions/${input.actionId}`).get();
  if (!action.exists || action.get('targetUid') !== uid) throw appError('E_NOT_FOUND');
  if (!isRestrictive(action.get('action') as ModerationAction)) throw appError('E_STATE');
  const createdAt = (action.get('createdAt') as Timestamp).toDate();
  if (!isAppealOpen(createdAt, now, params.appealWindowMonths))
    throw appError('E_APPEAL_WINDOW_CLOSED');
  const ref = db.doc(`appeals/${input.actionId}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) throw appError('E_APPEAL_EXISTS');
    tx.create(ref, {
      actionId: input.actionId,
      uid,
      text: input.text,
      status: 'OPEN',
      decidedBy: null,
      decisionText: null,
      createdAt: Timestamp.fromDate(now),
      decidedAt: null,
    });
  });
  return ref.id;
}

/**
 * FR-45 — an admin decides an appeal, if possible not the one who took the decision (only a
 * warning: a small team may have a single admin). Upholding undoes the action and its strike.
 */
export async function decideAppeal(
  db: Firestore,
  actor: Actor,
  input: { appealId: string; decision: 'UPHOLD' | 'REJECT'; text: string },
  params: Params,
  now: Date,
): Promise<{ appeal: { id: string; status: 'UPHELD' | 'REJECTED' }; sameAdmin: boolean }> {
  const appeal = await db.doc(`appeals/${input.appealId}`).get();
  if (!appeal.exists) throw appError('E_NOT_FOUND');
  if (appeal.get('status') !== 'OPEN') throw appError('E_STATE');
  const action = await db.doc(`moderationActions/${String(appeal.get('actionId'))}`).get();
  const sameAdmin = action.get('adminUid') === actor.uid;
  const status = input.decision === 'UPHOLD' ? 'UPHELD' : 'REJECTED';
  const uid = String(appeal.get('uid'));
  if (input.decision === 'UPHOLD') {
    await revertAction(
      db,
      {
        action: action.get('action') as ModerationAction,
        targetType: action.get('targetType') as ReportTarget,
        targetId: String(action.get('targetId')),
        targetUid: uid,
      },
      params,
    );
    const strikes = await db.collection('strikes').where('actionId', '==', action.id).get();
    for (const strike of strikes.docs)
      await strike.ref.update({ revokedAt: Timestamp.fromDate(now), active: false });
    await recomputeStrikes(db, uid, now);
  }
  await appeal.ref.update({
    status,
    decidedBy: actor.uid,
    decisionText: input.text,
    decidedAt: Timestamp.fromDate(now),
  });
  await notify(
    db,
    resolvePushSender(publicUrl()),
    {
      uid,
      type: 'N-16',
      title: status === 'UPHELD' ? 'Hemos aceptado tu recurso' : 'Hemos revisado tu recurso',
      body: input.text,
      link: '/app/mi-cuenta',
      mail: {
        templateId: 'N-16',
        data: {
          kind: status === 'UPHELD' ? 'APPEAL_UPHELD' : 'APPEAL_REJECTED',
          text: input.text,
          url: `${publicUrl()}/app/mi-cuenta`,
        },
      },
    },
    now,
  );
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: `appeal.${input.decision.toLowerCase()}`,
    targetType: 'appeal',
    targetId: appeal.id,
    after: { sameAdmin },
  });
  return { appeal: { id: appeal.id, status }, sameAdmin };
}
