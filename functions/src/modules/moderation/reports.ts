import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { ReportReason, ReportTarget } from '@tinhome/shared/constants';
import { reportDueAt, reportPriority, shouldHold, toIsoDate } from '@tinhome/shared/domain';
import type { SubmitReportInput } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { enqueueMailNow } from '../../core/email/queue.js';
import { consumeRateLimit } from '../../core/rate-limit.js';
import { holdHome } from '../home/holds.js';
import { blockUser } from '../match/blocks.js';
import { emailAdmins } from './admins.js';

const DAY_MS = 86_400_000;
const REPORTS_PER_DAY = 10;
const CONTEXT_MESSAGES = 10;

export interface ReportSnapshot {
  title: string | null;
  text: string | null;
  photoUrls: string[];
  messages: {
    id: string;
    senderUid: string | null;
    text: string;
    createdAt: string | null;
    reported: boolean;
  }[];
}

interface ResolvedTarget {
  targetUid: string;
  snapshot: ReportSnapshot;
}

const REASON_LABEL: Record<ReportReason, string> = {
  PHOTOS_NOT_OWN: 'fotos que no son de su vivienda',
  RUDE: 'trato grosero o irrespetuoso',
  HARASSMENT: 'acoso o amenazas',
  INAPPROPRIATE_MESSAGES: 'mensajes inapropiados o spam',
  FRAUD: 'fraude o petición de dinero',
  HIDDEN_RENTAL: 'alquiler encubierto',
  ILLEGAL: 'contenido ilegal',
  PERSONAL_DATA: 'datos personales expuestos',
  OTHER: 'otro motivo',
};

export function reasonLabel(reason: ReportReason): string {
  return REASON_LABEL[reason];
}

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

/**
 * Copies what is reported at this moment (04 §2.24 `targetSnapshot`): the team never reads
 * chats, so a reported message carries itself and the 10 previous ones.
 */
async function resolveTarget(
  db: Firestore,
  type: ReportTarget,
  targetId: string,
  reporterUid: string | null,
): Promise<ResolvedTarget> {
  const empty: ReportSnapshot = { title: null, text: null, photoUrls: [], messages: [] };
  switch (type) {
    case 'HOME': {
      const home = await db.doc(`homes/${targetId}`).get();
      if (!home.exists) throw appError('E_NOT_FOUND');
      const photos = (home.get('photos') as { thumbUrl?: string }[] | undefined) ?? [];
      return {
        targetUid: String(home.get('ownerUid') ?? targetId),
        snapshot: {
          ...empty,
          title: String(home.get('title') ?? ''),
          text: String(home.get('description') ?? ''),
          photoUrls: photos.flatMap((p) => (p.thumbUrl ? [p.thumbUrl] : [])).slice(0, 8),
        },
      };
    }
    case 'USER': {
      const profile = await db.doc(`publicProfiles/${targetId}`).get();
      if (!profile.exists) throw appError('E_NOT_FOUND');
      return {
        targetUid: targetId,
        snapshot: {
          ...empty,
          title: String(profile.get('displayName') ?? ''),
          text: (profile.get('about') as string | undefined) ?? null,
        },
      };
    }
    case 'REVIEW': {
      const review = await db.doc(`reviews/${targetId}`).get();
      if (!review.exists || review.get('status') !== 'PUBLISHED') throw appError('E_NOT_FOUND');
      return {
        targetUid: String(review.get('authorUid')),
        snapshot: {
          ...empty,
          title: `${String(review.get('overall'))}/5`,
          text: (review.get('comment') as string | null | undefined) ?? null,
        },
      };
    }
    case 'MESSAGE': {
      const [matchId = '', messageId = ''] = targetId.split('/');
      const match = await db.doc(`matches/${matchId}`).get();
      const participants = (match.get('participants') as string[] | undefined) ?? [];
      if (!match.exists || !reporterUid || !participants.includes(reporterUid))
        throw appError('E_NOT_FOUND');
      const message = await match.ref.collection('messages').doc(messageId).get();
      const senderUid = message.get('senderUid') as string | null | undefined;
      if (!message.exists || !senderUid || senderUid === reporterUid) throw appError('E_NOT_FOUND');
      const previous = await match.ref
        .collection('messages')
        .where('createdAt', '<', message.get('createdAt') as Timestamp)
        .orderBy('createdAt', 'desc')
        .limit(CONTEXT_MESSAGES)
        .get();
      const toView = (doc: typeof message, reported: boolean) => ({
        id: doc.id,
        senderUid: (doc.get('senderUid') as string | null | undefined) ?? null,
        text: String(doc.get('text') ?? ''),
        createdAt: iso(doc.get('createdAt')),
        reported,
      });
      return {
        targetUid: senderUid,
        snapshot: {
          ...empty,
          messages: [
            ...previous.docs.toReversed().map((d) => toView(d, false)),
            toView(message, true),
          ],
        },
      };
    }
  }
}

