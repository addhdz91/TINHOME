import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import {
  ADMIN_ROLES,
  RESTRICTIVE_ACTIONS,
  type ModerationAction,
  type ReportReason,
  type ReportTarget,
  type SanctionSuggestion,
  type StrikeSeverity,
} from '@tinhome/shared/constants';
import { strikeExpiresAt, strikeSeverity, suggestedSanction } from '@tinhome/shared/domain';
import type {
  AdminModerateInput,
  StatementInput,
  StatementOfReasons,
} from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { enqueueMailNow } from '../../core/email/queue.js';
import { forgetUserSession } from '../../core/privileged-session.js';
import { publicUrl } from '../../core/public-url.js';
import { releaseHolds } from '../home/holds.js';
import { recomputeHome } from '../home/visibility.js';
import { closeMatch } from '../match/matches.js';
import { resolvePushSender } from '../notifications/push.js';
import { notify } from '../notifications/service.js';

const DAY_MS = 86_400_000;
const STANDING_PATH = '/app/mi-cuenta';

type Restrictive = (typeof RESTRICTIVE_ACTIONS)[number];

export function isRestrictive(action: ModerationAction): action is Restrictive {
  return (RESTRICTIVE_ACTIONS as readonly ModerationAction[]).includes(action);
}

export interface Actor {
  uid: string;
  role: 'admin' | 'superadmin';
}

const longDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
});

const GROUND_TEXT = {
  LAW: 'Incumplimiento de la ley',
  TERMS: 'Incumplimiento de las Normas de la comunidad y los Términos de TinHome',
} as const;

/**
 * BR-27 / DSA art. 17 — completes the admin's statement with scope, duration and redress
 * (PROVISIONAL wording, LEG-03).
 */
export function buildStatement(
  action: Restrictive,
  targetType: ReportTarget,
  input: StatementInput,
  suspendedUntil: Date | null,
  params: Params,
): StatementOfReasons {
  const scope: Record<Restrictive, string> = {
    WARN: 'Advertencia registrada en tu cuenta. No limita el uso de TinHome.',
    HIDE_CONTENT:
      targetType === 'REVIEW'
        ? 'Se oculta el comentario de tu valoración (la puntuación se mantiene).'
        : 'Se oculta tu casa: no aparece en Descubrir ni en Explorar.',
    HIDE_MESSAGE: 'Se oculta un mensaje tuyo en el chat.',
    SUSPEND:
      'Tu cuenta queda suspendida: tu casa no es visible, no puedes dar me gusta, chatear ni declarar intercambios.',
    BAN: 'Tu cuenta queda cerrada de forma definitiva y tus matches se cierran.',
  };
  const duration =
    action === 'SUSPEND' && suspendedUntil
      ? `Hasta el ${longDate.format(suspendedUntil)}.`
      : action === 'WARN'
        ? `La advertencia caduca a los ${String(params.strikeExpiryMonths)} meses.`
        : 'Indefinida, salvo que prospere un recurso.';
  return {
    ...input,
    groundDetail: `${GROUND_TEXT[input.ground]}: ${input.groundDetail}`,
    scope: scope[action],
    duration,
    redress: `Puedes recurrir en los próximos ${String(params.appealWindowMonths)} meses desde Perfil › Mi cuenta en TinHome. Lo revisará, si es posible, otra persona del equipo. También puedes acudir a los órganos de resolución extrajudicial o a los tribunales.`,
  };
}

/** BR-41 — active (not expired, not revoked) strikes of a person, written to `users.strikesActive`. */
export async function recomputeStrikes(db: Firestore, uid: string, now: Date): Promise<number> {
  const active = await db
    .collection('strikes')
    .where('uid', '==', uid)
    .where('expiresAt', '>', Timestamp.fromDate(now))
    .get();
  const count = active.docs.filter((doc) => !doc.get('revokedAt')).length;
  await db.doc(`users/${uid}`).set({ strikesActive: count }, { merge: true });
  return count;
}

