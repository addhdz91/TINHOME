import { z } from 'zod/mini';
import { AMENITIES, BLOCKERS, HOME_TYPES, TRAVELS_WITH } from '../constants/enums.js';
import { DocId, IsoDateSchema, PaginationInput } from './common.js';
import { DateRange, TravelPrefsInput } from './home.js';

/** 05 §4 `Compatibility`. */
export const CompatibilitySchema = z.object({
  perfectFit: z.boolean(),
  mutualDestination: z.boolean(),
  wantsYourCity: z.boolean(),
  sharedWindowIds: z.array(z.string()),
  overlapDays: z.int(),
  petsOk: z.boolean(),
  capacityOk: z.boolean(),
});

const CardPhoto = z.object({
  thumbUrl: z.string(),
  cardUrl: z.string(),
  fullUrl: z.string(),
  width: z.int(),
  height: z.int(),
});

const Rating = z.nullable(z.object({ avg: z.number(), count: z.int() }));

/** 05 §4 `HomeCard` — what Discover and Explore show (never the address). */
export const HomeCard = z.object({
  homeId: z.string(),
  ownerUid: z.string(),
  title: z.string(),
  cityId: z.string(),
  cityName: z.string(),
  zone: z.string(),
  type: z.enum(HOME_TYPES),
  maxGuests: z.int(),
  bedrooms: z.int(),
  petsAllowed: z.boolean(),
  photos: z.array(CardPhoto),
  host: z.object({
    displayName: z.string(),
    photoUrl: z.nullable(z.string()),
    identityVerified: z.boolean(),
    foundingMember: z.boolean(),
  }),
  rating: Rating,
  isTop: z.boolean(),
  compatibility: CompatibilitySchema,
  /** null unless the viewer is Premium (FR-20). */
  likedYou: z.nullable(z.boolean()),
  /** FR-61 — message that came with a like to the viewer (visible to free and Premium). */
  likeMessage: z._default(z.nullable(z.string()), null),
});
export type HomeCard = z.infer<typeof HomeCard>;

/** 05 §4 — always labelled; only for free users (BR-28). Filled from M9. */
export const SponsoredCard = z.object({
  partnerId: z.string(),
  title: z.string(),
  text: z.string(),
  logoUrl: z.string(),
  clickUrl: z.string(),
  label: z.literal('Patrocinado'),
});

/** FR-20 — `getDiscoverDeck`. */
export const GetDiscoverDeckInput = z.object({
  destinationCityIds: z.optional(
    z.array(z.string().check(z.minLength(1), z.maxLength(60))).check(z.maxLength(10)),
  ),
  windowId: z.optional(z.string().check(z.minLength(1), z.maxLength(60))),
  excludeIds: z._default(
    z.array(z.string().check(z.minLength(1), z.maxLength(128))).check(z.maxLength(200)),
    [],
  ),
});
export const GetDiscoverDeckOutput = z.object({
  cards: z.array(HomeCard),
  canLike: z.boolean(),
  blockers: z.array(z.enum(BLOCKERS)),
  likesRemaining: z.nullable(z.int()),
  sponsored: z.nullable(SponsoredCard),
});
export type GetDiscoverDeckOutput = z.infer<typeof GetDiscoverDeckOutput>;

export const SEARCH_SORTS = ['RELEVANCE', 'NEWEST', 'RATING'] as const;