/**
 * FR-42 / BR-27 / BR-42 — a signed-in user reports a home, a person, a review or a message.
 * Admins are alerted at once (panel; e-mail when high priority); a serious report from a
 * verified user, or P-34 independent reports in 30 days, puts the target on preventive hold.
 */
export async function submitReport(
  db: Firestore,
  reporterUid: string,
  input: SubmitReportInput,
  params: Params,
  now: Date,
): Promise<{ reportId: string; priority: 'HIGH' | 'NORMAL'; preventiveHold: boolean }> {
  const reporter = await db.doc(`users/${reporterUid}`).get();
  if (!reporter.exists) throw appError('E_NOT_FOUND');
  const { targetUid, snapshot } = await resolveTarget(
    db,
    input.targetType,
    input.targetId,
    reporterUid,
  );
  if (targetUid === reporterUid) throw appError('E_VALIDATION', { fields: { targetId: 'self' } });
  const attachments = (input.attachmentPaths ?? []).filter((path) =>
    path.startsWith(`private/reports/${reporterUid}/`),
  );
  await consumeRateLimit(db, {
    scope: 'report',
    key: `${reporterUid}_${toIsoDate(now)}`,
    limit: REPORTS_PER_DAY,
    windowMs: DAY_MS,
    now,
  });

  const priority = reportPriority(input.reason);
  // Only an ACTIVE, verified account can trigger a preventive hold: a suspended person can
  // still report (anyone can, even visitors), but not freeze someone else's account with it.
  const reporterVerified =
    reporter.get('status') === 'ACTIVE' &&
    (reporter.get('verification') as { identity?: string } | undefined)?.identity === 'APPROVED';
  const ref = db.collection('reports').doc();
  await ref.set({
    reporterUid,
    reporterName: null,
    reporterEmail: null,
    public: false,
    targetType: input.targetType,
    targetId: input.targetId,
    targetUid,
    targetSnapshot: snapshot,
    reason: input.reason,
    reporterVerified,
    description: input.description,
    attachments,
    status: 'OPEN',
    priority,
    dueAt: Timestamp.fromDate(reportDueAt(priority, now)),
    createdAt: Timestamp.fromDate(now),
    resolvedAt: null,
  });

  const recent = await db
    .collection('reports')
    .where('targetUid', '==', targetUid)
    .where('createdAt', '>=', Timestamp.fromMillis(now.getTime() - 30 * DAY_MS))
    .select('reporterUid')
    .get();
  const independent = new Set(
    recent.docs.map((doc) => doc.get('reporterUid') as string | null).filter(Boolean),
  ).size;
  const hold = shouldHold({
    reason: input.reason,
    reporterVerified,
    independentReporters30d: independent,
    threshold: params.preventiveHoldReportsThreshold,
  });
  if (hold) {
    // Homes are keyed by their owner: a report about photos or a home holds the home;
    // reports about a person, review or message hold the account.
    const scope =
      input.targetType === 'HOME' || input.reason === 'PHOTOS_NOT_OWN' ? 'HOME' : 'USER';
    await holdHome(db, targetUid, hold, params, now, {
      scope,
      high: priority === 'HIGH',
      meta: { reportId: ref.id, reason: input.reason },
    });
  }
  if (priority === 'HIGH') {
    await db.collection('adminAlerts').add({
      type: 'REPORT_HIGH',
      refType: 'report',
      refId: ref.id,
      priority,
      createdAt: FieldValue.serverTimestamp(),
      handledAt: null,
    });
    await emailAdmins(
      db,
      {
        kind: 'REPORT_HIGH',
        summary: `Denuncia de prioridad alta: ${reasonLabel(input.reason)}.`,
        path: `/admin/denuncias/${ref.id}`,
      },
      now,
    );
  }
  const email = reporter.get('email') as string | undefined;
  if (email) {
    await enqueueMailNow(
      db,
      { to: email, templateId: 'N-14', data: { reference: ref.id.slice(0, 8).toUpperCase() } },
      now,
    );
  }
  if (input.alsoBlock) await blockUser(db, reporterUid, targetUid).catch(() => undefined);
  return { reportId: ref.id, priority, preventiveHold: hold !== null };
}

