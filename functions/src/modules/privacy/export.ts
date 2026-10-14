import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { appError } from '../../core/app-error.js';
import { bucket } from '../../core/storage.js';
import { requireRecentSignIn } from '../account/service.js';
import { isEmulated } from '../premium/gateway.js';

const EXPORT_TTL_MS = 15 * 60_000;
const MAX_MESSAGES = 5000;
/** Internal security fields that are not personal data of the requester (hashes, tokens). */
const INTERNAL_KEYS = new Set(['docHash', 'docHashes', 'tokenHash', 'token', 'countedCityId']);

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Firestore values → JSON (timestamps as ISO 8601, internal fields left out). */
export function toJson(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJson);
  if (typeof value === 'object') {
    const out: Record<string, Json> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (!INTERNAL_KEYS.has(key)) out[key] = toJson(inner);
    }
    return out;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  return null;
}

async function docs(query: FirebaseFirestore.Query): Promise<Json[]> {
  const snap = await query.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(toJson(doc.data()) as Record<string, Json>) }));
}

async function one(db: Firestore, path: string): Promise<Json> {
  const snap = await db.doc(path).get();
  return snap.exists ? toJson(snap.data()) : null;
}

/**
 * FR-59 — everything TinHome keeps about the requester, in JSON. Messages: only those they
 * wrote (the other person's messages are their data). Identity documents are not included:
 * they are erased 30 days after review and only their status is kept.
 */
export async function collectMyData(db: Firestore, uid: string, now: Date) {
  const matches = await db.collection('matches').where('participants', 'array-contains', uid).get();
  const messages: Json[] = [];
  for (const match of matches.docs) {
    if (messages.length >= MAX_MESSAGES) break;
    const mine = await match.ref
      .collection('messages')
      .where('senderUid', '==', uid)
      .limit(MAX_MESSAGES - messages.length)
      .get();
    for (const message of mine.docs)
      messages.push({ matchId: match.id, id: message.id, ...(toJson(message.data()) as object) });
  }
  const by = (collection: string, field: string) =>
    docs(db.collection(collection).where(field, '==', uid).limit(1000));
  const [user, profile, home, subscription] = await Promise.all([
    one(db, `users/${uid}`),
    one(db, `publicProfiles/${uid}`),
    one(db, `homes/${uid}`),
    one(db, `subscriptions/${uid}`),
  ]);
  return {
    generatedAt: now.toISOString(),
    format: 'TinHome export v1',
    account: user,
    publicProfile: profile,
    home,
    likesSent: await by('likes', 'fromUid'),
    blocks: await by('blocks', 'blockerUid'),
    matches: matches.docs.map((doc) => ({
      id: doc.id,
      status: toJson(doc.get('status')),
      createdAt: toJson(doc.get('createdAt')),
      closedAt: toJson(doc.get('closedAt')),
    })),
    messagesSent: messages,
    exchanges: await docs(
      db.collection('exchanges').where('participants', 'array-contains', uid).limit(500),
    ),
    reviewsWritten: await by('reviews', 'authorUid'),
    reviewsReceived: await by('reviews', 'targetUid'),
    verifications: (await by('verifications', 'uid')).map((item) => {
      const { files: _files, ...rest } = item as Record<string, Json>;
      return rest;
    }),
    locationChecks: await by('locationChecks', 'uid'),
    legalAcceptances: await by('legalAcceptances', 'uid'),
    subscription,
    entitlements: await by('entitlements', 'uid'),
    referrals: await by('referrals', 'inviterUid'),
    notifications: await docs(db.collection(`notifications/${uid}/items`).limit(1000)),
    reportsFiled: await by('reports', 'reporterUid'),
    moderationDecisions: await by('moderationActions', 'targetUid'),
    strikes: await by('strikes', 'uid'),
    appeals: await by('appeals', 'uid'),
    complaints: await by('supportTickets', 'uid'),
    gdprRequests: await by('gdprRequests', 'uid'),
  };
}

/**
 * FR-59 — `exportMyData` (A, re-authenticated): JSON behind a signed URL for 15 minutes
 * (emulator: a `data:` URL). Registered as a completed ACCESS request.
 */
export async function exportMyData(
  db: Firestore,
  uid: string,
  authTime: number | undefined,
  now: Date,
): Promise<{ url: string; expiresAt: string }> {
  requireRecentSignIn(authTime, now);
  const user = await db.doc(`users/${uid}`).get();
  if (!user.exists) throw appError('E_NOT_FOUND');
  const json = JSON.stringify(await collectMyData(db, uid, now), null, 2);
  const expires = new Date(now.getTime() + EXPORT_TTL_MS);
  const path = `private/exports/gdpr/${uid}/${String(now.getTime())}.json`;
  await db.collection('gdprRequests').add({
    uid,
    type: 'ACCESS',
    details: 'Descarga de mis datos (automática)',
    status: 'DONE',
    dueAt: Timestamp.fromDate(now),
    createdAt: Timestamp.fromDate(now),
    closedAt: Timestamp.fromDate(now),
    note: null,
    exportPath: isEmulated() ? null : path,
  });
  if (isEmulated()) {
    return {
      url: `data:application/json;charset=utf-8;base64,${Buffer.from(json).toString('base64')}`,
      expiresAt: expires.toISOString(),
    };
  }
  const file = bucket().file(path);
  await file.save(json, { contentType: 'application/json; charset=utf-8' });
  const [url] = await file.getSignedUrl({ version: 'v4', action: 'read', expires });
  return { url, expiresAt: expires.toISOString() };
}
