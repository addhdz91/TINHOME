import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { AppErrorCode, Blocker } from '@tinhome/shared/constants';
import {
  matchIdFor,
  pairKey,
  startOfNextDay,
  toIsoDate,
  validateListingText,
} from '@tinhome/shared/domain';
import type { LikeHomeOutput } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { publicUrl } from '../../core/public-url.js';
import { buildMe, type SessionInfo } from '../account/me.js';
import { compatibilityWith, loadCatalog } from '../discover/candidates.js';
import { loadViewer } from '../discover/viewer.js';
import { resolvePushSender, type PushSender } from '../notifications/push.js';
import { notify } from '../notifications/service.js';
import { personOf } from './people.js';

const DAY_MS = 86_400_000;

/** BR-05 — first unmet requirement as the catalogue error the client explains. */
const BLOCKER_ERRORS: Record<Blocker, AppErrorCode> = {
  ACCOUNT_RESTRICTED: 'E_ACCOUNT_SUSPENDED',
  EMAIL: 'E_EMAIL_NOT_VERIFIED',
  PHONE: 'E_PHONE_NOT_VERIFIED',
  HOME_INCOMPLETE: 'E_HOME_INCOMPLETE',
  NO_AVAILABILITY: 'E_NO_AVAILABILITY',
  IDENTITY_MISSING: 'E_IDENTITY_NOT_APPROVED',
  IDENTITY_PENDING: 'E_IDENTITY_NOT_APPROVED',
  IDENTITY_REJECTED: 'E_IDENTITY_NOT_APPROVED',
  DECLARATION: 'E_DECLARATION_REQUIRED',
  HOME_NOT_PUBLISHED: 'E_HOME_NOT_PUBLISHED',
  CITY_WAITLIST: 'E_CITY_NOT_OPEN',
  LEGAL_OUTDATED: 'E_LEGAL_OUTDATED',
};

/**
 * FR-23/24 — likes a home. One transaction: daily (free) / hourly (Premium) counters, the like
 * and, if the other person already liked back, the match with a deterministic id (BR-07).
 */
