import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { rankCandidates, type DateSpan } from '@tinhome/shared/domain';
import type {
  GetDiscoverDeckOutput,
  GetHomeDetailOutput,
  HomeCard,
  ReviewView,
  SearchHomesInput,
} from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { iso } from '../verification/view.js';
import {
  compatibilityWith,
  destinationCities,
  loadCandidates,
  loadCatalog,
  publicPhotos,
  ratingOf,
  toCards,
  type Candidate,
} from './candidates.js';
import type { Viewer } from './viewer.js';

const DECK_SIZE = 20;
const DAY_MS = 86_400_000;

function overlaps(a: DateSpan, b: DateSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Candidate has the window, or any of its dates overlaps it / the requested range. */
function availableIn(
  candidate: Candidate,
  span: DateSpan,
  windowId: string | null,
  windows: Map<string, DateSpan>,
): boolean {
  const availability = candidate.data.availability as
    { windowIds?: string[]; ranges?: DateSpan[] } | null | undefined;
  if (!availability) return false;
  if (windowId && availability.windowIds?.includes(windowId)) return true;
  const spans = [
    ...(availability.windowIds ?? []).flatMap((id) => {
      const window = windows.get(id);
      return window ? [window] : [];
    }),
    ...(availability.ranges ?? []),
  ];
  return spans.some((candidateSpan) => overlaps(candidateSpan, span));
}

/** FR-20 / 03 §8 — batches of 20, ranked by BR-14 with perfect fits first. */
export async function discoverDeck(
  db: Firestore,
  viewer: Viewer,
  input: {
    destinationCityIds?: string[] | undefined;
    windowId?: string | undefined;
    excludeIds: string[];
  },
  params: Params,
  now: Date,
): Promise<GetDiscoverDeckOutput> {
  const catalog = await loadCatalog(db);
  const cityIds = destinationCities(viewer, catalog, input.destinationCityIds);
  let candidates = await loadCandidates(db, viewer, catalog, cityIds, {
    skipInteracted: true,
    excludeIds: input.excludeIds,
  });
  const window = input.windowId ? catalog.windows.get(input.windowId) : undefined;
  if (input.windowId && window) {
    candidates = candidates.filter((c) =>
      availableIn(c, window, input.windowId ?? null, catalog.windows),
    );
  }
  const page = rankCandidates(candidates, params.rankingWeights, viewer.seed, now).slice(
    0,
    DECK_SIZE,
  );
  return {
    cards: await toCards(db, page, viewer, catalog),
    canLike: viewer.me.canLike,
    blockers: viewer.me.blockers,
    likesRemaining: viewer.me.likes.remainingToday,
    // Sponsored cards (BR-28) arrive with partners in M9.
    sponsored: null,
  };
}

/** FR-21 — grid with filters; `topOnly`, `likedMeOnly` and `minReviews` are Premium. */
export async function searchHomes(
  db: Firestore,
  viewer: Viewer,
  input: SearchHomesInput,
  params: Params,
  now: Date,
): Promise<{ items: HomeCard[]; nextCursor: string | null }> {
  const { filters } = input;
  if ((filters.topOnly || filters.likedMeOnly || filters.minReviews) && !viewer.isPremium) {
    throw appError('E_PREMIUM_REQUIRED');
  }
  const catalog = await loadCatalog(db);
  const cityIds = destinationCities(viewer, catalog, filters.cityIds);
  const window = filters.windowId ? catalog.windows.get(filters.windowId) : undefined;
  const range = filters.dateRange
    ? { start: filters.dateRange.start, end: filters.dateRange.end }
    : undefined;
  const candidates = (
    await loadCandidates(db, viewer, catalog, cityIds, { skipInteracted: false })
  ).filter((c) => {
    const data = c.data;
    if (window && !availableIn(c, window, filters.windowId ?? null, catalog.windows)) return false;
    if (range && !availableIn(c, range, null, catalog.windows)) return false;
    if (filters.minGuests && Number(data.maxGuests ?? 0) < filters.minGuests) return false;
    if (filters.pets && data.petsAllowed !== true) return false;
    if (filters.types?.length && !filters.types.includes(data.type as never)) return false;
    const amenities = (data.amenities as string[] | undefined) ?? [];
    if (filters.amenities?.some((a) => !amenities.includes(a))) return false;
    if (filters.perfectFitOnly && !c.compatibility.perfectFit) return false;
    if (filters.topOnly && data.isTop !== true) return false;
    if (filters.likedMeOnly && !c.likedYou) return false;
    if (filters.minReviews && (c.rating?.count ?? 0) < filters.minReviews) return false;
    return true;
  });
  const sorted =
    input.sort === 'NEWEST'
      ? candidates.toSorted(
          (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
        )
      : input.sort === 'RATING'
        ? candidates.toSorted(
            (a, b) =>
              (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0) ||
              (b.rating?.count ?? 0) - (a.rating?.count ?? 0),
          )
        : rankCandidates(candidates, params.rankingWeights, viewer.seed, now);
  const offset = Number(input.cursor ?? 0) || 0;
  const page = sorted.slice(offset, offset + input.limit);
  return {
    items: await toCards(db, page, viewer, catalog),
    nextCursor: offset + input.limit < sorted.length ? String(offset + input.limit) : null,
  };
}

function matchId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/** FR-22 — public view of a visible home; hidden, blocked or unknown homes are E_NOT_FOUND. */
export async function homeDetail(
  db: Firestore,
  viewer: Viewer,
  homeId: string,
  now: Date,
): Promise<GetHomeDetailOutput> {
  const snap = await db.doc(`homes/${homeId}`).get();
  const data = snap.data();
  const ownerUid = snap.id;
  if (
    !data ||
    (data.visible !== true && ownerUid !== viewer.uid) ||
    viewer.blockedUids.has(ownerUid)
  ) {
    throw appError('E_NOT_FOUND');
  }
  const [catalog, profileSnap, reviews, like, pass, match] = await Promise.all([
    loadCatalog(db),
    db.doc(`publicProfiles/${ownerUid}`).get(),
    db
      .collection('reviews')
      .where('targetHomeId', '==', homeId)
      .where('status', '==', 'PUBLISHED')
      .orderBy('publishedAt', 'desc')
      .limit(20)
      .get(),
    db.doc(`likes/${viewer.uid}_${ownerUid}`).get(),
    db.doc(`passes/${viewer.uid}_${homeId}`).get(),
    db.doc(`matches/${matchId(viewer.uid, ownerUid)}`).get(),
  ]);
  const profile = profileSnap.data() ?? {};
  const passExpires = pass.get('expiresAt') as Timestamp | undefined;
  const reviewViews: ReviewView[] = reviews.docs.map((review) => ({
    id: review.id,
    authorDisplayName: String(review.get('authorDisplayName') ?? ''),
    overall: Number(review.get('overall')),
    sub: review.get('sub') as ReviewView['sub'],
    comment:
      review.get('commentHidden') === true
        ? null
        : ((review.get('comment') as string | undefined) ?? null),
    publishedAt: iso(review.get('publishedAt')) ?? new Date(0).toISOString(),
  }));
  return {
    home: {
      homeId,
      ownerUid,
      title: String(data.title ?? ''),
      description: String(data.description ?? ''),
      cityId: String(data.cityId),
      cityName: catalog.cities.get(String(data.cityId))?.name ?? '',
      zone: String(data.zone ?? ''),
      type: data.type as GetHomeDetailOutput['home']['type'],
      sizeM2: Number(data.sizeM2 ?? 0),
      bedrooms: Number(data.bedrooms ?? 0),
      beds: Number(data.beds ?? 1),
      bathrooms: Number(data.bathrooms ?? 1),
      maxGuests: Number(data.maxGuests ?? 1),
      petsAllowed: data.petsAllowed === true,
      amenities: (data.amenities as GetHomeDetailOutput['home']['amenities'] | undefined) ?? [],
      houseRules: String(data.houseRules ?? ''),
      photos: publicPhotos(data),
      destinations:
        (data.destinations as GetHomeDetailOutput['home']['destinations'] | undefined) ?? null,
      availability:
        (data.availability as GetHomeDetailOutput['home']['availability'] | undefined) ?? null,
      rating: ratingOf(data),
      isTop: data.isTop === true,
    },
    host: {
      uid: ownerUid,
      displayName: String(profile.displayName ?? ''),
      photoUrl: typeof profile.photoUrl === 'string' ? profile.photoUrl : null,
      about: typeof profile.about === 'string' ? profile.about : null,
      languages: (profile.languages as string[] | undefined) ?? [],
      travelsWith:
        (profile.travelsWith as GetHomeDetailOutput['host']['travelsWith'] | undefined) ?? null,
      memberSince: iso(profile.memberSince),
      identityVerified: profile.identityVerified === true,
      foundingMember: profile.foundingMember === true,
      isTopHost: profile.isTopHost === true,
      ratingAvg: typeof profile.ratingAvg === 'number' ? profile.ratingAvg : null,
      reviewsCount: Number(profile.reviewsCount ?? 0),
    },
    reviews: reviewViews,
    relation: {
      liked: like.exists,
      passed: pass.exists && passExpires !== undefined && passExpires.toMillis() > now.getTime(),
      matchId: match.exists && match.get('status') === 'ACTIVE' ? match.id : null,
    },
    compatibility: compatibilityWith(viewer, data, catalog),
  };
}

/** BR-11 — hides the home from the viewer's deck for P-03 days. */
export async function passHome(
  db: Firestore,
  viewer: Viewer,
  homeId: string,
  params: Params,
  now: Date,
): Promise<void> {
  if (homeId === viewer.uid) throw appError('E_VALIDATION', { fields: { homeId: 'own' } });
  const home = await db.doc(`homes/${homeId}`).get();
  if (!home.exists) throw appError('E_NOT_FOUND');
  await db.doc(`passes/${viewer.uid}_${homeId}`).set({
    uid: viewer.uid,
    homeId,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now.getTime() + params.passHideDays * DAY_MS),
  });
}

/** AC-20.3 — undo the last pass: once per app session for free users, unlimited for Premium. */
export async function undoPass(
  db: Firestore,
  viewer: Viewer,
  input: { homeId: string; sessionId: string },
  now: Date,
): Promise<void> {
  const passRef = db.doc(`passes/${viewer.uid}_${input.homeId}`);
  const counterRef = db.doc(`rateLimits/undo_${viewer.uid}_${input.sessionId}`);
  await db.runTransaction(async (tx) => {
    const [pass, counter] = await Promise.all([tx.get(passRef), tx.get(counterRef)]);
    if (!pass.exists) throw appError('E_NOT_FOUND');
    if (!viewer.isPremium) {
      if (counter.exists) throw appError('E_UNDO_LIMIT');
      tx.set(counterRef, {
        scope: 'undoPass',
        count: 1,
        expiresAt: Timestamp.fromMillis(now.getTime() + 2 * DAY_MS),
      });
    }
    tx.delete(passRef);
  });
}
