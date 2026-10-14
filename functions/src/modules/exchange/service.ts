import {
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { SIGNUP_LEGAL_DOCS, type ExchangeStatus, type SystemCode } from '@tinhome/shared/constants';
import {
  addDays,
  canCancelExchange,
  pendingLegalDocs,
  reviewDeadline,
  toIsoDate,
  validateExchangeProposal,
  type DestinationHome,
} from '@tinhome/shared/domain';
import type { ExchangeView, ProposeExchangeInput } from '@tinhome/shared/schemas';
import type { IsoDate, Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { currentLegalVersions } from '../../core/legal.js';
import { publicUrl } from '../../core/public-url.js';
import { requireUserActive } from '../../core/users.js';
import { otherParticipant, participantMatch } from '../match/matches.js';
import type { PushSender } from '../notifications/push.js';
import { notify } from '../notifications/service.js';

const DAY_MS = 86_400_000;

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

export function toExchangeView(snap: DocumentSnapshot): ExchangeView {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    matchId: String(data.matchId),
    participants: data.participants as string[],
    proposedBy: String(data.proposedBy),
    startDate: String(data.startDate),
    endDate: String(data.endDate),
    nights: Number(data.nights),
    guests: data.guests as Record<string, number>,
    pets: data.pets as Record<string, number>,
    note: (data.note as string | null | undefined) ?? null,
    status: data.status as ExchangeStatus,
    expiresAt: iso(data.expiresAt) ?? new Date(0).toISOString(),
    confirmedAt: iso(data.confirmedAt),
    cancelledBy: (data.cancelledBy as string | null | undefined) ?? null,
    cancelReason: (data.cancelReason as string | null | undefined) ?? null,
    completedAt: iso(data.completedAt),
    reviewDeadline: (data.reviewDeadlineDate as string | null | undefined) ?? null,
  };
}

const longDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** «20 de marzo de 2027» from a calendar date. */
export function formatCalendarDate(date: string): string {
  return longDate.format(new Date(`${date}T12:00:00Z`));
}

/** «del 20 de marzo de 2027 al 28 de marzo de 2027» for e-mails and notices. */
export function formatStay(startDate: string, endDate: string): string {
  return `del ${formatCalendarDate(startDate)} al ${formatCalendarDate(endDate)}`;
}

function systemMessage(
  tx: Transaction,
  match: DocumentSnapshot,
  code: SystemCode,
  exchangeId: string,
  now: Date,
): void {
  tx.create(match.ref.collection('messages').doc(), {
    senderUid: null,
    type: 'SYSTEM',
    text: '',
    systemCode: code,
    exchangeId,
    paymentWarning: false,
    hiddenByModeration: false,
    deletedFor: [],
    createdAt: Timestamp.fromDate(now),
  });
  tx.update(match.ref, { lastActivityAt: Timestamp.fromDate(now) });
}

async function displayName(db: Firestore, uid: string): Promise<string> {
  const profile = await db.doc(`publicProfiles/${uid}`).get();
  return String(profile.get('displayName') ?? 'Tu match');
}

async function destination(db: Firestore, ownerUid: string): Promise<DestinationHome | null> {
  const home = await db.doc(`homes/${ownerUid}`).get();
  if (!home.exists) return null;
  return {
    maxGuests: Number(home.get('maxGuests') ?? 0),
    petsAllowed: home.get('petsAllowed') === true,
  };
}

type ExchangeNotice = 'PROPOSED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';

const NOTICE_TITLE: Record<ExchangeNotice, (name: string) => string> = {
  PROPOSED: (name) => `${name} te propone un intercambio`,
  CONFIRMED: (name) => `${name} ha confirmado el intercambio`,
  DECLINED: (name) => `${name} no ha confirmado el intercambio`,
  CANCELLED: (name) => `${name} ha cancelado el intercambio`,
  EXPIRED: () => 'Tu propuesta de intercambio ha caducado',
};

/** N-08 to `to` about an exchange with `aboutUid`. */
async function notifyExchange(
  db: Firestore,
  push: PushSender,
  exchange: ExchangeView,
  to: string,
  aboutUid: string,
  kind: ExchangeNotice,
  now: Date,
): Promise<void> {
  const otherName = await displayName(db, aboutUid);
  const dates = formatStay(exchange.startDate, exchange.endDate);
  const link = `/app/intercambios/${exchange.id}`;
  await notify(
    db,
    push,
    {
      uid: to,
      type: 'N-08',
      title: NOTICE_TITLE[kind](otherName),
      body: `Intercambio ${dates}.`,
      link,
      push: true,
      mail: { templateId: 'N-08', data: { kind, otherName, dates, url: `${publicUrl()}${link}` } },
    },
    now,
  );
}

/** Guards `ACT` and `LEG` (05 §2.8) for the person proposing. */
async function requireActiveAndLegal(db: Firestore, uid: string): Promise<void> {
  const user = await db.doc(`users/${uid}`).get();
  if (!user.exists) throw appError('E_NOT_FOUND');
  requireUserActive(user.data() ?? {});
  const pending = pendingLegalDocs(
    (user.get('legal') ?? {}) as Record<string, string>,
    await currentLegalVersions(db, Object.keys(SIGNUP_LEGAL_DOCS)),
  );
  if (pending.length > 0) throw appError('E_LEGAL_OUTDATED');
}

/**
 * FR-30 / BR-15 — either person declares dates, guests and pets inside an ACTIVE match. One
 * open exchange per match: a new proposal waits until the current one is answered, cancelled or
 * completed (10_DECISIONS §5, M8). The other person is notified (N-08).
 */
export async function proposeExchange(
  db: Firestore,
  push: PushSender,
  uid: string,
  input: ProposeExchangeInput,
  params: Params,
  now: Date,
): Promise<ExchangeView> {
  await requireActiveAndLegal(db, uid);
  const match = await participantMatch(db, uid, input.matchId);
  if (match.get('status') !== 'ACTIVE') throw appError('E_MATCH_INACTIVE');
  const other = otherParticipant(match, uid);
  const people = [uid, other];
  const guestKeys = Object.keys(input.guests);
  const petKeys = Object.keys(input.pets);
  if (guestKeys.length !== 2 || !people.every((p) => guestKeys.includes(p)))
    throw appError('E_VALIDATION');
  if (!petKeys.every((p) => people.includes(p))) throw appError('E_VALIDATION');

  // Each person travels to the other person's home (homes are keyed by owner).
  const [mine, theirs] = await Promise.all([destination(db, uid), destination(db, other)]);
  if (!mine || !theirs) throw appError('E_HOME_STATE');
  const check = validateExchangeProposal({
    today: toIsoDate(now),
    startDate: input.startDate,
    endDate: input.endDate,
    maxNights: params.exchangeMaxNights,
    sides: people.map((p) => ({ uid: p, guests: input.guests[p] ?? 0, pets: input.pets[p] ?? 0 })),
    destinations: { [uid]: theirs, [other]: mine },
  });
  if (!check.ok) throw appError(check.error);

  const ref = db.collection('exchanges').doc();
  await db.runTransaction(async (tx) => {
    const current = await tx.get(match.ref);
    if (current.get('status') !== 'ACTIVE') throw appError('E_MATCH_INACTIVE');
    const openId = current.get('activeExchangeId') as string | null;
    if (openId) {
      const open = await tx.get(db.doc(`exchanges/${openId}`));
      const status = open.get('status') as ExchangeStatus | undefined;
      if (status === 'PROPOSED' || status === 'CONFIRMED')
        throw appError('E_EXCHANGE_PENDING_EXISTS');
    }
    tx.create(ref, {
      matchId: match.id,
      participants: people.toSorted(),
      proposedBy: uid,
      startDate: input.startDate,
      endDate: input.endDate,
      nights: check.value.nights,
      guests: input.guests,
      pets: Object.fromEntries(people.map((p) => [p, input.pets[p] ?? 0])),
      note: input.note ?? null,
      status: 'PROPOSED',
      expiresAt: Timestamp.fromMillis(now.getTime() + params.exchangeProposalExpiryDays * DAY_MS),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    tx.update(match.ref, { activeExchangeId: ref.id });
    systemMessage(tx, match, 'EXCHANGE_PROPOSED', ref.id, now);
  });
  const view = toExchangeView(await ref.get());
  await notifyExchange(db, push, view, other, uid, 'PROPOSED', now);
  return view;
}

async function participantExchange(
  db: Firestore,
  uid: string,
  exchangeId: string,
): Promise<DocumentSnapshot> {
  const snap = await db.doc(`exchanges/${exchangeId}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  if (!(snap.get('participants') as string[]).includes(uid)) throw appError('E_NOT_PARTICIPANT');
  return snap;
}

/** FR-30 — the other person confirms or declines a PROPOSED exchange (not the proposer). */
export async function respondExchange(
  db: Firestore,
  push: PushSender,
  uid: string,
  input: { exchangeId: string; accept: boolean },
  now: Date,
): Promise<ExchangeView> {
  const snap = await participantExchange(db, uid, input.exchangeId);
  const today = toIsoDate(now);
  await db.runTransaction(async (tx) => {
    const exchange = await tx.get(snap.ref);
    const match = await tx.get(db.doc(`matches/${String(exchange.get('matchId'))}`));
    if (exchange.get('status') !== 'PROPOSED') throw appError('E_EXCHANGE_STATE');
    if (exchange.get('proposedBy') === uid) throw appError('E_SELF_RESPONSE');
    const expiresAt = exchange.get('expiresAt') as Timestamp;
    if (expiresAt.toMillis() <= now.getTime()) throw appError('E_EXCHANGE_STATE');
    if (match.get('status') !== 'ACTIVE') throw appError('E_MATCH_INACTIVE');
    if (input.accept && String(exchange.get('startDate')) < today)
      throw appError('E_EXCHANGE_DATES');
    const timestamp = Timestamp.fromDate(now);
    if (input.accept) {
      tx.update(exchange.ref, {
        status: 'CONFIRMED',
        confirmedAt: timestamp,
        updatedAt: timestamp,
      });
    } else {
      tx.update(exchange.ref, { status: 'DECLINED', updatedAt: timestamp });
      tx.update(match.ref, { activeExchangeId: null });
    }
    systemMessage(
      tx,
      match,
      input.accept ? 'EXCHANGE_CONFIRMED' : 'EXCHANGE_DECLINED',
      exchange.id,
      now,
    );
  });
  const view = toExchangeView(await snap.ref.get());
  await notifyExchange(
    db,
    push,
    view,
    view.proposedBy,
    uid,
    input.accept ? 'CONFIRMED' : 'DECLINED',
    now,
  );
  return view;
}

/**
 * FR-31 — the proposer withdraws a PROPOSED exchange, or either person cancels a CONFIRMED one
 * before the start date. The reason is optional and only kept for metrics (no sanction).
 */
export async function cancelExchange(
  db: Firestore,
  push: PushSender,
  uid: string,
  input: { exchangeId: string; reason?: string | undefined },
  now: Date,
): Promise<ExchangeView> {
  const snap = await participantExchange(db, uid, input.exchangeId);
  const today = toIsoDate(now);
  await db.runTransaction(async (tx) => {
    const exchange = await tx.get(snap.ref);
    const match = await tx.get(db.doc(`matches/${String(exchange.get('matchId'))}`));
    const allowed = canCancelExchange(
      {
        status: exchange.get('status') as ExchangeStatus,
        proposedBy: String(exchange.get('proposedBy')),
        startDate: String(exchange.get('startDate')) as IsoDate,
      },
      uid,
      today,
    );
    if (!allowed) throw appError('E_EXCHANGE_STATE');
    const timestamp = Timestamp.fromDate(now);
    tx.update(exchange.ref, {
      status: 'CANCELLED',
      cancelledBy: uid,
      cancelReason: input.reason ?? null,
      cancelledAt: timestamp,
      updatedAt: timestamp,
    });
    if (match.exists) {
      if (match.get('activeExchangeId') === exchange.id)
        tx.update(match.ref, { activeExchangeId: null });
      systemMessage(tx, match, 'EXCHANGE_CANCELLED', exchange.id, now);
    }
  });
  const view = toExchangeView(await snap.ref.get());
  const other = view.participants.find((p) => p !== uid) ?? '';
  await notifyExchange(db, push, view, other, uid, 'CANCELLED', now);
  return view;
}

const JOB_BATCH = 200;

/** J-01 — PROPOSED exchanges without an answer in P-19 days expire; the proposer is told. */
export async function expireProposals(db: Firestore, push: PushSender, now: Date): Promise<number> {
  const due = await db
    .collection('exchanges')
    .where('status', '==', 'PROPOSED')
    .where('expiresAt', '<=', Timestamp.fromDate(now))
    .limit(JOB_BATCH)
    .get();
  for (const snap of due.docs) {
    const expired = await db.runTransaction(async (tx) => {
      const exchange = await tx.get(snap.ref);
      if (exchange.get('status') !== 'PROPOSED') return false;
      const match = await tx.get(db.doc(`matches/${String(exchange.get('matchId'))}`));
      tx.update(exchange.ref, { status: 'EXPIRED', updatedAt: Timestamp.fromDate(now) });
      if (match.exists) {
        if (match.get('activeExchangeId') === exchange.id)
          tx.update(match.ref, { activeExchangeId: null });
        systemMessage(tx, match, 'EXCHANGE_EXPIRED', exchange.id, now);
      }
      return true;
    });
    if (!expired) continue;
    const view = toExchangeView(await snap.ref.get());
    const other = view.participants.find((p) => p !== view.proposedBy) ?? '';
    await notifyExchange(db, push, view, view.proposedBy, other, 'EXPIRED', now);
  }
  return due.size;
}

/**
 * J-02 — CONFIRMED exchanges whose end date has passed become COMPLETED and open the reviews
 * for P-20 days (N-10 to both).
 */
export async function completeExchanges(
  db: Firestore,
  push: PushSender,
  params: Params,
  now: Date,
): Promise<number> {
  const today = toIsoDate(now);
  const due = await db
    .collection('exchanges')
    .where('status', '==', 'CONFIRMED')
    .where('endDate', '<', today)
    .limit(JOB_BATCH)
    .get();
  for (const snap of due.docs) {
    const deadline = reviewDeadline(
      String(snap.get('endDate')) as IsoDate,
      params.reviewWindowDays,
    );
    const completed = await db.runTransaction(async (tx) => {
      const exchange = await tx.get(snap.ref);
      if (exchange.get('status') !== 'CONFIRMED') return false;
      const match = await tx.get(db.doc(`matches/${String(exchange.get('matchId'))}`));
      tx.update(exchange.ref, {
        status: 'COMPLETED',
        completedAt: Timestamp.fromDate(now),
        reviewDeadlineDate: deadline,
        reviewsClosed: false,
        // End of the deadline day, Europe/Madrid (J-03 publishes after it).
        reviewDeadline: Timestamp.fromDate(madridStartOf(addDays(deadline, 1))),
        updatedAt: Timestamp.fromDate(now),
      });
      if (match.exists) {
        if (match.get('activeExchangeId') === exchange.id)
          tx.update(match.ref, { activeExchangeId: null });
        systemMessage(tx, match, 'EXCHANGE_COMPLETED', exchange.id, now);
      }
      return true;
    });
    if (completed) await inviteToReview(db, push, toExchangeView(await snap.ref.get()), now);
  }
  return due.size;
}

/** Instant at which a calendar day starts in Europe/Madrid. */
export function madridStartOf(date: IsoDate): Date {
  const noonUtc = new Date(`${date}T12:00:00Z`);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Europe/Madrid',
    }).format(noonUtc),
  );
  // Madrid is UTC+1 or UTC+2: midnight there is 23:00 or 22:00 UTC of the previous day.
  return new Date(noonUtc.getTime() - hour * 3_600_000);
}

/** N-10 to whoever has not reviewed yet. */
export async function inviteToReview(
  db: Firestore,
  push: PushSender,
  exchange: ExchangeView,
  now: Date,
): Promise<void> {
  for (const uid of exchange.participants) {
    const review = await db.doc(`reviews/${exchange.id}_${uid}`).get();
    if (review.exists) continue;
    const other = exchange.participants.find((p) => p !== uid) ?? '';
    const otherName = await displayName(db, other);
    const link = `/app/valorar/${exchange.id}`;
    const deadline = formatCalendarDate(exchange.reviewDeadline ?? exchange.endDate);
    await notify(
      db,
      push,
      {
        uid,
        type: 'N-10',
        title: `¿Qué tal el intercambio con ${otherName}?`,
        body: `Valóralo antes del ${deadline}.`,
        link,
        push: true,
        mail: {
          templateId: 'N-10',
          data: { otherName, deadline, url: `${publicUrl()}${link}` },
        },
      },
      now,
    );
  }
}

/** J-06 (part) — N-09 three days before the start. */
export async function remindUpcoming(db: Firestore, push: PushSender, now: Date): Promise<number> {
  const startDate = addDays(toIsoDate(now), 3);
  const upcoming = await db
    .collection('exchanges')
    .where('status', '==', 'CONFIRMED')
    .where('startDate', '==', startDate)
    .limit(JOB_BATCH)
    .get();
  for (const snap of upcoming.docs) {
    const view = toExchangeView(snap);
    const link = `/app/intercambios/${view.id}`;
    const dates = formatStay(view.startDate, view.endDate);
    for (const uid of view.participants) {
      const otherName = await displayName(db, view.participants.find((p) => p !== uid) ?? '');
      await notify(
        db,
        push,
        {
          uid,
          type: 'N-09',
          title: 'Tu intercambio empieza en 3 días',
          body: `Con ${otherName}, ${dates}. Repasa la lista de entrega.`,
          link,
          push: true,
          mail: {
            templateId: 'N-09',
            data: { otherName, dates, url: `${publicUrl()}${link}` },
          },
        },
        now,
      );
    }
  }
  return upcoming.size;
}

/** J-06 (part) — N-10 again on the day after the end (sent by J-02) and nine days later. */
export async function remindReviews(db: Firestore, push: PushSender, now: Date): Promise<number> {
  const endDate = addDays(toIsoDate(now), -10);
  const pending = await db
    .collection('exchanges')
    .where('status', '==', 'COMPLETED')
    .where('endDate', '==', endDate)
    .limit(JOB_BATCH)
    .get();
  for (const snap of pending.docs) await inviteToReview(db, push, toExchangeView(snap), now);
  return pending.size;
}
