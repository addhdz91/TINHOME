import type { DocumentData, DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import type { CityStatus } from '@tinhome/shared/constants';
import {
  computeCompatibility,
  type CandidateSide,
  type Compatibility,
  type DateSpan,
  type RankingInput,
} from '@tinhome/shared/domain';
import type { HomeCard } from '@tinhome/shared/schemas';
import type { Viewer } from './viewer.js';

/** 03 §8 — at most 300 candidates per query (enough for thousands of homes per city). */
const MAX_CANDIDATES = 300;

export interface Catalog {
  cities: Map<string, { name: string; status: CityStatus }>;
  windows: Map<string, DateSpan>;
}

export interface Candidate extends RankingInput {
  snap: DocumentSnapshot;
  data: DocumentData;
  ownerUid: string;
}

export async function loadCatalog(db: Firestore): Promise<Catalog> {
  const [cities, windows] = await Promise.all([
    db.collection('cities').get(),
    db.collection('windows').get(),
  ]);
  return {
    cities: new Map(
      cities.docs.map((c) => [
        c.id,
        { name: String(c.get('name')), status: c.get('status') as CityStatus },
      ]),
    ),
    windows: new Map(
      windows.docs.map((w) => [
        w.id,
        { start: String(w.get('startDate')), end: String(w.get('endDate')) },
      ]),
    ),
  };
}

/** Destinations to search: explicit ones, else the viewer's list, else every open city but their own. */
export function destinationCities(viewer: Viewer, catalog: Catalog, explicit?: string[]): string[] {
  const open = [...catalog.cities].filter(([, city]) => city.status === 'OPEN').map(([id]) => id);
  const wanted =
    explicit && explicit.length > 0
      ? explicit
      : viewer.side.destinations?.mode === 'LIST' && viewer.side.destinations.cityIds.length > 0
        ? viewer.side.destinations.cityIds
        : open.filter((id) => id !== viewer.side.cityId);
  return wanted.filter((id) => open.includes(id)).slice(0, 30);
}

function candidateSide(data: DocumentData): CandidateSide {
  return {
    cityId: String(data.cityId),
    destinations: (data.destinations as CandidateSide['destinations'] | undefined) ?? null,
    availability: (data.availability as CandidateSide['availability'] | undefined) ?? null,
    maxGuests: Number(data.maxGuests ?? 1),
    petsAllowed: data.petsAllowed === true,
  };
}

export function compatibilityWith(
  viewer: Viewer,
  data: DocumentData,
  catalog: Catalog,
): Compatibility {
  return computeCompatibility(viewer.side, candidateSide(data), catalog.windows);
}

/**
 * BR-04 visible homes in `cityIds`, without the viewer's own home or blocked owners (both ways).
 * `skipInteracted` also removes liked and recently passed homes (Discover).
 */
export async function loadCandidates(
  db: Firestore,
  viewer: Viewer,
  catalog: Catalog,
  cityIds: string[],
  options: { skipInteracted: boolean; excludeIds?: string[] },
): Promise<Candidate[]> {
  if (cityIds.length === 0) return [];
  const snaps = await db
    .collection('homes')
    .where('visible', '==', true)
    .where('cityId', 'in', cityIds)
    .limit(MAX_CANDIDATES)
    .get();
  const excluded = new Set(options.excludeIds ?? []);
  return snaps.docs.flatMap((snap) => {
    const data = snap.data();
    const ownerUid = snap.id;
    if (ownerUid === viewer.uid || viewer.blockedUids.has(ownerUid) || excluded.has(snap.id))
      return [];
    if (
      options.skipInteracted &&
      (viewer.likedUids.has(ownerUid) || viewer.passedHomeIds.has(snap.id))
    )
      return [];
    return [
      {
        snap,
        data,
        ownerUid,
        homeId: snap.id,
        compatibility: compatibilityWith(viewer, data, catalog),
        likedYou: viewer.likedYouUids.has(ownerUid),
        ownerPremium: data.ownerPremium === true,
        rating: ratingOf(data),
        publishedAt: data.publishedAt instanceof Timestamp ? data.publishedAt.toDate() : null,
        photoCount: Array.isArray(data.photos) ? data.photos.length : 0,
      },
    ];
  });
}

type Photo = HomeCard['photos'][number];

/** Published rating, or null while the home has no reviews. */
export function ratingOf(data: DocumentData): { avg: number; count: number } | null {
  const rating = data.rating as { avg?: number; count?: number } | undefined;
  return rating?.count ? { avg: rating.avg ?? 0, count: rating.count } : null;
}

export function publicPhotos(data: DocumentData): Photo[] {
  return ((data.photos as (Photo & { order?: number })[] | undefined) ?? [])
    .toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(({ thumbUrl, cardUrl, fullUrl, width, height }) => ({
      thumbUrl,
      cardUrl,
      fullUrl,
      width,
      height,
    }));
}

/** Cards for a page of candidates (public profiles read in one batch). */
export async function toCards(
  db: Firestore,
  page: Candidate[],
  viewer: Viewer,
  catalog: Catalog,
): Promise<HomeCard[]> {
  if (page.length === 0) return [];
  const profiles = await db.getAll(...page.map((c) => db.doc(`publicProfiles/${c.ownerUid}`)));
  return page.map((candidate, i) => {
    const profile = profiles[i]?.data() ?? {};
    const data = candidate.data;
    return {
      homeId: candidate.homeId,
      ownerUid: candidate.ownerUid,
      title: String(data.title ?? ''),
      cityId: String(data.cityId),
      cityName: catalog.cities.get(String(data.cityId))?.name ?? '',
      zone: String(data.zone ?? ''),
      type: data.type as HomeCard['type'],
      maxGuests: Number(data.maxGuests ?? 1),
      bedrooms: Number(data.bedrooms ?? 0),
      petsAllowed: data.petsAllowed === true,
      photos: publicPhotos(data),
      host: {
        displayName: String(profile.displayName ?? ''),
        photoUrl: typeof profile.photoUrl === 'string' ? profile.photoUrl : null,
        identityVerified: profile.identityVerified === true,
        foundingMember: profile.foundingMember === true,
      },
      rating: candidate.rating,
      isTop: data.isTop === true,
      compatibility: candidate.compatibility,
      likedYou: viewer.isPremium ? candidate.likedYou : null,
    };
  });
}
