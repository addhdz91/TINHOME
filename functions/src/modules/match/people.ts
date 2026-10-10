import type { DocumentData, Firestore } from 'firebase-admin/firestore';

/** What each participant shows in the chat list (denormalised when the match is created). */
export interface MatchPerson {
  displayName: string;
  homeTitle: string;
  cityId: string;
  cityName: string;
  photoUrl: string | null;
}

export async function personOf(db: Firestore, uid: string): Promise<MatchPerson> {
  const [profile, home] = await Promise.all([
    db.doc(`publicProfiles/${uid}`).get(),
    db.doc(`homes/${uid}`).get(),
  ]);
  const cityId = String(home.get('cityId') ?? '');
  const city = cityId ? await db.doc(`cities/${cityId}`).get() : null;
  const photos = (home.get('photos') as (DocumentData & { order?: number })[] | undefined) ?? [];
  const cover = photos.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
  return {
    displayName: String(profile.get('displayName') ?? ''),
    homeTitle: String(home.get('title') ?? ''),
    cityId,
    cityName: String(city?.get('name') ?? ''),
    photoUrl: typeof cover?.thumbUrl === 'string' ? cover.thumbUrl : null,
  };
}
