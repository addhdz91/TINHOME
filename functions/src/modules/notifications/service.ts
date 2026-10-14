import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { NotificationType } from '@tinhome/shared/constants';
import {
  NOTIFICATION_CATEGORY_OF,
  wantsChannel,
  type NotificationPreferences,
} from '@tinhome/shared/domain';
import { enqueueMailNow } from '../../core/email/queue.js';
import type { MailQueueItem } from '../../core/email/types.js';
import type { PushPayload, PushSender } from './push.js';

/** A `mailQueue` item without the address (the notifier reads it from `users/{uid}`). */
export type MailContent = MailQueueItem extends infer Item
  ? Item extends MailQueueItem
    ? Omit<Item, 'to'>
    : never
  : never;

export interface NotifyInput {
  uid: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Internal route («/app/intercambios/abc»). */
  link: string;
  mail?: MailContent;
  /** Send a web push too (FR-70: messages, matches, likes with message, exchanges). */
  push?: boolean;
  /** Push body when the person enabled previews (03 §17); otherwise `body`. */
  pushPreview?: string;
  /** Skip the in-app item (e.g. a push for every chat message). */
  inApp?: boolean;
}

export function tokenId(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * FR-46 / FR-70 / BR-44 — one entry point for every notice: the in-app notification center
 * (always), the e-mail and the push (each only if the category allows it). Returns whether a
 * push went out, so the unread digest (J-13) can skip people who already got one.
 */
export async function notify(
  db: Firestore,
  push: PushSender,
  input: NotifyInput,
  now: Date,
): Promise<{ pushed: boolean }> {
  const user = await db.doc(`users/${input.uid}`).get();
  if (!user.exists || user.get('status') === 'DELETED') return { pushed: false };
  const settings = (user.get('settings') ?? {}) as {
    notifications?: NotificationPreferences;
    pushPreview?: boolean;
  };
  const category = NOTIFICATION_CATEGORY_OF[input.type];

  if (input.inApp !== false) {
    await db.collection(`notifications/${input.uid}/items`).add({
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      createdAt: Timestamp.fromDate(now),
      readAt: null,
    });
  }

  const email = user.get('email') as string | undefined;
  if (input.mail && email && wantsChannel(settings.notifications, category, 'email')) {
    await enqueueMailNow(db, { ...input.mail, to: email }, now);
  }

  if (!input.push || !wantsChannel(settings.notifications, category, 'push')) {
    return { pushed: false };
  }
  const tokens = await db.collection(`users/${input.uid}/pushTokens`).get();
  if (tokens.empty) return { pushed: false };
  const payload: PushPayload = {
    title: input.title,
    body: settings.pushPreview === true && input.pushPreview ? input.pushPreview : input.body,
    link: input.link,
  };
  const { invalidTokens } = await push.send(
    tokens.docs.map((doc) => String(doc.get('token'))),
    payload,
  );
  // 04 §2.24b — tokens FCM no longer knows are removed.
  await Promise.all(
    invalidTokens.map((token) =>
      db.doc(`users/${input.uid}/pushTokens/${tokenId(token)}`).delete(),
    ),
  );
  return { pushed: invalidTokens.length < tokens.size };
}

/** FR-70 — stores (or refreshes) a token of this browser. */
export async function registerPushToken(
  db: Firestore,
  uid: string,
  token: string,
  userAgent: string,
): Promise<void> {
  const ref = db.doc(`users/${uid}/pushTokens/${tokenId(token)}`);
  const timestamp = FieldValue.serverTimestamp();
  const existing = await ref.get();
  await ref.set(
    {
      token,
      platform: 'web',
      userAgent: userAgent.slice(0, 200),
      lastSeenAt: timestamp,
      ...(existing.exists ? {} : { createdAt: timestamp }),
    },
    { merge: true },
  );
}

export async function unregisterPushToken(
  db: Firestore,
  uid: string,
  token: string,
): Promise<void> {
  await db.doc(`users/${uid}/pushTokens/${tokenId(token)}`).delete();
}

/** FR-46 — marks every unread notification as read. */
export async function markAllRead(db: Firestore, uid: string, now: Date): Promise<number> {
  const unread = await db
    .collection(`notifications/${uid}/items`)
    .where('readAt', '==', null)
    .limit(500)
    .get();
  const batch = db.batch();
  for (const doc of unread.docs) batch.update(doc.ref, { readAt: Timestamp.fromDate(now) });
  await batch.commit();
  return unread.size;
}
