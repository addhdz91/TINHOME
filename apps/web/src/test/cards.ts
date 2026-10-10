import type { HomeCard } from '@tinhome/shared/schemas';

/** A Discover/Explore card for component tests. */
export function card(id: string, overrides: Partial<HomeCard> = {}): HomeCard {
  return {
    homeId: id,
    ownerUid: id,
    title: `Casa ${id}`,
    cityId: 'valencia',
    cityName: 'Valencia',
    zone: 'Ruzafa',
    type: 'FLAT',
    maxGuests: 4,
    bedrooms: 2,
    petsAllowed: false,
    photos: [{ thumbUrl: 't', cardUrl: `/${id}.webp`, fullUrl: 'f', width: 1080, height: 1350 }],
    host: { displayName: 'Ana P.', photoUrl: null, identityVerified: true, foundingMember: false },
    rating: null,
    isTop: false,
    compatibility: {
      perfectFit: false,
      mutualDestination: false,
      wantsYourCity: false,
      sharedWindowIds: [],
      overlapDays: 0,
      petsOk: true,
      capacityOk: true,
    },
    likedYou: null,
    ...overrides,
  };
}