export async function likeHome(
  db: Firestore,
  session: SessionInfo,
  input: { homeId: string; message?: string | undefined },
  params: Params,
  now: Date,
  push: PushSender = resolvePushSender(publicUrl()),
): Promise<LikeHomeOutput> {
  const uid = session.uid;
  const me = await buildMe(db, session, params, now);
  const blocker = me.blockers[0];
  if (blocker) throw appError(BLOCKER_ERRORS[blocker]);
  if (input.homeId === uid) throw appError('E_SELF_LIKE');

  const [target, myHome, blockA, blockB] = await Promise.all([
    db.doc(`homes/${input.homeId}`).get(),
    db.doc(`homes/${uid}`).get(),
    db.doc(`blocks/${uid}_${input.homeId}`).get(),
    db.doc(`blocks/${input.homeId}_${uid}`).get(),
  ]);
  if (!target.exists || target.get('visible') !== true || blockA.exists || blockB.exists) {
    throw appError('E_NOT_FOUND');
  }
  if ((myHome.get('moderationHold') as { active?: boolean } | null)?.active)
    throw appError('E_ON_HOLD');
  const ownerUid = input.homeId;

  if (input.message !== undefined) {
    if (!me.premium.active) throw appError('E_PREMIUM_REQUIRED');
    const check = validateListingText(input.message);
    if (!check.ok)
      throw appError('E_TEXT_VIOLATION', { fields: { message: check.error.join(',') } });
  }

  const counterRef = db.doc(`likeCounters/${uid}_${toIsoDate(now)}`);
  const likeRef = db.doc(`likes/${uid}_${ownerUid}`);
  const reverseRef = db.doc(`likes/${ownerUid}_${uid}`);
  const key = pairKey(uid, ownerUid);
  const baseRef = db.doc(`matches/${key}`);
  const hour = madridHour(now);

  // Read outside the transaction: denormalised names for the chat list, compatibility.
  const [catalog, viewer, people] = await Promise.all([
    loadCatalog(db),
    loadViewer(db, session, params, now),
    Promise.all([personOf(db, uid), personOf(db, ownerUid)]),
  ]);
  const compatibility = compatibilityWith(viewer, target.data() ?? {}, catalog);

  const result = await db.runTransaction(async (tx) => {
    const [counter, existing, reverse, base] = await Promise.all([
      tx.get(counterRef),
      tx.get(likeRef),
      tx.get(reverseRef),
      tx.get(baseRef),
    ]);
    const count = Number(counter.get('count') ?? 0);
    const remaining = me.premium.active ? null : Math.max(0, params.freeDailyLikes - count);
    const currentMatchId =
      base.exists && base.get('status') === 'ACTIVE'
        ? base.id
        : ((base.get('currentMatchId') as string | undefined) ?? null);
    // Idempotent: a repeated like returns the current state and spends nothing.
    if (existing.exists) {
      return {
        matched: reverse.exists && currentMatchId !== null,
        matchId: currentMatchId,
        likesRemaining: remaining,
        mail: null,
      };
    }
    if (!me.premium.active && count >= params.freeDailyLikes) {
      throw appError('E_LIKE_LIMIT', { meta: { resetsAt: startOfNextDay(now).toISOString() } });
    }
    const hourBuckets = (counter.get('hourBuckets') as Record<string, number> | undefined) ?? {};
    if (me.premium.active && (hourBuckets[hour] ?? 0) >= params.premiumHourlyLikeCap)
      throw appError('E_RATE_LIMIT');
    const messages = Number(counter.get('messageCount') ?? 0);
    if (input.message !== undefined && messages >= params.premiumMessageLikesPerDay)
      throw appError('E_MESSAGE_LIMIT');

    tx.set(counterRef, {
      count: count + 1,
      hourBuckets: { ...hourBuckets, [hour]: (hourBuckets[hour] ?? 0) + 1 },
      messageCount: messages + (input.message !== undefined ? 1 : 0),
      expiresAt: Timestamp.fromMillis(now.getTime() + 3 * DAY_MS),
    });
    tx.create(likeRef, {
      fromUid: uid,
      toUid: ownerUid,
      toHomeId: ownerUid,
      fromHomeId: uid,
      message: input.message ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    const likesRemaining = remaining === null ? null : Math.max(0, remaining - 1);
    if (!reverse.exists) return { matched: false, matchId: null, likesRemaining, mail: null };

    // BR-07 — match. After an unmatch the pair gets a new id so the old chat never returns.
    const rematchCount = base.exists
      ? Number(base.get('rematchCount') ?? 0) + (base.get('status') === 'ACTIVE' ? 0 : 1)
      : 0;
    const matchId = matchIdFor(uid, ownerUid, rematchCount);
    if (base.exists && base.get('status') === 'ACTIVE') {
      return { matched: true, matchId: base.id, likesRemaining, mail: null };
    }
    const matchRef = db.doc(`matches/${matchId}`);
    const timestamp = FieldValue.serverTimestamp();
    const [a, b] = [uid, ownerUid].toSorted();
    tx.set(matchRef, {
      participants: [a, b],
      pairKey: key,
      homeIds: { [uid]: uid, [ownerUid]: ownerUid },
      people: { [uid]: people[0], [ownerUid]: people[1] },
      status: 'ACTIVE',
      compatibility: {
        perfectFit: compatibility.perfectFit,
        mutualDestination: compatibility.mutualDestination,
        sharedWindowIds: compatibility.sharedWindowIds,
        overlapDays: compatibility.overlapDays,
      },
      unseenBy: [uid, ownerUid],
      lastMessage: null,
      unread: { [uid]: 0, [ownerUid]: 0 },
      lastReadAt: {},
      phoneSharedBy: [],
      activeExchangeId: null,
      rematchCount,
      createdAt: timestamp,
      lastActivityAt: timestamp,
    });
    if (matchId !== key)
      tx.set(baseRef, { currentMatchId: matchId, rematchCount }, { merge: true });
    const messagesRef = matchRef.collection('messages');
    tx.create(messagesRef.doc(), {
      senderUid: null,
      type: 'SYSTEM',
      text: '',
      systemCode: 'MATCH_CREATED',
      paymentWarning: false,
      hiddenByModeration: false,
      deletedFor: [],
      createdAt: timestamp,
    });
    // FR-61 — a message sent with a like becomes the first message of the chat.
    const likeMessages = [
      { from: ownerUid, text: reverse.get('message') as string | null },
      { from: uid, text: input.message ?? null },
    ];
    for (const { from, text } of likeMessages) {
      if (!text) continue;
      tx.create(messagesRef.doc(), {
        senderUid: from,
        type: 'PREMIUM_LIKE_MESSAGE',
        text,
        paymentWarning: false,
        hiddenByModeration: false,
        deletedFor: [],
        createdAt: timestamp,
      });
    }
    return { matched: true, matchId, likesRemaining, mail: matchId };
  });

  if (result.mail) {
    // N-07 to both people (centre, e-mail and push: N-28 is the push of the same event).
    const matchId = result.mail;
    for (const [index, person] of [uid, ownerUid].entries()) {
      const other = people[index === 0 ? 1 : 0];
      const link = `/app/chats/${matchId}`;
      await notify(
        db,
        push,
        {
          uid: person,
          type: 'N-07',
          title: `¡Tienes un match con ${other.displayName}!`,
          body: 'Escribidle para hablar de fechas.',
          link,
          push: true,
          mail: {
            templateId: 'N-07',
            data: {
              otherName: other.displayName,
              otherCity: other.cityName,
              chatUrl: `${publicUrl()}${link}`,
            },
          },
        },
        now,
      );
    }
  } else if (!result.matched && input.message !== undefined) {
    // N-21 — like with a message (FR-61).
    const sender = await db.doc(`publicProfiles/${uid}`).get();
    const otherName = String(sender.get('displayName') ?? 'Alguien');
    const link = '/app/me-gusta';
    await notify(
      db,
      push,
      {
        uid: ownerUid,
        type: 'N-21',
        title: `${otherName} te ha escrito con su me gusta`,
        body: 'Mira su casa y decide si te encaja.',
        link,
        push: true,
        mail: { templateId: 'N-21', data: { otherName, url: `${publicUrl()}${link}` } },
      },
      now,
    );
  }
  return {
    matched: result.matched,
    matchId: result.matchId,
    likesRemaining: result.likesRemaining,
  };
}

/** Hour of the day in Europe/Madrid, «00»–«23» (hourly Premium cap, BR-06). */
function madridHour(now: Date): string {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Madrid',
  }).format(now);
  return formatted.padStart(2, '0');
}
