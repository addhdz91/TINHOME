import { FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { DECLARATION_SLUG } from '@tinhome/shared/constants';
import {
  dhashBands,
  isValidRange,
  missingForPublish,
  toIsoDate,
  truncateIp,
  validateListingText,
} from '@tinhome/shared/domain';
import type { HomeDraftInput, TravelPrefsInput } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { currentLegalVersions } from '../../core/legal.js';
import { bucket } from '../../core/storage.js';
import { loadUser, requirePhoneVerified, requireUserActive } from '../../core/users.js';
import { holdHome } from './holds.js';
import { toOwnerView } from './view.js';
import { recomputeHome } from './visibility.js';

const TEXT_FIELDS = ['title', 'description', 'zone', 'houseRules'] as const;

function snapOrNull(snap: {
  exists: boolean;
  data: () => DocumentData | undefined;
}): DocumentData | null {
  return snap.exists ? (snap.data() ?? null) : null;
}

/** BR-22 on every free-text field; E_TEXT_VIOLATION marks the offending fields. */
function assertTexts(input: HomeDraftInput): void {
  const fields: Record<string, string> = {};
  for (const field of TEXT_FIELDS) {
    const text = input[field];
    if (text === undefined) continue;
    const result = validateListingText(text);
    if (!result.ok) fields[field] = result.error.join(',');
  }
  if (Object.keys(fields).length > 0) throw appError('E_TEXT_VIOLATION', { fields });
}

/** Returns the owner view after recomputing visibility. */
export async function ownerView(db: Firestore, uid: string, params: Params) {
  const state = await recomputeHome(db, uid, params);
  const snap = await db.doc(`homes/${uid}`).get();
  if (!snap.exists || !state) throw appError('E_NOT_FOUND');
  return toOwnerView(uid, snap.data() ?? {}, state);
}

/**
 * FR-10 — creates or updates `homes/{uid}`. A city change on a published home sends it back to
 * review (FR-65) and resets the location check. Completing step 3 advances the onboarding.
 */
export async function upsertHome(
  db: Firestore,
  uid: string,
  input: HomeDraftInput,
  params: Params,
  now: Date,
) {
  const user = await loadUser(db, uid);
  requireUserActive(user);
  assertTexts(input);
  const city = await db.doc(`cities/${input.cityId}`).get();
  if (!city.exists || city.get('status') === 'CLOSED') throw appError('E_CITY_UNKNOWN');

  const ref = db.doc(`homes/${uid}`);
  const cityChanged = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const timestamp = FieldValue.serverTimestamp();
    const defined = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    );
    const data = {
      ...defined,
      ...(input.maxGuests !== undefined || input.petsAllowed !== undefined
        ? {
            searchKeys: {
              capacityBucket:
                input.maxGuests ?? (snapOrNull(snap)?.maxGuests as number | undefined) ?? 0,
              hasPets:
                input.petsAllowed ??
                (snapOrNull(snap)?.petsAllowed as boolean | undefined) ??
                false,
            },
          }
        : {}),
      updatedAt: timestamp,
    };
    if (!snap.exists) {
      tx.create(ref, {
        amenities: [],
        petsAllowed: false,
        houseRules: '',
        ...data,
        ownerUid: uid,
        status: 'DRAFT',
        visible: false,
        complete: false,
        photos: [],
        photoChangeLog: [],
        destinations: null,
        availability: null,
        travelers: null,
        rating: {
          avg: 0,
          count: 0,
          sub: { cleanliness: 0, accuracy: 0, communication: 0, care: 0 },
        },
        isTop: false,
        locationCheck: { status: 'NONE' },
        moderationHold: null,
        ownerPremium:
          user.premiumUntil instanceof Timestamp && user.premiumUntil.toMillis() > now.getTime(),
        ownerFounding: user.foundingMember === true,
        countedCityId: null,
        createdAt: timestamp,
      });
      tx.update(db.doc(`users/${uid}`), { cityId: input.cityId, updatedAt: timestamp });
      return false;
    }
    const previous = snap.get('cityId') as string;
    const changed = previous !== input.cityId;
    tx.update(ref, { ...data, ...(changed ? { locationCheck: { status: 'NONE' } } : {}) });
    if (changed) tx.update(db.doc(`users/${uid}`), { cityId: input.cityId, updatedAt: timestamp });
    return changed && snap.get('status') === 'PUBLISHED';
  });
  if (cityChanged) await holdHome(db, uid, 'CITY_CHANGE', params, now);

  const view = await ownerView(db, uid, params);
  // FR-06 — step 3 is done once the home has its data and the minimum photos.
  if (view.complete && onboardingStep(user) === 3) {
    await db.doc(`users/${uid}`).update({ 'onboarding.step': 4 });
  }
  return view;
}

