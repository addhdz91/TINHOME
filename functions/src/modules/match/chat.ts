import {
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase-admin/firestore';
import { mentionsPayment, minuteBucket, whatsappUrl } from '@tinhome/shared/domain';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { otherParticipant, participantMatch } from './matches.js';

const PREVIEW_LENGTH = 120;

function requireActive(match: DocumentSnapshot): void {
  if (match.get('status') !== 'ACTIVE') throw appError('E_MATCH_INACTIVE');
}

/** BR-36 — both people ACTIVE, no preventive hold on either account or home, no block. */
async function requireCanChat(db: Firestore, uid: string, other: string): Promise<void> {
  const [users, homes, blockA, blockB] = await Promise.all([
    db.getAll(db.doc(`users/${uid}`), db.doc(`users/${other}`)),
    db.getAll(db.doc(`homes/${uid}`), db.doc(`homes/${other}`)),
    db.doc(`blocks/${uid}_${other}`).get(),
    db.doc(`blocks/${other}_${uid}`).get(),
  ]);
  if (blockA.exists || blockB.exists) throw appError('E_MATCH_INACTIVE');
  const sender = users[0];
  if (sender?.get('status') === 'SUSPENDED') throw appError('E_ACCOUNT_SUSPENDED');
  if (users.some((u) => u.get('status') !== 'ACTIVE')) throw appError('E_MATCH_INACTIVE');
  const held = (snap: DocumentSnapshot) =>
    (snap.get('moderationHold') as { active?: boolean } | null)?.active === true;
  if ([...users, ...homes].some(held)) throw appError('E_ON_HOLD');
}

/**
 * FR-60 — text message (1–P-28 chars, P-29 per minute). The client id is the document id, so
 * a retry after a network error never duplicates the message.
 */
export async function sendMessage(
  db: Firestore,
  uid: string,
  input: { matchId: string; text: string; clientRequestId: string },
  params: Params,
  now: Date,
): Promise<{ id: string; createdAt: string; paymentWarning: boolean }> {
  if (input.text.length > params.chatMessageMaxLength) throw appError('E_MESSAGE_TOO_LONG');
  const match = await participantMatch(db, uid, input.matchId);
  requireActive(match);
  const other = otherParticipant(match, uid);
  await requireCanChat(db, uid, other);

  const messageRef = match.ref.collection('messages').doc(input.clientRequestId);
  const counterRef = db.doc(`chatCounters/${uid}_${minuteBucket(now)}`);
  const paymentWarning = mentionsPayment(input.text);
  return db.runTransaction(async (tx) => {
    const [existing, counter, current] = await Promise.all([
      tx.get(messageRef),
      tx.get(counterRef),
      tx.get(match.ref),
    ]);
    if (existing.exists) {
      const createdAt = existing.get('createdAt') as Timestamp | undefined;
      return {
        id: existing.id,
        createdAt: (createdAt?.toDate() ?? now).toISOString(),
        paymentWarning: existing.get('paymentWarning') === true,
      };
    }
    requireActive(current);
    const count = Number(counter.get('count') ?? 0);
    if (count >= params.chatMessagesPerMinute) throw appError('E_RATE_LIMIT');
    const createdAt = Timestamp.fromDate(now);
    tx.set(counterRef, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis(now.getTime() + 86_400_000),
    });
    tx.create(messageRef, {
      senderUid: uid,
      type: 'TEXT',
      text: input.text,
      paymentWarning,
      hiddenByModeration: false,
      deletedFor: [],
      clientRequestId: input.clientRequestId,
      createdAt,
    });
    tx.update(match.ref, {
      lastMessage: {
        text: input.text.slice(0, PREVIEW_LENGTH),
        senderUid: uid,
        at: createdAt,
        type: 'TEXT',
      },
      [`unread.${other}`]: FieldValue.increment(1),
      [`lastReadAt.${uid}`]: createdAt,
      lastActivityAt: createdAt,
      unseenBy: FieldValue.arrayRemove(uid),
    });
    return { id: messageRef.id, createdAt: now.toISOString(), paymentWarning };
  });
}

export async function markConversationRead(
  db: Firestore,
  uid: string,
  matchId: string,
  now: Date,
): Promise<void> {
  const match = await participantMatch(db, uid, matchId);
  await match.ref.update({
    [`unread.${uid}`]: 0,
    [`lastReadAt.${uid}`]: Timestamp.fromDate(now),
    unseenBy: FieldValue.arrayRemove(uid),
  });
}

/** BR-36 — messages are immutable; the author (or receiver) can hide one for themselves. */
export async function deleteMessageForMe(
  db: Firestore,
  uid: string,
  matchId: string,
  messageId: string,
): Promise<void> {
  const match = await participantMatch(db, uid, matchId);
  const ref = match.ref.collection('messages').doc(messageId);
  if (!(await ref.get()).exists) throw appError('E_NOT_FOUND');
  await ref.update({ deletedFor: FieldValue.arrayUnion(uid) });
}

/** FR-28 — voluntary, per match and permanent while the match is ACTIVE. */
export async function sharePhone(
  db: Firestore,
  uid: string,
  matchId: string,
  now: Date,
): Promise<void> {
  const match = await participantMatch(db, uid, matchId);
  await db.runTransaction(async (tx) => {
    const current = await tx.get(match.ref);
    requireActive(current);
    if ((current.get('phoneSharedBy') as string[]).includes(uid)) return;
    const createdAt = Timestamp.fromDate(now);
    tx.update(match.ref, { phoneSharedBy: FieldValue.arrayUnion(uid), lastActivityAt: createdAt });
    tx.create(match.ref.collection('messages').doc(), {
      senderUid: uid,
      type: 'PHONE_SHARED',
      text: '',
      systemCode: 'PHONE_SHARED',
      paymentWarning: false,
      hiddenByModeration: false,
      deletedFor: [],
      createdAt,
    });
  });
}

/** FR-28 — the other person's phone, only if they shared it and the match is ACTIVE. */
export async function matchContact(
  db: Firestore,
  uid: string,
  matchId: string,
): Promise<{ displayName: string; phoneE164: string; whatsappUrl: string }> {
  const match = await participantMatch(db, uid, matchId);
  requireActive(match);
  const other = otherParticipant(match, uid);
  if (!(match.get('phoneSharedBy') as string[]).includes(other))
    throw appError('E_PHONE_NOT_SHARED');
  const [user, profile] = await Promise.all([
    db.doc(`users/${other}`).get(),
    db.doc(`publicProfiles/${other}`).get(),
  ]);
  const phone = user.get('phoneE164') as string | undefined;
  if (!phone) throw appError('E_PHONE_NOT_SHARED');
  return {
    displayName: String(profile.get('displayName') ?? ''),
    phoneE164: phone,
    whatsappUrl: whatsappUrl(phone),
  };
}
