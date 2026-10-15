import { getAuth } from 'firebase-admin/auth';
import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import {
  ADMIN_ROLES,
  type AdminRole,
  type IdentityStatus,
  type PremiumSource,
  type UserStatus,
} from '@tinhome/shared/constants';
import type { AdminGetUserOutput, StatementInput, UserAdminSummary } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { actionView } from '../moderation/appeals.js';
import { moderate, type Actor } from '../moderation/moderate.js';
import { recomputePremium } from '../premium/entitlements.js';

const DAY_MS = 86_400_000;

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

async function roleOf(uid: string): Promise<AdminRole | null> {
  const user = await getAuth()
    .getUser(uid)
    .catch(() => null);
  const role = user?.customClaims?.role as unknown;
  return ADMIN_ROLES.find((r) => r === role) ?? null;
}

async function summary(db: Firestore, snap: DocumentSnapshot): Promise<UserAdminSummary> {
  const profile = await db.doc(`publicProfiles/${snap.id}`).get();
  const verification = (snap.get('verification') ?? {}) as { identity?: IdentityStatus };
  return {
    uid: snap.id,
    displayName: String(profile.get('displayName') ?? snap.get('firstName') ?? snap.id),
    email: (snap.get('email') as string | undefined) ?? null,
    phoneE164: (snap.get('phoneE164') as string | undefined) ?? null,
    cityId: (snap.get('cityId') as string | undefined) ?? null,
    status: (snap.get('status') as UserStatus | undefined) ?? 'ACTIVE',
    identity: verification.identity ?? 'NONE',
    premiumUntil: iso(snap.get('premiumUntil')),
    premiumSource: (snap.get('premiumSource') as PremiumSource | null | undefined) ?? null,
    role: await roleOf(snap.id),
    createdAt: iso(snap.get('createdAt')),
  };
}

/**
 * FR-50 — search by e-mail, phone (+34…) or first name (prefix, case as written). Results
 * are capped (no full-text index in Firestore; 10_DECISIONS §5, M9).
 */
export async function searchUsers(
  db: Firestore,
  input: { q: string; cursor?: string | undefined; limit: number },
): Promise<{ items: UserAdminSummary[]; nextCursor: string | null }> {
  const q = input.q.trim();
  const users = db.collection('users');
  let snaps;
  if (q.includes('@')) snaps = await users.where('email', '==', q.toLowerCase()).limit(20).get();
  else if (/^\+?\d{6,}$/.test(q)) {
    const phone = q.startsWith('+') ? q : `+34${q}`;
    snaps = await users.where('phoneE164', '==', phone).limit(20).get();
  } else {
    // As typed and capitalised (names are stored as written).
    const prefixes = [...new Set([q, q.charAt(0).toUpperCase() + q.slice(1)])];
    const results = await Promise.all(
      prefixes.map((prefix) =>
        users
          .where('firstName', '>=', prefix)
          .where('firstName', '<', `${prefix}\uf8ff`)
          .limit(100)
          .get(),
      ),
    );
    const seen = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const result of results) for (const doc of result.docs) seen.set(doc.id, doc);
    snaps = { docs: [...seen.values()], size: seen.size };
  }
  const offset = input.cursor ? Number(input.cursor) : 0;
  const page = snaps.docs.slice(offset, offset + input.limit);
  const next = offset + input.limit;
  return {
    items: await Promise.all(page.map((snap) => summary(db, snap))),
    nextCursor: next < snaps.size ? String(next) : null,
  };
}