async function requireHome(db: Firestore, uid: string): Promise<DocumentData> {
  const snap = await db.doc(`homes/${uid}`).get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  return snap.data() ?? {};
}

/** FR-11 — new order; the first photo is the cover. */
export async function reorderPhotos(
  db: Firestore,
  uid: string,
  photoIds: string[],
  params: Params,
) {
  const ref = db.doc(`homes/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw appError('E_NOT_FOUND');
    const photos = (snap.get('photos') as DocumentData[] | undefined) ?? [];
    const ids = photos.map((p) => String(p.id));
    if (photoIds.length !== ids.length || !photoIds.every((id) => ids.includes(id))) {
      throw appError('E_VALIDATION', { fields: { photoIds: 'mismatch' } });
    }
    tx.update(ref, {
      photos: photoIds.map((id, order) => ({ ...photos.find((p) => p.id === id), order })),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return (await ownerView(db, uid, params)).photos;
}

/** FR-11 — deletes a photo (files and duplicate index); a published home keeps ≥ P-25 photos. */
export async function deletePhoto(db: Firestore, uid: string, photoId: string, params: Params) {
  const ref = db.doc(`homes/${uid}`);
  const removed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw appError('E_NOT_FOUND');
    const photos = (snap.get('photos') as DocumentData[] | undefined) ?? [];
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) throw appError('E_NOT_FOUND');
    if (snap.get('status') === 'PUBLISHED' && photos.length - 1 < params.photosMin)
      throw appError('E_PHOTOS_MIN');
    const rest = photos.filter((p) => p.id !== photoId).map((p, order) => ({ ...p, order }));
    tx.update(ref, { photos: rest, updatedAt: FieldValue.serverTimestamp() });
    return photo;
  });
  const entry = { homeId: uid, photoId, dhash: String(removed.dhash) };
  await Promise.all([
    ...dhashBands(entry.dhash).map((band) =>
      db
        .doc(`photoHashIndex/${band}`)
        .set({ entries: FieldValue.arrayRemove(entry) }, { merge: true }),
    ),
    ...['thumb', 'card', 'full'].map((size) =>
      bucket().file(`homes/${uid}/photos/${photoId}_${size}.webp`).delete({ ignoreNotFound: true }),
    ),
  ]);
  return (await ownerView(db, uid, params)).photos;
}

/** FR-12 — responsible declaration for this home, current version only. */
export async function acceptDeclaration(
  db: Firestore,
  uid: string,
  version: string,
  ip: string,
  params: Params,
) {
  await requireHome(db, uid);
  const [current] = await currentLegalVersions(db, [DECLARATION_SLUG]);
  if (current?.version !== version) throw appError('E_LEGAL_VERSION');
  const timestamp = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.update(db.doc(`homes/${uid}`), {
    declaration: { version, acceptedAt: timestamp },
    updatedAt: timestamp,
  });
  batch.create(db.collection('legalAcceptances').doc(), {
    uid,
    type: 'DECLARATION',
    version,
    acceptedAt: timestamp,
    ipTruncated: truncateIp(ip),
    context: uid,
  });
  await batch.commit();
  return ownerView(db, uid, params);
}

/** FR-13 / BR-03 — publish; visibility still depends on BR-04 (identity, location…). */
export async function publishHome(db: Firestore, uid: string, params: Params) {
  const user = await loadUser(db, uid);
  requireUserActive(user);
  requirePhoneVerified(user);
  const home = await requireHome(db, uid);
  const missing = missingForPublish(
    { ...home, photoCount: ((home.photos as unknown[] | undefined) ?? []).length },
    params.photosMin,
  );
  if (missing.length > 0) throw appError('E_HOME_INCOMPLETE', { meta: { missing } });
  const [current] = await currentLegalVersions(db, [DECLARATION_SLUG]);
  if ((home.declaration as { version?: string } | undefined)?.version !== current?.version) {
    throw appError('E_DECLARATION_REQUIRED');
  }
  const timestamp = FieldValue.serverTimestamp();
  await db.doc(`homes/${uid}`).update({
    status: 'PUBLISHED',
    ...(home.publishedAt ? {} : { publishedAt: timestamp }),
    updatedAt: timestamp,
  });
  await db
    .doc(`users/${uid}`)
    .update({ 'onboarding.step': 6, 'onboarding.completedAt': timestamp });
  const view = await ownerView(db, uid, params);
  return { home: view, visible: view.visible, pendingReasons: view.visibilityProblems };
}

/** FR-13 — pause hides the home without losing matches; unpause restores it. */
export async function setPaused(db: Firestore, uid: string, paused: boolean, params: Params) {
  const home = await requireHome(db, uid);
  const expected = paused ? 'PUBLISHED' : 'PAUSED';
  if (home.status !== expected) throw appError('E_HOME_STATE');
  await db
    .doc(`homes/${uid}`)
    .update({ status: paused ? 'PAUSED' : 'PUBLISHED', updatedAt: FieldValue.serverTimestamp() });
  return ownerView(db, uid, params);
}

/** FR-14–16 — destinations, availability and travellers. */
export async function updateTravelPrefs(
  db: Firestore,
  uid: string,
  input: TravelPrefsInput,
  params: Params,
  now: Date,
) {
  const home = await requireHome(db, uid);
  const user = await loadUser(db, uid);
  const destinations =
    input.destinations.mode === 'ANY_OPEN'
      ? { mode: 'ANY_OPEN' as const, cityIds: [] }
      : input.destinations;
  if (destinations.mode === 'LIST' && destinations.cityIds.length === 0) {
    throw appError('E_VALIDATION', { fields: { destinations: 'empty' } });
  }
  if (
    destinations.cityIds.length > params.maxDestinations ||
    new Set(destinations.cityIds).size !== destinations.cityIds.length ||
    destinations.cityIds.includes(String(home.cityId))
  ) {
    throw appError('E_VALIDATION', { fields: { destinations: 'invalid' } });
  }
  if (input.availability.ranges.length > params.maxFlexibleRanges)
    throw appError('E_RANGE_INVALID');
  const today = toIsoDate(now);
  if (!input.availability.ranges.every((range) => isValidRange(range, today)))
    throw appError('E_RANGE_INVALID');

  const refs = [
    ...destinations.cityIds.map((id) => db.doc(`cities/${id}`)),
    ...input.availability.windowIds.map((id) => db.doc(`windows/${id}`)),
  ];
  const snaps = refs.length ? await db.getAll(...refs) : [];
  const cities = snaps.slice(0, destinations.cityIds.length);
  const windows = snaps.slice(destinations.cityIds.length);
  if (cities.some((s) => !s.exists || s.get('status') === 'CLOSED'))
    throw appError('E_CITY_UNKNOWN');
  if (windows.some((s) => !s.exists || s.get('active') !== true)) {
    throw appError('E_VALIDATION', { fields: { windowIds: 'invalid' } });
  }

  // TODO(M9, J-08): demand stats for users are recomputed nightly.
  await db.doc(`homes/${uid}`).update({
    destinations,
    availability: input.availability,
    travelers: input.travelers,
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (onboardingStep(user) === 4) await db.doc(`users/${uid}`).update({ 'onboarding.step': 5 });
  return ownerView(db, uid, params);
}

function onboardingStep(user: DocumentData): number {
  return (user.onboarding as { step?: number } | undefined)?.step ?? 1;
}
