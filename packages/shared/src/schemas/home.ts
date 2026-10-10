import { z } from 'zod';
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
import { IsoDateSchema } from './common.js';

const Slug = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/);

/** FR-10 — editable home fields (04 §2.3). Texts are also validated with BR-22 on the server. */
export const HomeInput = z.object({
  title: z.string().trim().min(10).max(70),
  description: z.string().trim().min(50).max(1500),
  cityId: Slug,
  zone: z.string().trim().min(2).max(60),
  type: z.enum(HOME_TYPES),
  tenure: z.enum(TENURES),
  residenceUse: z.enum(RESIDENCE_USES),
  sizeM2: z.number().int().min(10).max(1000),
  bedrooms: z.number().int().min(0).max(10),
  beds: z.number().int().min(1).max(20),
  bathrooms: z.number().int().min(1).max(10),
  maxGuests: z.number().int().min(1).max(12),
  petsAllowed: z.boolean(),
  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length),
  houseRules: z.string().trim().max(500).default(''),
});
export type HomeInput = z.infer<typeof HomeInput>;

/**
 * upsertHome accepts drafts (AC-06.1: progress is saved between sub-steps); only `cityId` is
 * required. Completeness for publishing is checked by BR-03 (`missingForPublish`).
 */
export const HomeDraftInput = HomeInput.partial().required({ cityId: true });
export type HomeDraftInput = z.infer<typeof HomeDraftInput>;

export const HomePhoto = z.object({
  id: z.string(),
  order: z.number().int(),
  thumbUrl: z.string(),
  cardUrl: z.string(),
  fullUrl: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});
export type HomePhoto = z.infer<typeof HomePhoto>;

export const DateRange = z.object({ start: IsoDateSchema, end: IsoDateSchema });

/** FR-14–16 — travel preferences. */
export const TravelPrefsInput = z.object({
  destinations: z.object({
    mode: z.enum(DESTINATION_MODES),
    cityIds: z.array(Slug).max(PARAM_DEFAULTS.maxDestinations),
  }),
  availability: z.object({
    windowIds: z.array(z.string().min(1).max(60)).max(20),
    ranges: z.array(DateRange).max(PARAM_DEFAULTS.maxFlexibleRanges),
  }),
  travelers: z.object({ count: z.number().int().min(1).max(12), withPet: z.boolean() }),
});
export type TravelPrefsInput = z.infer<typeof TravelPrefsInput>;

/** 05 §2.2 — what the owner sees of their home (`HomeOwnerView`). */
export const HomeOwnerView = HomeInput.partial().extend({
  id: z.string(),
  status: z.enum(HOME_STATUS),
  visible: z.boolean(),
  complete: z.boolean(),
  photos: z.array(HomePhoto),
  destinations: TravelPrefsInput.shape.destinations.nullable(),
  availability: TravelPrefsInput.shape.availability.nullable(),
  travelers: TravelPrefsInput.shape.travelers.nullable(),
  declarationVersion: z.string().nullable(),
  locationCheck: z.enum(LOCATION_CHECK_STATUS),
  moderationHold: z.object({ reason: z.enum(HOLD_REASONS) }).nullable(),
  /** BR-04 reasons it is not visible yet (NOT_PUBLISHED, IDENTITY, LOCATION, ON_HOLD, ACCOUNT, CITY). */
  visibilityProblems: z.array(z.string()),
});
export type HomeOwnerView = z.infer<typeof HomeOwnerView>;

export const HomeOutput = z.object({ home: HomeOwnerView });
export type HomeOutput = z.infer<typeof HomeOutput>;

export const ReorderHomePhotosInput = z.object({
  photoIds: z.array(z.string().min(1)).min(1).max(PARAM_DEFAULTS.photosMax),
});
export const DeleteHomePhotoInput = z.object({ photoId: z.string().min(1) });
export const PhotosOutput = z.object({ photos: z.array(HomePhoto) });

export const AcceptDeclarationInput = z.object({ version: z.string().min(1).max(40) });

export const EmptyInput = z.object({}).strict();
export const PublishHomeOutput = z.object({
  home: HomeOwnerView,
  visible: z.boolean(),
  pendingReasons: z.array(z.string()),
});