/** FR-50 — full record: states, home, verification, matches, reports, rights, audit. */
export async function getUser(
  db: Firestore,
  uid: string,
  params: Params,
  now: Date,
): Promise<AdminGetUserOutput> {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  const [home, matches, reports, actions, strikes, entitlements, audit] = await Promise.all([
    db.doc(`homes/${uid}`).get(),
    db.collection('matches').where('participants', 'array-contains', uid).count().get(),
    db
      .collection('reports')
      .where('targetUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
    db
      .collection('moderationActions')
      .where('targetUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
    db
      .collection('strikes')
      .where('uid', '==', uid)
      .where('expiresAt', '>', Timestamp.fromDate(now))
      .get(),
    db.collection('entitlements').where('uid', '==', uid).get(),
    db
      .collection('auditLog')
      .where('targetId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
  ]);
  const hold = home.get('moderationHold') as
    { active?: boolean; reason?: string } | null | undefined;
  return {
    user: {
      ...(await summary(db, snap)),
      strikesActive: (snap.get('strikesActive') as number | undefined) ?? 0,
      suspendedUntil: iso(snap.get('suspendedUntil')),
      onboardingStep: (snap.get('onboarding') as { step?: number } | undefined)?.step ?? 1,
    },
    home: home.exists
      ? {
          title: String(home.get('title') ?? ''),
          status: (home.get('status') as string | undefined) ?? 'DRAFT',
          visible: home.get('visible') === true,
          hold: hold?.active ? (hold.reason ?? '') : null,
          hiddenByModeration: home.get('hiddenByModeration') === true,
        }
      : null,
    matchesCount: matches.data().count,
    reports: reports.docs.map((doc) => ({
      id: doc.id,
      reason: String(doc.get('reason')),
      status: String(doc.get('status')),
      createdAt: iso(doc.get('createdAt')) ?? '',
    })),
    actions: await Promise.all(actions.docs.map((doc) => actionView(db, doc, params, now))),
    strikes: strikes.docs
      .filter((doc) => !doc.get('revokedAt'))
      .map((doc) => ({
        id: doc.id,
        reason: String(doc.get('reason')),
        severity: doc.get('severity') === 'SERIOUS' ? 'SERIOUS' : 'MINOR',
        createdAt: iso(doc.get('createdAt')) ?? '',
        expiresAt: iso(doc.get('expiresAt')) ?? '',
      })),
    entitlements: entitlements.docs.map((doc) => ({
      id: doc.id,
      source: doc.get('source') as PremiumSource,
      startsAt: iso(doc.get('startsAt')) ?? '',
      endsAt: iso(doc.get('endsAt')) ?? '',
      revoked: Boolean(doc.get('revokedAt')),
      reason: (doc.get('reason') as string | undefined) ?? null,
    })),
    audit: audit.docs.map((doc) => ({
      id: doc.id,
      actorUid: String(doc.get('actorUid')),
      actorRole: String(doc.get('actorRole')),
      action: String(doc.get('action')),
      targetType: String(doc.get('targetType')),
      targetId: String(doc.get('targetId')),
      reason: (doc.get('reason') as string | undefined) ?? null,
      createdAt: iso(doc.get('createdAt')),
    })),
  };
}

/** FR-50 — grants N days of Premium from the end of the current chain (audited). */
export async function grantPremium(
  db: Firestore,
  actor: Actor,
  input: { uid: string; days: number; reason: string },
  now: Date,
): Promise<{ premiumUntil: string | null }> {
  const user = await db.doc(`users/${input.uid}`).get();
  if (!user.exists) throw appError('E_NOT_FOUND');
  const until = user.get('premiumUntil') as Timestamp | null | undefined;
  const start = until && until.toMillis() > now.getTime() ? until.toDate() : now;
  const ref = await db.collection('entitlements').add({
    uid: input.uid,
    source: 'ADMIN',
    startsAt: Timestamp.fromDate(start),
    endsAt: Timestamp.fromMillis(start.getTime() + input.days * DAY_MS),
    reason: input.reason,
    grantedBy: actor.uid,
    revokedAt: null,
  });
  const premiumUntil = await recomputePremium(db, input.uid, now);
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: 'premium.grant',
    targetType: 'user',
    targetId: input.uid,
    after: { entitlementId: ref.id, days: input.days },
    reason: input.reason,
  });
  return { premiumUntil: premiumUntil?.toISOString() ?? null };
}

/** FR-50 — suspend, ban or reactivate through the moderation flow (statement, e-mail, audit). */
export async function setUserStatus(
  db: Firestore,
  actor: Actor,
  input: {
    uid: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
    suspendedUntil?: string | undefined;
    statement?: StatementInput | undefined;
  },
  params: Params,
  now: Date,
): Promise<void> {
  const action =
    input.status === 'ACTIVE' ? 'RESTORE' : input.status === 'SUSPENDED' ? 'SUSPEND' : 'BAN';
  await moderate(
    db,
    actor,
    {
      targetType: 'USER',
      targetId: input.uid,
      targetUid: input.uid,
      action,
      ...(input.suspendedUntil ? { suspendedUntil: input.suspendedUntil } : {}),
      ...(input.statement ? { statement: input.statement } : {}),
    },
    params,
    now,
  );
}

/** FR-48 — roles only by a superadmin; keeps the N-26 directory in sync (audited). */
export async function setRole(
  db: Firestore,
  actor: Actor,
  input: { uid: string; role: AdminRole | null },
): Promise<void> {
  if (input.uid === actor.uid) throw appError('E_VALIDATION', { fields: { uid: 'self' } });
  const user = await getAuth()
    .getUser(input.uid)
    .catch(() => null);
  if (!user) throw appError('E_NOT_FOUND');
  const before = (user.customClaims?.role as string | undefined) ?? null;
  await getAuth().setCustomUserClaims(input.uid, { ...user.customClaims, role: input.role });
  // The old role lives in the person's current tokens: end those sessions (they sign in again).
  await getAuth().revokeRefreshTokens(input.uid);
  const directory = db.doc(`adminDirectory/${input.uid}`);
  if (input.role && user.email) await directory.set({ email: user.email, role: input.role });
  else await directory.delete();
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: 'user.role',
    targetType: 'user',
    targetId: input.uid,
    before: { role: before },
    after: { role: input.role },
  });
}