async function setUserStatus(
  db: Firestore,
  uid: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
  suspendedUntil: Date | null,
  params: Params,
): Promise<void> {
  await db.doc(`users/${uid}`).update({
    status,
    suspendedUntil: suspendedUntil ? Timestamp.fromDate(suspendedUntil) : null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  // A banned account cannot sign in again; a suspension keeps the session (read-only use).
  await getAuth()
    .updateUser(uid, { disabled: status === 'BANNED' })
    .catch(() => undefined);
  if (status === 'BANNED')
    await getAuth()
      .revokeRefreshTokens(uid)
      .catch(() => undefined);
  forgetUserSession(uid);
  await recomputeHome(db, uid, params);
}

/** BR-26 — a ban closes every active match of the person (suspensions only freeze them). */
async function closeMatchesOf(db: Firestore, uid: string): Promise<void> {
  const matches = await db
    .collection('matches')
    .where('participants', 'array-contains', uid)
    .where('status', '==', 'ACTIVE')
    .get();
  for (const match of matches.docs) {
    await db.runTransaction(async (tx) => {
      const current = await tx.get(match.ref);
      if (current.get('status') === 'ACTIVE') closeMatch(db, tx, current, 'UNMATCHED', uid);
    });
  }
}

async function setContentHidden(
  db: Firestore,
  targetType: ReportTarget,
  targetId: string,
  targetUid: string,
  hidden: boolean,
  params: Params,
): Promise<void> {
  if (targetType === 'HOME') {
    await db.doc(`homes/${targetId}`).update({ hiddenByModeration: hidden });
    await recomputeHome(db, targetId, params);
  } else if (targetType === 'REVIEW') {
    await db.doc(`reviews/${targetId}`).update({ commentHidden: hidden });
  } else if (targetType === 'USER') {
    // A person's own content is the home (homes are keyed by owner).
    await db.doc(`homes/${targetUid}`).set({ hiddenByModeration: hidden }, { merge: true });
    await recomputeHome(db, targetUid, params);
  }
}

/**
 * FR-68 — hiding a message removes its text from the chat document itself (participants can
 * read message documents, so a flag alone would still deliver the text). The original is
 * kept server-only in `hiddenMessages` to restore it if the decision is reverted.
 */
async function setMessageHidden(db: Firestore, targetId: string, hidden: boolean): Promise<void> {
  const [matchId = '', messageId = ''] = targetId.split('/');
  const matchRef = db.doc(`matches/${matchId}`);
  const messageRef = matchRef.collection('messages').doc(messageId);
  const archiveRef = db.doc(`hiddenMessages/${matchId}_${messageId}`);
  await db.runTransaction(async (tx) => {
    const [match, message, archive] = await tx.getAll(matchRef, messageRef, archiveRef);
    if (!message?.exists) throw appError('E_NOT_FOUND');
    const last = match?.get('lastMessage') as { at?: Timestamp } | null | undefined;
    const createdAt = message.get('createdAt') as Timestamp | undefined;
    const isLast = Boolean(last?.at && createdAt && last.at.isEqual(createdAt));
    if (hidden) {
      if (!archive?.exists) {
        tx.set(archiveRef, {
          matchId,
          messageId,
          text: String(message.get('text') ?? ''),
          hiddenAt: FieldValue.serverTimestamp(),
        });
      }
      tx.update(messageRef, { hiddenByModeration: true, text: '' });
      if (isLast) tx.update(matchRef, { 'lastMessage.text': '' });
    } else {
      const text = archive?.exists
        ? String(archive.get('text') ?? '')
        : String(message.get('text') ?? '');
      tx.update(messageRef, { hiddenByModeration: false, text });
      if (isLast) tx.update(matchRef, { 'lastMessage.text': text.slice(0, 120) });
      if (archive?.exists) tx.delete(archiveRef);
    }
  });
}

/** FR-68 / FR-45 — undoes the effect of an action (appeal upheld or RESTORE). */
export async function revertAction(
  db: Firestore,
  action: {
    action: ModerationAction;
    targetType: ReportTarget;
    targetId: string;
    targetUid: string;
  },
  params: Params,
): Promise<void> {
  switch (action.action) {
    case 'HIDE_CONTENT':
      await setContentHidden(
        db,
        action.targetType,
        action.targetId,
        action.targetUid,
        false,
        params,
      );
      return;
    case 'HIDE_MESSAGE':
      await setMessageHidden(db, action.targetId, false);
      return;
    case 'SUSPEND':
    case 'BAN':
      await setUserStatus(db, action.targetUid, 'ACTIVE', null, params);
      return;
    default:
      return;
  }
}

async function notifyAffected(
  db: Firestore,
  uid: string,
  action: Restrictive,
  statement: StatementOfReasons,
  now: Date,
): Promise<void> {
  const titles: Record<Restrictive, string> = {
    WARN: 'Has recibido una advertencia',
    HIDE_CONTENT: 'Hemos ocultado contenido tuyo',
    HIDE_MESSAGE: 'Hemos ocultado un mensaje tuyo',
    SUSPEND: 'Tu cuenta está suspendida temporalmente',
    BAN: 'Tu cuenta ha sido cerrada',
  };
  const type = action === 'HIDE_CONTENT' || action === 'HIDE_MESSAGE' ? 'N-15' : 'N-24';
  const data = {
    kind: action,
    facts: statement.facts,
    ground: statement.groundDetail,
    scope: statement.scope,
    duration: statement.duration,
    redress: statement.redress,
    url: `${publicUrl()}${STANDING_PATH}`,
  };
  const user = await db.doc(`users/${uid}`).get();
  const email = user.get('email') as string | undefined;
  if (action === 'BAN') {
    // A banned person can no longer open the app: e-mail only (durable medium).
    if (email) await enqueueMailNow(db, { to: email, templateId: 'N-24', data }, now);
    return;
  }
  await notify(
    db,
    resolvePushSender(publicUrl()),
    {
      uid,
      type,
      title: titles[action],
      body: statement.scope,
      link: STANDING_PATH,
      mail: type === 'N-15' ? { templateId: 'N-15', data } : { templateId: 'N-24', data },
    },
    now,
  );
}

/** N-16 to the reporter (no details about the measure, BR-27). */
export async function notifyReporter(
  db: Firestore,
  reportId: string,
  actioned: boolean,
  now: Date,
): Promise<void> {
  const report = await db.doc(`reports/${reportId}`).get();
  if (!report.exists) return;
  const reporterUid = report.get('reporterUid') as string | null;
  const reporterEmail = report.get('reporterEmail') as string | null;
  const email =
    reporterEmail ??
    (reporterUid
      ? ((await db.doc(`users/${reporterUid}`).get()).get('email') as string | undefined)
      : undefined);
  if (!email) return;
  await enqueueMailNow(
    db,
    {
      to: email,
      templateId: 'N-16',
      data: { kind: actioned ? 'REPORT_ACTIONED' : 'REPORT_NO_ACTION', text: null, url: null },
    },
    now,
  );
}

/**
 * ASVS V4.1 — nobody sanctions themselves, and only a superadmin sanctions a staff account
 * (an admin could otherwise ban the superadmin, the only role able to undo it).
 */
async function assertCanSanction(actor: Actor, targetUid: string): Promise<void> {
  if (actor.uid === targetUid) throw appError('E_VALIDATION', { fields: { targetUid: 'self' } });
  const target = await getAuth()
    .getUser(targetUid)
    .catch(() => null);
  const role = target?.customClaims?.role as unknown;
  if ((ADMIN_ROLES as readonly unknown[]).includes(role) && actor.role !== 'superadmin') {
    throw appError('E_ROLE_REQUIRED');
  }
}

/**
 * FR-44 / FR-68 / BR-27 — applies a moderation decision. Restrictive actions need a statement
 * of reasons, which is stored with the action and sent to the affected person. A strike is only
 * recorded when the admin asks for it; the system then proposes the next sanction, which the
 * admin always confirms with another decision (never automatic).
 */
export async function moderate(
  db: Firestore,
  actor: Actor,
  input: AdminModerateInput,
  params: Params,
  now: Date,
): Promise<{ actionId: string; strikesActive: number; suggestedNext: SanctionSuggestion }> {
  const restrictive = isRestrictive(input.action);
  if (restrictive && !input.statement) throw appError('E_STATEMENT_REQUIRED');
  if (input.recordStrike && !restrictive)
    throw appError('E_VALIDATION', { fields: { recordStrike: 'not_restrictive' } });
  if (input.action === 'HIDE_MESSAGE' && input.targetType !== 'MESSAGE')
    throw appError('E_VALIDATION', { fields: { action: 'target' } });
  const target = await db.doc(`users/${input.targetUid}`).get();
  if (!target.exists) throw appError('E_NOT_FOUND');
  if (restrictive) await assertCanSanction(actor, input.targetUid);
  const report = input.reportId ? await db.doc(`reports/${input.reportId}`).get() : null;
  if (input.reportId && !report?.exists) throw appError('E_NOT_FOUND');

  const suspendedUntil =
    input.action === 'SUSPEND'
      ? input.suspendedUntil
        ? new Date(input.suspendedUntil)
        : new Date(now.getTime() + params.strikeSuspensionDays * DAY_MS)
      : null;
  if (suspendedUntil && suspendedUntil.getTime() <= now.getTime())
    throw appError('E_VALIDATION', { fields: { suspendedUntil: 'past' } });

  const statement =
    restrictive && input.statement
      ? buildStatement(
          input.action as Restrictive,
          input.targetType,
          input.statement,
          suspendedUntil,
          params,
        )
      : null;

  switch (input.action) {
    case 'HIDE_CONTENT':
      await setContentHidden(db, input.targetType, input.targetId, input.targetUid, true, params);
      break;
    case 'HIDE_MESSAGE':
      await setMessageHidden(db, input.targetId, true);
      break;
    case 'SUSPEND':
      await setUserStatus(db, input.targetUid, 'SUSPENDED', suspendedUntil, params);
      break;
    case 'BAN':
      await setUserStatus(db, input.targetUid, 'BANNED', null, params);
      await closeMatchesOf(db, input.targetUid);
      break;
    case 'RESTORE':
      await revertAction(
        db,
        {
          action: 'SUSPEND',
          targetType: input.targetType,
          targetId: input.targetId,
          targetUid: input.targetUid,
        },
        params,
      );
      await setContentHidden(db, input.targetType, input.targetId, input.targetUid, false, params);
      break;
    default:
      break;
  }
  // Any decision resolves the preventive hold (FR-69): dismissing frees it without a strike;
  // a confirmed fault is then covered by the action itself (hidden content, suspension…).
  await releaseHolds(db, input.targetUid, params);

  const actionRef = db.collection('moderationActions').doc();
  await actionRef.set({
    targetUid: input.targetUid,
    targetType: input.targetType,
    targetId: input.targetId,
    action: input.action,
    suspendedUntil: suspendedUntil ? Timestamp.fromDate(suspendedUntil) : null,
    statementOfReasons: statement,
    reportId: input.reportId ?? null,
    adminUid: actor.uid,
    createdAt: Timestamp.fromDate(now),
    notifiedAt: statement ? Timestamp.fromDate(now) : null,
  });

  let severity: StrikeSeverity = 'MINOR';
  if (input.recordStrike) {
    const reason = (report?.get('reason') as ReportReason | undefined) ?? null;
    severity = strikeSeverity(reason);
    await db.collection('strikes').add({
      uid: input.targetUid,
      actionId: actionRef.id,
      reason: reason ?? input.statement?.templateId ?? 'OTHER',
      severity,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(strikeExpiresAt(now, params.strikeExpiryMonths)),
      active: true,
      revokedAt: null,
    });
  }
  const strikesActive = await recomputeStrikes(db, input.targetUid, now);

  if (report?.exists) {
    await report.ref.update({
      status: input.action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED',
      resolvedAt: Timestamp.fromDate(now),
      actionId: actionRef.id,
    });
    await notifyReporter(db, report.id, input.action !== 'DISMISS', now);
  }
  if (statement)
    await notifyAffected(db, input.targetUid, input.action as Restrictive, statement, now);
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: `moderation.${input.action.toLowerCase()}`,
    targetType: input.targetType,
    targetId: input.targetId,
    after: {
      actionId: actionRef.id,
      targetUid: input.targetUid,
      strike: input.recordStrike === true,
      suspendedUntil: suspendedUntil?.toISOString() ?? null,
    },
  });

  const suggestedNext =
    input.recordStrike && input.action !== 'BAN'
      ? suggestedSanction(strikesActive, severity, params.strikesForBan)
      : 'NONE';
  // Never propose something the decision already applied.
  const effective: SanctionSuggestion =
    input.action === 'SUSPEND' && suggestedNext === 'SUSPEND' ? 'NONE' : suggestedNext;
  return { actionId: actionRef.id, strikesActive, suggestedNext: effective };
}
