import { z } from 'zod/mini';
import {
  AMENITIES,
  DESTINATION_MODES,
  HOLD_REASONS,
  HOME_STATUS,
  HOME_TYPES,
  LOCATION_CHECK_STATUS,
  RESIDENCE_USES,
  TENURES,
} from '../constants/enums.js';
import { PARAM_DEFAULTS } from '../constants/params.js';
import { DocId, IsoDateSchema } from './common.js';

const Slug = z.string().check(z.minLength(1), z.maxLength(60), z.regex(/^[a-z0-9-]+$/));

/** FR-10 — editable home fields (04 §2.3). Texts are also validated with BR-22 on the server. */
export const HomeInput = z.object({
  title: z.string().check(z.trim(), z.minLength(10), z.maxLength(70)),
  description: z.string().check(z.trim(), z.minLength(50), z.maxLength(1500)),
  cityId: Slug,
  zone: z.string().check(z.trim(), z.minLength(2), z.maxLength(60)),
  type: z.enum(HOME_TYPES),
  tenure: z.enum(TENURES),
  residenceUse: z.enum(RESIDENCE_USES),
  sizeM2: z.int().check(z.gte(10), z.lte(1000)),
  bedrooms: z.int().check(z.gte(0), z.lte(10)),
  beds: z.int().check(z.gte(1), z.lte(20)),
  bathrooms: z.int().check(z.gte(1), z.lte(10)),
  maxGuests: z.int().check(z.gte(1), z.lte(12)),
  petsAllowed: z.boolean(),
  amenities: z.array(z.enum(AMENITIES)).check(z.maxLength(AMENITIES.length)),
  houseRules: z._default(z.string().check(z.trim(), z.maxLength(500)), ''),
});
export type HomeInput = z.infer<typeof HomeInput>;

/**
 * upsertHome accepts drafts (AC-06.1: progress is saved between sub-steps); only `cityId` is
 * required. Completeness for publishing is checked by BR-03 (`missingForPublish`).
 */
export const HomeDraftInput = z.required(z.partial(HomeInput), { cityId: true });
export type HomeDraftInput = z.infer<typeof HomeDraftInput>;

export const HomePhoto = z.object({
  id: z.string(),
  order: z.int(),
  thumbUrl: z.string(),
  cardUrl: z.string(),
  fullUrl: z.string(),
  width: z.int(),
  height: z.int(),
});
export type HomePhoto = z.infer<typeof HomePhoto>;

export const DateRange = z.object({ start: IsoDateSchema, end: IsoDateSchema });

/** FR-14–16 — travel preferences. */
export const TravelPrefsInput = z.object({
  destinations: z.object({
    mode: z.enum(DESTINATION_MODES),
    cityIds: z.array(Slug).check(z.maxLength(PARAM_DEFAULTS.maxDestinations)),
  }),
  availability: z.object({
    windowIds: z.array(z.string().check(z.minLength(1), z.maxLength(60))).check(z.maxLength(20)),
    ranges: z.array(DateRange).check(z.maxLength(PARAM_DEFAULTS.maxFlexibleRanges)),
  }),
  travelers: z.object({ count: z.int().check(z.gte(1), z.lte(12)), withPet: z.boolean() }),
});
export type TravelPrefsInput = z.infer<typeof TravelPrefsInput>;

/** 05 §2.2 — what the owner sees of their home (`HomeOwnerView`). */
export const HomeOwnerView = z.extend(z.partial(HomeInput), {
  id: z.string(),
  status: z.enum(HOME_STATUS),
  visible: z.boolean(),
  complete: z.boolean(),
  photos: z.array(HomePhoto),
  destinations: z.nullable(TravelPrefsInput.shape.destinations),
  availability: z.nullable(TravelPrefsInput.shape.availability),
  travelers: z.nullable(TravelPrefsInput.shape.travelers),
  declarationVersion: z.nullable(z.string()),
  locationCheck: z.enum(LOCATION_CHECK_STATUS),
  moderationHold: z.nullable(z.object({ reason: z.enum(HOLD_REASONS) })),
  /** BR-04 reasons it is not visible yet (NOT_PUBLISHED, IDENTITY, LOCATION, ON_HOLD, ACCOUNT, CITY). */
  visibilityProblems: z.array(z.string()),
});
export type HomeOwnerView = z.infer<typeof HomeOwnerView>;

export const HomeOutput = z.object({ home: HomeOwnerView });
export type HomeOutput = z.infer<typeof HomeOutput>;

export const ReorderHomePhotosInput = z.object({
  photoIds: z
    .array(z.string().check(z.minLength(1)))
    .check(z.minLength(1), z.maxLength(PARAM_DEFAULTS.photosMax)),
});
export const DeleteHomePhotoInput = z.object({ photoId: DocId });
export const PhotosOutput = z.object({ photos: z.array(HomePhoto) });

export const AcceptDeclarationInput = z.object({
  version: z.string().check(z.minLength(1), z.maxLength(40)),
});

export const EmptyInput = z.strictObject({});
export const PublishHomeOutput = z.object({
  home: HomeOwnerView,
  visible: z.boolean(),
  pendingReasons: z.array(z.string()),
});
