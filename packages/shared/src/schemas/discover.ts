import { z } from 'zod';
import { AMENITIES, BLOCKERS, HOME_TYPES, TRAVELS_WITH } from '../constants/enums.js';
import { IsoDateSchema, PaginationInput } from './common.js';
import { DateRange, TravelPrefsInput } from './home.js';

/** 05 §4 `Compatibility`. */
export const CompatibilitySchema = z.object({
  perfectFit: z.boolean(),
  mutualDestination: z.boolean(),
  wantsYourCity: z.boolean(),
  sharedWindowIds: z.array(z.string()),
  overlapDays: z.number().int(),
  petsOk: z.boolean(),
  capacityOk: z.boolean(),
});

const CardPhoto = z.object({
  thumbUrl: z.string(),
  cardUrl: z.string(),
  fullUrl: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});

const Rating = z.object({ avg: z.number(), count: z.number().int() }).nullable();

/** 05 §4 `HomeCard` — what Discover and Explore show (never the address). */
export const HomeCard = z.object({
  homeId: z.string(),
  ownerUid: z.string(),
  title: z.string(),
  cityId: z.string(),
  cityName: z.string(),
  zone: z.string(),
  type: z.enum(HOME_TYPES),
  maxGuests: z.number().int(),
  bedrooms: z.number().int(),
  petsAllowed: z.boolean(),
  photos: z.array(CardPhoto),
  host: z.object({
    displayName: z.string(),
    photoUrl: z.string().nullable(),
    identityVerified: z.boolean(),
    foundingMember: z.boolean(),
  }),
  rating: Rating,
  isTop: z.boolean(),
  compatibility: CompatibilitySchema,
  /** null unless the viewer is Premium (FR-20). */
  likedYou: z.boolean().nullable(),
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
  destinationCityIds: z.array(z.string().min(1).max(60)).max(10).optional(),
  windowId: z.string().min(1).max(60).optional(),
  excludeIds: z.array(z.string().min(1).max(128)).max(200).default([]),
});
export const GetDiscoverDeckOutput = z.object({
  cards: z.array(HomeCard),
  canLike: z.boolean(),
  blockers: z.array(z.enum(BLOCKERS)),
  likesRemaining: z.number().int().nullable(),
  sponsored: SponsoredCard.nullable(),
});
export type GetDiscoverDeckOutput = z.infer<typeof GetDiscoverDeckOutput>;

export const SEARCH_SORTS = ['RELEVANCE', 'NEWEST', 'RATING'] as const;

/** FR-21 — `searchHomes`. Premium filters: `topOnly`, `likedMeOnly`, `minReviews`. */
export const SearchFilters = z.object({
  cityIds: z.array(z.string().min(1).max(60)).max(10).optional(),
  windowId: z.string().min(1).max(60).optional(),
  dateRange: z.object({ start: IsoDateSchema, end: IsoDateSchema }).optional(),
  minGuests: z.number().int().min(1).max(12).optional(),
  pets: z.boolean().optional(),
  types: z.array(z.enum(HOME_TYPES)).max(HOME_TYPES.length).optional(),
  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).optional(),
  perfectFitOnly: z.boolean().optional(),
  topOnly: z.boolean().optional(),
  likedMeOnly: z.boolean().optional(),
  minReviews: z.number().int().min(1).max(100).optional(),
});
export type SearchFilters = z.infer<typeof SearchFilters>;

export const SearchHomesInput = PaginationInput.extend({
  filters: SearchFilters.default({}),
  sort: z.enum(SEARCH_SORTS).default('RELEVANCE'),
});
export type SearchHomesInput = z.infer<typeof SearchHomesInput>;
export const SearchHomesOutput = z.object({
  items: z.array(HomeCard),
  nextCursor: z.string().nullable(),
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
  sizeM2: z.number().int(),
  bedrooms: z.number().int(),
  beds: z.number().int(),
  bathrooms: z.number().int(),
  maxGuests: z.number().int(),
  petsAllowed: z.boolean(),
  amenities: z.array(z.enum(AMENITIES)),
  houseRules: z.string(),
  photos: z.array(CardPhoto),
  destinations: TravelPrefsInput.shape.destinations.nullable(),
  availability: z.object({ windowIds: z.array(z.string()), ranges: z.array(DateRange) }).nullable(),
  rating: Rating,
  isTop: z.boolean(),
});
export type HomePublicView = z.infer<typeof HomePublicView>;

export const PublicProfileView = z.object({
  uid: z.string(),
  displayName: z.string(),
  photoUrl: z.string().nullable(),
  about: z.string().nullable(),
  languages: z.array(z.string()),
  travelsWith: z.enum(TRAVELS_WITH).nullable(),
  memberSince: z.string().nullable(),
  identityVerified: z.boolean(),
  foundingMember: z.boolean(),
  isTopHost: z.boolean(),
  ratingAvg: z.number().nullable(),
  reviewsCount: z.number().int(),
});
export type PublicProfileView = z.infer<typeof PublicProfileView>;

export const ReviewView = z.object({
  id: z.string(),
  authorDisplayName: z.string(),
  overall: z.number().int(),
  sub: z.object({
    cleanliness: z.number().int(),
    accuracy: z.number().int(),
    communication: z.number().int(),
    care: z.number().int(),
  }),
  comment: z.string().nullable(),
  publishedAt: z.string(),
});
export type ReviewView = z.infer<typeof ReviewView>;

export const GetHomeDetailInput = z.object({ homeId: z.string().min(1).max(128) });
export const GetHomeDetailOutput = z.object({
  home: HomePublicView,
  host: PublicProfileView,
  reviews: z.array(ReviewView),
  relation: z.object({ liked: z.boolean(), passed: z.boolean(), matchId: z.string().nullable() }),
  compatibility: CompatibilitySchema,
});
export type GetHomeDetailOutput = z.infer<typeof GetHomeDetailOutput>;

/** BR-11 — `passHome` / `undoPass` (free users: one undo per app session, AC-20.3). */
export const PassHomeInput = z.object({ homeId: z.string().min(1).max(128) });
export const UndoPassInput = z.object({
  homeId: z.string().min(1).max(128),
  sessionId: z.string().min(8).max(64),
});
