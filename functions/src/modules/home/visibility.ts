import { FieldValue, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import type {
  CityStatus,
  HomeStatus,
  IdentityStatus,
  LocationCheckStatus,
  UserStatus,
} from '@tinhome/shared/constants';
import { isCityCandidate, missingForPublish, visibilityProblems } from '@tinhome/shared/domain';
import type { Params } from '@tinhome/shared/types';

export interface HomeState {
  complete: boolean;
  visible: boolean;
  problems: string[];
}

/** Pure projection of the computed fields from the home, its owner and city. */
export function computeHomeState(
  home: DocumentData,
  user: DocumentData | undefined,
  cityStatus: CityStatus | null,
  params: Params,
): HomeState {
  const photos = (home.photos as unknown[] | undefined) ?? [];
  const complete =
    missingForPublish({ ...home, photoCount: photos.length }, params.photosMin).length === 0;
  const problems = visibilityProblems({
    status: home.status as HomeStatus,
    identity: (user?.verification as { identity?: IdentityStatus } | undefined)?.identity ?? 'NONE',
    locationCheck:
      (home.locationCheck as { status?: LocationCheckStatus } | undefined)?.status ?? 'NONE',
    onHold:
      (home.moderationHold as { active?: boolean } | null | undefined)?.active === true ||
      (user?.moderationHold as { active?: boolean } | null | undefined)?.active === true,
    ownerStatus: (user?.status as UserStatus | undefined) ?? 'DELETED',
    cityStatus,
  });
  return { complete, visible: problems.length === 0, problems };
}

/**
 * BR-04 / BR-21 — recomputes `homes.complete`, `homes.visible` and the city counter of
 * candidates (published + identity approved) in one transaction. Called after every change
 * to a home, its owner's verification or moderation (idempotent through `countedCityId`).
 */
export async function recomputeHome(
  db: Firestore,
  uid: string,
  params: Params,
): Promise<HomeState | null> {
  return db.runTransaction(async (tx) => {
    const homeRef = db.doc(`homes/${uid}`);
    const [homeSnap, userSnap] = await tx.getAll(homeRef, db.doc(`users/${uid}`));
    if (!homeSnap?.exists) return null;
    const home = homeSnap.data() ?? {};
    const user = userSnap?.data();
    const cityId = home.cityId as string | undefined;
    const previousCity = home.countedCityId as string | null | undefined;
    const citySnaps = await tx.getAll(
      ...[
        ...new Set([cityId, previousCity].filter((id): id is string => typeof id === 'string')),
      ].map((id) => db.doc(`cities/${id}`)),
    );
    const city = citySnaps.find((snap) => snap.id === cityId);
    const state = computeHomeState(
      home,
      user,
      (city?.get('status') as CityStatus | undefined) ?? null,
      params,
    );

    const identity =
      (user?.verification as { identity?: IdentityStatus } | undefined)?.identity ?? 'NONE';
    const candidate = isCityCandidate(home.status as HomeStatus, identity) && cityId !== undefined;
    const countedCity = candidate ? cityId : null;
    if ((previousCity ?? null) !== countedCity) {
      if (previousCity)
        tx.update(db.doc(`cities/${previousCity}`), {
          'counters.visibleCandidates': FieldValue.increment(-1),
        });
      if (countedCity && city?.exists)
        tx.update(db.doc(`cities/${countedCity}`), {
          'counters.visibleCandidates': FieldValue.increment(1),
        });
    }

    const changed =
      home.complete !== state.complete ||
      home.visible !== state.visible ||
      (previousCity ?? null) !== countedCity;
    if (changed) {
      tx.update(homeRef, {
        complete: state.complete,
        visible: state.visible,
        countedCityId: countedCity,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return state;
  });
}
