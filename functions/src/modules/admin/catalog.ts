import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { toPublicConfig } from '@tinhome/shared/constants';
import {
  ParamsSchema,
  type AdminUpsertCityInput,
  type AdminUpsertWindowInput,
} from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { enqueueMailNow } from '../../core/email/queue.js';
import { invalidateParams } from '../../core/params.js';
import { publicUrl } from '../../core/public-url.js';
import type { Actor } from '../moderation/moderate.js';
import { resolvePushSender } from '../notifications/push.js';
import { notify } from '../notifications/service.js';

const EMPTY_COUNTERS = { visibleCandidates: 0, waitlist: 0, foundersAwarded: 0 };

export async function catalog(db: Firestore) {
  const [cities, windows] = await Promise.all([
    db.collection('cities').orderBy('order').get(),
    db.collection('windows').orderBy('order').get(),
  ]);
  return {
    cities: cities.docs.map((doc) => ({
      id: doc.id,
      name: String(doc.get('name')),
      province: String(doc.get('province') ?? ''),
      region: String(doc.get('region') ?? ''),
      timezone:
        doc.get('timezone') === 'Atlantic/Canary'
          ? ('Atlantic/Canary' as const)
          : ('Europe/Madrid' as const),
      center: doc.get('center') as { lat: number; lng: number },
      radiusKm: Number(doc.get('radiusKm') ?? 25),
      status: doc.get('status') as AdminUpsertCityInput['status'],
      openThreshold: Number(doc.get('openThreshold') ?? 1),
      order: Number(doc.get('order') ?? 0),
      counters: {
        ...EMPTY_COUNTERS,
        ...((doc.get('counters') ?? {}) as Partial<typeof EMPTY_COUNTERS>),
      },
    })),
    windows: windows.docs.map((doc) => ({
      id: doc.id,
      name: String(doc.get('name')),
      startDate: String(doc.get('startDate')),
      endDate: String(doc.get('endDate')),
      active: doc.get('active') === true,
      cityIds: (doc.get('cityIds') as string[] | null | undefined) ?? null,
      order: Number(doc.get('order') ?? 0),
    })),
  };
}

/** N-05 — users of the city (in-app + e-mail) and confirmed waitlist entries (e-mail). */
async function announceCityOpen(db: Firestore, cityId: string, cityName: string, now: Date) {
  const url = `${publicUrl()}/entrar`;
  const users = await db.collection('users').where('cityId', '==', cityId).limit(5000).get();
  const notified = new Set<string>();
  for (const user of users.docs) {
    await notify(
      db,
      resolvePushSender(publicUrl()),
      {
        uid: user.id,
        type: 'N-05',
        title: `TinHome ya está abierto en ${cityName}`,
        body: 'Ya puedes descubrir casas y hacer match.',
        link: '/app/descubrir',
        mail: { templateId: 'N-05', data: { cityName, url } },
      },
      now,
    );
    const email = user.get('email') as string | undefined;
    if (email) notified.add(email);
  }
  const waitlist = await db
    .collection('waitlist')
    .where('cityId', '==', cityId)
    .where('status', '==', 'CONFIRMED')
    .limit(5000)
    .get();
  for (const entry of waitlist.docs) {
    const email = entry.get('email') as string | undefined;
    if (!email || notified.has(email)) continue;
    await enqueueMailNow(db, { to: email, templateId: 'N-05', data: { cityName, url } }, now);
  }
}

/** FR-51 — creates or edits a city (SADM). Counters are never written here. */
export async function upsertCity(
  db: Firestore,
  actor: Actor,
  input: AdminUpsertCityInput,
  now: Date,
) {
  const ref = db.doc(`cities/${input.id}`);
  const before = await ref.get();
  const { id, ...data } = input;
  await ref.set(
    {
      ...data,
      ...(before.exists ? {} : { counters: EMPTY_COUNTERS }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const opened = before.exists && before.get('status') !== 'OPEN' && input.status === 'OPEN';
  if (opened) await announceCityOpen(db, id, input.name, now);
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: before.exists ? 'city.update' : 'city.create',
    targetType: 'city',
    targetId: id,
    before: before.exists ? { status: before.get('status') as string } : {},
    after: { status: input.status },
  });
}

export async function upsertWindow(db: Firestore, actor: Actor, input: AdminUpsertWindowInput) {
  const ref = db.doc(`windows/${input.id}`);
  const before = await ref.get();
  const { id, ...data } = input;
  await ref.set({ ...data, updatedAt: FieldValue.serverTimestamp() });
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: before.exists ? 'window.update' : 'window.create',
    targetType: 'window',
    targetId: id,
  });
}

/** FR-52 — edits P-xx (validated as a whole) and mirrors the public subset (SADM, audited). */
export async function updateParams(
  db: Firestore,
  actor: Actor,
  input: { [K in keyof Params]?: Params[K] | undefined },
  current: Params,
): Promise<Params> {
  const changes = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<Params>;
  if (changes.sponsoredInsuranceEnabled === true && !current.sponsoredInsuranceEnabled) {
    // P-26 stays off until the legal validation (LEG-04): not editable from the panel.
    throw appError('E_VALIDATION', { fields: { sponsoredInsuranceEnabled: 'legal_pending' } });
  }
  const parsed = ParamsSchema.safeParse({ ...current, ...changes });
  if (!parsed.success) throw appError('E_VALIDATION', { fields: { params: 'invalid' } });
  const next = parsed.data;
  await db.doc('config/params').set({ ...next, updatedAt: FieldValue.serverTimestamp() });
  await db
    .doc('config/public')
    .set({ ...toPublicConfig(next), updatedAt: FieldValue.serverTimestamp() });
  invalidateParams();
  const changed = Object.keys(changes).filter(
    (key) =>
      JSON.stringify(current[key as keyof Params]) !== JSON.stringify(next[key as keyof Params]),
  );
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: 'params.update',
    targetType: 'config',
    targetId: 'params',
    before: Object.fromEntries(changed.map((key) => [key, current[key as keyof Params]])),
    after: Object.fromEntries(changed.map((key) => [key, next[key as keyof Params]])),
  });
  return next;
}
