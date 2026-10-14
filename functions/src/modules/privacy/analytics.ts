import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { AnalyticsEvent } from '@tinhome/shared/constants';
import { sanitizeEventProps } from '@tinhome/shared/domain';
import { sha256Hex } from '../../core/crypto.js';

const TTL_DAYS = 400;
const DAY_MS = 86_400_000;

/**
 * 03 §6 — own analytics: closed list of events, pseudonymous `uidHash`, properties without
 * personal data, TTL of 400 days (`expiresAt`). No third-party tracking.
 */
export async function trackEvent(
  db: Firestore,
  uid: string,
  input: { name: AnalyticsEvent; props?: Record<string, string | number | boolean> | undefined },
  now: Date,
): Promise<void> {
  const user = await db.doc(`users/${uid}`).get();
  const cityId = user.get('cityId') as string | undefined;
  await db.collection('events').add({
    name: input.name,
    uidHash: sha256Hex(`event:${uid}`).slice(0, 24),
    ...(cityId ? { cityId } : {}),
    props: sanitizeEventProps(input.props),
    createdAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromMillis(now.getTime() + TTL_DAYS * DAY_MS),
  });
}
