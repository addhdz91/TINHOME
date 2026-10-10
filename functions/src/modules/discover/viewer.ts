import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { ViewerSide } from '@tinhome/shared/domain';
import { toIsoDate } from '@tinhome/shared/domain';
import type { Me } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { db } from '../../core/firebase.js';
import { requireAuth, requireEmailVerified } from '../../core/guards.js';
import { getParams } from '../../core/params.js';
import { buildMe, type SessionInfo } from '../account/me.js';

export interface Viewer {
  uid: string;
  me: Me;
  side: ViewerSide;
  isPremium: boolean;
  /** BR-14 noise seed: viewer + day, so the order varies daily without flickering. */
  seed: string;
  /** Owners blocked in either direction (BR-10): never shown. */
  blockedUids: Set<string>;
  /** Owners the viewer already liked (homes are keyed by their owner's uid). */
  likedUids: Set<string>;
  /** Homes passed in the last P-03 days (BR-11). */
  passedHomeIds: Set<string>;
  /** Owners who liked the viewer's home (ranking factor `leGusto`). */
  likedYouUids: Set<string>;
  /** FR-61 — message that came with those likes, by owner. */
  likeMessages: Map<string, string>;
}

/** Everything Discover, Explore and the detail need to know about who is looking. */
export async function loadViewer(
  db: Firestore,
  session: SessionInfo,
  params: Params,
  now: Date,
): Promise<Viewer> {
  const uid = session.uid;
  const [me, homeSnap, userSnap, sent, received, blocking, blockedBy, passes] = await Promise.all([
    buildMe(db, session, params, now),
    db.doc(`homes/${uid}`).get(),
    db.doc(`users/${uid}`).get(),
    db.collection('likes').where('fromUid', '==', uid).select('toUid').get(),
    db.collection('likes').where('toUid', '==', uid).select('fromUid', 'message').get(),
    db.collection('blocks').where('blockerUid', '==', uid).select('blockedUid').get(),
    db.collection('blocks').where('blockedUid', '==', uid).select('blockerUid').get(),
    db
      .collection('passes')
      .where('uid', '==', uid)
      .where('expiresAt', '>', Timestamp.fromDate(now))
      .select('homeId')
      .get(),
  ]);
  const home = homeSnap.data();
  return {
    uid,
    me,
    side: {
      cityId: String(home?.cityId ?? userSnap.get('cityId') ?? ''),
      destinations: (home?.destinations as ViewerSide['destinations'] | undefined) ?? null,
      availability: (home?.availability as ViewerSide['availability'] | undefined) ?? null,
      travelers: (home?.travelers as ViewerSide['travelers'] | undefined) ?? null,
    },
    isPremium: me.premium.active,
    seed: `${uid}|${toIsoDate(now)}`,
    blockedUids: new Set([
      ...blocking.docs.map((d) => String(d.get('blockedUid'))),
      ...blockedBy.docs.map((d) => String(d.get('blockerUid'))),
    ]),
    likedUids: new Set(sent.docs.map((d) => String(d.get('toUid')))),
    passedHomeIds: new Set(passes.docs.map((d) => String(d.get('homeId')))),
    likedYouUids: new Set(received.docs.map((d) => String(d.get('fromUid')))),
    likeMessages: new Map(
      received.docs.flatMap((d) => {
        const message = d.get('message') as string | null | undefined;
        return message ? [[String(d.get('fromUid')), message] as const] : [];
      }),
    ),
  };
}

/** Guards `A, EV` and the session of a callable request. */
export function sessionOf(request: CallableRequest): SessionInfo {
  const auth = requireAuth(request);
  requireEmailVerified(auth);
  return {
    uid: auth.uid,
    email: typeof request.auth?.token.email === 'string' ? request.auth.token.email : '',
    emailVerified: auth.emailVerified,
    role: auth.role,
  };
}

/** Guards `A, EV` and the viewer context of a callable request. */
export async function viewerOf(request: CallableRequest, now: Date): Promise<Viewer> {
  return loadViewer(db(), sessionOf(request), await getParams(), now);
}
