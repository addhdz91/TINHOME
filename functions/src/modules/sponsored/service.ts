import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import type { z } from 'zod/mini';
import {
  SPONSORED_PLACEMENTS,
  type PartnerCategory,
  type SponsoredPlacement,
} from '@tinhome/shared/constants';
import {
  isPremiumActive,
  pickSponsored,
  sponsoredClickPath,
  toIsoDate,
  withUtmSource,
  type PartnerCandidate,
} from '@tinhome/shared/domain';
import type { AdminUpsertPartnerInput, PartnerView } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { consumeRateLimit } from '../../core/rate-limit.js';
import type { Actor } from '../moderation/moderate.js';

const DAY_MS = 86_400_000;
const LABEL = 'Patrocinado' as const;

type UpsertInput = z.output<typeof AdminUpsertPartnerInput>;

interface PartnerRecord extends PartnerCandidate {
  title: string;
  text: string;
  logoUrl: string;
}

function date(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function toRecord(snap: DocumentSnapshot): PartnerRecord {
  return {
    id: snap.id,
    category: snap.get('category') as PartnerCategory,
    cityIds: (snap.get('cityIds') as string[] | null | undefined) ?? null,
    placements: ((snap.get('placements') as string[] | undefined) ?? []).filter(
      (p): p is SponsoredPlacement => (SPONSORED_PLACEMENTS as readonly string[]).includes(p),
    ),
    active: snap.get('active') === true,
    startsAt: date(snap.get('startsAt')),
    endsAt: date(snap.get('endsAt')),
    title: String(snap.get('title') ?? ''),
    text: String(snap.get('text') ?? ''),
    logoUrl: String(snap.get('logoUrl') ?? ''),
  };
}

/**
 * BR-28 — one labelled card for this screen, or none. The deck interstitial is only for free
 * users; the city defaults to the viewer's home (or profile) city.
 */
export async function getSponsored(
  db: Firestore,
  uid: string,
  input: { placement: SponsoredPlacement; cityId?: string | undefined },
  params: Params,
  now: Date,
): Promise<{
  card: {
    partnerId: string;
    title: string;
    text: string;
    logoUrl: string;
    clickUrl: string;
    label: typeof LABEL;
  } | null;
}> {
  const [user, home, partners] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`homes/${uid}`).get(),
    db.collection('partners').where('active', '==', true).limit(100).get(),
  ]);
  const premiumUntil = user.get('premiumUntil') as Timestamp | null | undefined;
  const cityId =
    input.cityId ??
    (home.get('cityId') as string | undefined) ??
    (user.get('cityId') as string | undefined) ??
    null;
  const picked = pickSponsored(
    partners.docs.map(toRecord),
    {
      placement: input.placement,
      cityId,
      isPremium: isPremiumActive(premiumUntil?.toDate() ?? null, now),
      insuranceEnabled: params.sponsoredInsuranceEnabled,
      now,
    },
    `${uid}|${toIsoDate(now)}`,
  );
  if (!picked) return { card: null };
  return {
    card: {
      partnerId: picked.id,
      title: picked.title,
      text: picked.text,
      logoUrl: picked.logoUrl,
      clickUrl: sponsoredClickPath(picked.id, input.placement),
      label: LABEL,
    },
  };
}

function iso(value: unknown): string | null {
  return date(value)?.toISOString() ?? null;
}

async function view(db: Firestore, snap: DocumentSnapshot, now: Date): Promise<PartnerView> {
  const clicks = await db
    .collection('partnerClicks')
    .where('partnerId', '==', snap.id)
    .where('createdAt', '>=', Timestamp.fromMillis(now.getTime() - 30 * DAY_MS))
    .count()
    .get();
  const record = toRecord(snap);
  return {
    id: snap.id,
    name: String(snap.get('name') ?? ''),
    category: record.category,
    title: record.title,
    text: record.text,
    logoUrl: record.logoUrl,
    targetUrl: String(snap.get('targetUrl') ?? ''),
    cityIds: record.cityIds,
    placements: record.placements,
    active: record.active,
    startsAt: iso(snap.get('startsAt')),
    endsAt: iso(snap.get('endsAt')),
    clicks30d: clicks.data().count,
  };
}

/** FR-47 — SADM; insurance partners are rejected while P-26 is false (audited). */
export async function upsertPartner(
  db: Firestore,
  actor: Actor,
  input: UpsertInput,
  params: Params,
  now: Date,
): Promise<{ partner: PartnerView }> {
  if (input.category === 'TRAVEL_INSURANCE' && !params.sponsoredInsuranceEnabled) {
    throw appError('E_VALIDATION', { fields: { category: 'legal_pending' } });
  }
  const ref = input.id ? db.doc(`partners/${input.id}`) : db.collection('partners').doc();
  const before = await ref.get();
  if (input.id && !before.exists) throw appError('E_NOT_FOUND');
  const data = {
    name: input.name,
    category: input.category,
    title: input.title,
    text: input.text,
    logoUrl: input.logoUrl,
    targetUrl: input.targetUrl,
    cityIds: input.cityIds && input.cityIds.length > 0 ? input.cityIds : null,
    placements: [...new Set(input.placements)],
    active: input.active,
    startsAt: input.startsAt ? Timestamp.fromDate(new Date(input.startsAt)) : null,
    endsAt: input.endsAt ? Timestamp.fromDate(new Date(input.endsAt)) : null,
    updatedAt: Timestamp.fromDate(now),
    ...(before.exists ? {} : { createdAt: Timestamp.fromDate(now) }),
  };
  await ref.set(data, { merge: true });
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: before.exists ? 'partner.update' : 'partner.create',
    targetType: 'partner',
    targetId: ref.id,
    ...(before.exists
      ? { before: { active: before.get('active') as boolean, name: before.get('name') as string } }
      : {}),
    after: { active: data.active, name: data.name, placements: data.placements },
  });
  return { partner: await view(db, await ref.get(), now) };
}

export async function listPartners(db: Firestore, now: Date): Promise<{ items: PartnerView[] }> {
  const partners = await db.collection('partners').orderBy('name').limit(200).get();
  return { items: await Promise.all(partners.docs.map((snap) => view(db, snap, now))) };
}

/** Counted clicks per IP and partner and hour. */
export const CLICKS_PER_HOUR = 5;

/**
 * 05 §2.15 — counts the click (no cookies, no uid: `uidHash` is left out on purpose) and
 * returns the destination with `utm_source=tinhome`, or null for an unknown/inactive partner.
 */
export async function recordClick(
  db: Firestore,
  partnerId: string,
  placement: string | undefined,
  now: Date,
  ip = 'unknown',
): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(partnerId)) return null;
  const snap = await db.doc(`partners/${partnerId}`).get();
  const targetUrl = snap.get('targetUrl') as string | undefined;
  if (!snap.exists || snap.get('active') !== true || !targetUrl) return null;
  const known = SPONSORED_PLACEMENTS.find((p) => p === placement);
  // Anti-fraud: the person is always redirected, but only CLICKS_PER_HOUR clicks per IP and
  // partner are counted (a loop of requests must not inflate the partner's report).
  const counted = await consumeRateLimit(db, {
    scope: 'partnerClick',
    key: `${ip}|${partnerId}`,
    limit: CLICKS_PER_HOUR,
    windowMs: 3_600_000,
    now,
  }).then(
    () => true,
    () => false,
  );
  if (counted)
    await db.collection('partnerClicks').add({
      partnerId,
      placement: known ?? 'UNKNOWN',
      createdAt: Timestamp.fromDate(now),
    });
  try {
    return withUtmSource(targetUrl);
  } catch {
    return null;
  }
}