const PUBLIC_REPORTS_PER_HOUR = 3;

/**
 * FR-43 — a visitor reports content without an account (App Check + 3 per hour per IP). The
 * URL is matched to a home when possible; otherwise the team triages it. No preventive hold:
 * the reporter is not verified (BR-42).
 */
export async function submitPublicReport(
  db: Firestore,
  input: {
    name: string;
    email: string;
    targetUrl: string;
    reason?: ReportReason | undefined;
    description: string;
  },
  ip: string,
  now: Date,
): Promise<{ reportId: string }> {
  await consumeRateLimit(db, {
    scope: 'publicReport',
    key: ip,
    limit: PUBLIC_REPORTS_PER_HOUR,
    windowMs: 3_600_000,
    now,
  });
  const reason = input.reason ?? 'OTHER';
  const homeId = /\/casa\/([\w-]{1,128})/.exec(input.targetUrl)?.[1] ?? null;
  const home = homeId ? await db.doc(`homes/${homeId}`).get() : null;
  const target = home?.exists
    ? await resolveTarget(db, 'HOME', home.id, null)
    : { targetUid: '', snapshot: { title: null, text: null, photoUrls: [], messages: [] } };
  const priority = reportPriority(reason);
  const ref = db.collection('reports').doc();
  await ref.set({
    reporterUid: null,
    reporterName: input.name,
    reporterEmail: input.email,
    public: true,
    targetUrl: input.targetUrl,
    targetType: home?.exists ? 'HOME' : 'USER',
    targetId: home?.exists ? home.id : '',
    targetUid: target.targetUid,
    targetSnapshot: target.snapshot,
    reason,
    reporterVerified: false,
    description: input.description,
    attachments: [],
    status: 'OPEN',
    priority,
    dueAt: Timestamp.fromDate(reportDueAt(priority, now)),
    createdAt: Timestamp.fromDate(now),
    resolvedAt: null,
  });
  if (priority === 'HIGH') {
    await db.collection('adminAlerts').add({
      type: 'REPORT_HIGH',
      refType: 'report',
      refId: ref.id,
      priority,
      createdAt: FieldValue.serverTimestamp(),
      handledAt: null,
    });
    await emailAdmins(
      db,
      {
        kind: 'REPORT_HIGH',
        summary: `Denuncia pública de prioridad alta: ${reasonLabel(reason)}.`,
        path: `/admin/denuncias/${ref.id}`,
      },
      now,
    );
  }
  await enqueueMailNow(
    db,
    { to: input.email, templateId: 'N-14', data: { reference: ref.id.slice(0, 8).toUpperCase() } },
    now,
  );
  return { reportId: ref.id };
}
