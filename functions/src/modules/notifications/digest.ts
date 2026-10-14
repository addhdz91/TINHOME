import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { publicUrl } from '../../core/public-url.js';
import type { PushSender } from './push.js';
import { notify } from './service.js';

const HOUR_MS = 3_600_000;
const UNREAD_AFTER_MS = 2 * HOUR_MS;
const DIGEST_EVERY_MS = 6 * HOUR_MS;
const LOOKBACK_MS = 26 * HOUR_MS;

function millis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

/**
 * J-13 / N-20 — e-mail summary when messages are still unread 2 h later and no push reached the
 * person since; at most one every 6 h per chat. Only chats with activity in the last 26 h are
 * looked at.
 */
export async function sendUnreadDigests(
  db: Firestore,
  push: PushSender,
  now: Date,
): Promise<number> {
  const recent = await db
    .collection('matches')
    .where('status', '==', 'ACTIVE')
    .where('lastActivityAt', '>=', Timestamp.fromMillis(now.getTime() - LOOKBACK_MS))
    .get();
  let sent = 0;
  for (const match of recent.docs) {
    const participants = match.get('participants') as string[];
    const unread = (match.get('unread') ?? {}) as Record<string, number>;
    const since = (match.get('unreadSince') ?? {}) as Record<string, unknown>;
    const pushedAt = (match.get('pushedAt') ?? {}) as Record<string, unknown>;
    const digestAt = (match.get('digestAt') ?? {}) as Record<string, unknown>;
    for (const uid of participants) {
      const count = unread[uid] ?? 0;
      const unreadSince = millis(since[uid]);
      if (count === 0 || unreadSince === null) continue;
      if (now.getTime() - unreadSince < UNREAD_AFTER_MS) continue;
      const pushed = millis(pushedAt[uid]);
      if (pushed !== null && pushed >= unreadSince) continue;
      const lastDigest = millis(digestAt[uid]);
      if (lastDigest !== null && now.getTime() - lastDigest < DIGEST_EVERY_MS) continue;
      const other = participants.find((p) => p !== uid) ?? '';
      const profile = await db.doc(`publicProfiles/${other}`).get();
      const otherName = String(profile.get('displayName') ?? 'Tu match');
      const link = `/app/chats/${match.id}`;
      await notify(
        db,
        push,
        {
          uid,
          type: 'N-20',
          title: `${otherName} te ha escrito`,
          body: 'Tienes mensajes sin leer.',
          link,
          inApp: false,
          mail: {
            templateId: 'N-20',
            data: { otherName, count, url: `${publicUrl()}${link}` },
          },
        },
        now,
      );
      await match.ref.update({ [`digestAt.${uid}`]: Timestamp.fromDate(now) });
      sent += 1;
    }
  }
  return sent;
}

/** J-06 / N-06 — daily digest of the likes received in the last 24 h (one per person). */
export async function sendLikesDigests(
  db: Firestore,
  push: PushSender,
  now: Date,
): Promise<number> {
  const likes = await db
    .collection('likes')
    .where('createdAt', '>=', Timestamp.fromMillis(now.getTime() - 24 * HOUR_MS))
    .select('toUid')
    .get();
  const counts = new Map<string, number>();
  for (const like of likes.docs) {
    const to = String(like.get('toUid'));
    counts.set(to, (counts.get(to) ?? 0) + 1);
  }
  for (const [uid, count] of counts) {
    const link = '/app/me-gusta';
    const people = count === 1 ? '1 persona quiere' : `${String(count)} personas quieren`;
    await notify(
      db,
      push,
      {
        uid,
        type: 'N-06',
        title: `${people} intercambiar contigo`,
        body: 'Entra para descubrir quién.',
        link,
        mail: { templateId: 'N-06', data: { count, url: `${publicUrl()}${link}` } },
      },
      now,
    );
  }
  return counts.size;
}