/** FR-21 — `searchHomes`. Premium filters: `topOnly`, `likedMeOnly`, `minReviews`. */
export const SearchFilters = z.object({
  cityIds: z.optional(
    z.array(z.string().check(z.minLength(1), z.maxLength(60))).check(z.maxLength(10)),
  ),
  windowId: z.optional(z.string().check(z.minLength(1), z.maxLength(60))),
  dateRange: z.optional(z.object({ start: IsoDateSchema, end: IsoDateSchema })),
  minGuests: z.optional(z.int().check(z.gte(1), z.lte(12))),
  pets: z.optional(z.boolean()),
  types: z.optional(z.array(z.enum(HOME_TYPES)).check(z.maxLength(HOME_TYPES.length))),
  amenities: z.optional(z.array(z.enum(AMENITIES)).check(z.maxLength(AMENITIES.length))),
  perfectFitOnly: z.optional(z.boolean()),
  topOnly: z.optional(z.boolean()),
  likedMeOnly: z.optional(z.boolean()),
  minReviews: z.optional(z.int().check(z.gte(1), z.lte(100))),
});
export type SearchFilters = z.infer<typeof SearchFilters>;

export const SearchHomesInput = z.extend(PaginationInput, {
  filters: z._default(SearchFilters, {}),
  sort: z._default(z.enum(SEARCH_SORTS), 'RELEVANCE'),
});
export type SearchHomesInput = z.infer<typeof SearchHomesInput>;
export const SearchHomesOutput = z.object({
  items: z.array(HomeCard),
  nextCursor: z.nullable(z.string()),
});

/** FR-22 — what anyone (with a verified e-mail) sees of a visible home. */
export const HomePublicView = z.object({
  homeId: z.string(),
  ownerUid: z.string(),
  title: z.string(),
  description: z.string(),
  cityId: z.string(),
  cityName: z.string(),
  zone: z.string(),
  type: z.enum(HOME_TYPES),
  sizeM2: z.int(),
  bedrooms: z.int(),
  beds: z.int(),
  bathrooms: z.int(),
  maxGuests: z.int(),
  petsAllowed: z.boolean(),
  amenities: z.array(z.enum(AMENITIES)),
  houseRules: z.string(),
  photos: z.array(CardPhoto),
  destinations: z.nullable(TravelPrefsInput.shape.destinations),
  availability: z.nullable(
    z.object({ windowIds: z.array(z.string()), ranges: z.array(DateRange) }),
  ),
  rating: Rating,
  isTop: z.boolean(),
});
export type HomePublicView = z.infer<typeof HomePublicView>;

export const PublicProfileView = z.object({
  uid: z.string(),
  displayName: z.string(),
  photoUrl: z.nullable(z.string()),
  about: z.nullable(z.string()),
  languages: z.array(z.string()),
  travelsWith: z.nullable(z.enum(TRAVELS_WITH)),
  memberSince: z.nullable(z.string()),
  identityVerified: z.boolean(),
  foundingMember: z.boolean(),
  isTopHost: z.boolean(),
  ratingAvg: z.nullable(z.number()),
  reviewsCount: z.int(),
});
export type PublicProfileView = z.infer<typeof PublicProfileView>;

export const ReviewView = z.object({
  id: z.string(),
  authorDisplayName: z.string(),
  overall: z.int(),
  sub: z.object({
    cleanliness: z.int(),
    accuracy: z.int(),
    communication: z.int(),
    care: z.int(),
  }),
  comment: z.nullable(z.string()),
  publishedAt: z.string(),
});
export type ReviewView = z.infer<typeof ReviewView>;

export const GetHomeDetailInput = z.object({
  homeId: DocId,
});
export const GetHomeDetailOutput = z.object({
  home: HomePublicView,
  host: PublicProfileView,
  reviews: z.array(ReviewView),
  relation: z.object({ liked: z.boolean(), passed: z.boolean(), matchId: z.nullable(z.string()) }),
  compatibility: CompatibilitySchema,
});
export type GetHomeDetailOutput = z.infer<typeof GetHomeDetailOutput>;

/** BR-11 — `passHome` / `undoPass` (free users: one undo per app session, AC-20.3). */
export const PassHomeInput = z.object({
  homeId: DocId,
});
export const UndoPassInput = z.object({
  homeId: DocId,
  /** Ignored since the security audit: the server keys the free undo on the sign-in time. */
  sessionId: z.optional(z.string().check(z.minLength(8), z.maxLength(64))),
});
