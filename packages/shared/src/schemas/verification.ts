import { z } from 'zod';
import {
  CITY_STATUS,
  LOCATION_CHECK_STATUS,
  LOCATION_RESULTS,
  PREMIUM_SOURCE,
  PROPERTY_DOC_TYPES,
  REVIEW_DECISIONS,
  TENURES,
  VERIFICATION_DECISIONS,
  VERIFICATION_FILES,
  VERIFICATION_STATUS,
} from '../constants/enums.js';
import { PaginationInput } from './common.js';

/** Storage path `private/verifications/{uid}/{verificationId}/{file}` (checked by the server). */
const StoragePath = z
  .string()
  .regex(/^private\/verifications\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{8,64}\/[A-Za-z]+$/);

/** FR-08 — `submitIdentityVerification`. */
export const SubmitIdentityVerificationInput = z.object({
  tenure: z.enum(TENURES),
  propertyDocType: z.enum(PROPERTY_DOC_TYPES),
  docNumber: z.string().trim().min(8).max(20),
  files: z.object({
    idFront: StoragePath.optional(),
    idBack: StoragePath.optional(),
    selfie: StoragePath.optional(),
    propertyDoc: StoragePath.optional(),
    landlordAuthorization: StoragePath.optional(),
  }),
});
export type SubmitIdentityVerificationInput = z.infer<typeof SubmitIdentityVerificationInput>;

export const SubmitIdentityVerificationOutput = z.object({
  verificationId: z.string(),
  status: z.literal('PENDING'),
});

/** S-14 — what the owner sees of their latest verification (never hashes or other users). */
export const MyVerification = z.object({
  id: z.string(),
  status: z.enum(VERIFICATION_STATUS),
  tenure: z.enum(TENURES),
  propertyDocType: z.enum(PROPERTY_DOC_TYPES),
  decisionReason: z.string().nullable(),
  infoRequest: z.string().nullable(),
  submittedAt: z.string(),
  decidedAt: z.string().nullable(),
});
export type MyVerification = z.infer<typeof MyVerification>;

export const GetMyVerificationOutput = z.object({ verification: MyVerification.nullable() });

export const VerificationSummary = z.object({
  id: z.string(),
  uid: z.string(),
  displayName: z.string(),
  cityId: z.string().nullable(),
  tenure: z.enum(TENURES),
  status: z.enum(VERIFICATION_STATUS),
  submittedAt: z.string(),
  duplicate: z.boolean(),
  fraudSuspicion: z.boolean(),
});
export type VerificationSummary = z.infer<typeof VerificationSummary>;

export const AdminListVerificationsInput = PaginationInput.extend({
  status: z.enum(VERIFICATION_STATUS).default('PENDING'),
});
export const AdminListVerificationsOutput = z.object({
  items: z.array(VerificationSummary),
  nextCursor: z.string().nullable(),
});

export const AdminGetVerificationInput = z.object({ id: z.string().min(1).max(128) });

export const VerificationAdminView = VerificationSummary.extend({
  propertyDocType: z.enum(PROPERTY_DOC_TYPES),
  files: z.array(z.enum(VERIFICATION_FILES)),
  filesPurged: z.boolean(),
  reviewerUid: z.string().nullable(),
  decisionReason: z.string().nullable(),
  infoRequest: z.string().nullable(),
  decidedAt: z.string().nullable(),
});
export type VerificationAdminView = z.infer<typeof VerificationAdminView>;

export const AdminGetVerificationOutput = z.object({
  verification: VerificationAdminView,
  user: z.object({
    uid: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    birthDate: z.string(),
    email: z.string(),
    cityId: z.string().nullable(),
  }),
  home: z
    .object({
      title: z.string().nullable(),
      cityId: z.string().nullable(),
      zone: z.string().nullable(),
      tenure: z.enum(TENURES).nullable(),
    })
    .nullable(),
  duplicateUser: z.object({ uid: z.string(), displayName: z.string() }).nullable(),
});
export type AdminGetVerificationOutput = z.infer<typeof AdminGetVerificationOutput>;

export const AdminGetVerificationFileUrlInput = z.object({
  id: z.string().min(1).max(128),
  file: z.enum(VERIFICATION_FILES),
});
export const AdminGetVerificationFileUrlOutput = z.object({
  url: z.string(),
  contentType: z.string(),
  expiresAt: z.string(),
});

export const AdminDecideVerificationInput = z.object({
  id: z.string().min(1).max(128),
  decision: z.enum(VERIFICATION_DECISIONS),
  reason: z.string().trim().max(1000).optional(),
  infoRequest: z.string().trim().max(1000).optional(),
  fraudSuspicion: z.boolean().optional(),
});
export type AdminDecideVerificationInput = z.infer<typeof AdminDecideVerificationInput>;

export const AdminDecideVerificationOutput = z.object({ verification: VerificationAdminView });

/** FR-63 — `verifyHomeLocation`. Coordinates are rounded and purged after P-13 days. */
export const VerifyHomeLocationInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(100_000),
  isMobile: z.boolean(),
});
export const VerifyHomeLocationOutput = z.object({
  result: z.enum(LOCATION_RESULTS),
  distanceKm: z.number().int(),
  attemptsLeft: z.number().int(),
});

export const RequestLocationReviewInput = z.object({ note: z.string().trim().min(10).max(500) });

export const LocationReviewSummary = z.object({
  homeId: z.string(),
  displayName: z.string(),
  cityId: z.string(),
  note: z.string(),
  requestedAt: z.string(),
  lastCheck: z
    .object({
      result: z.enum(LOCATION_RESULTS),
      distanceKm: z.number().int(),
      accuracyM: z.number(),
    })
    .nullable(),
});
export type LocationReviewSummary = z.infer<typeof LocationReviewSummary>;

export const AdminListLocationReviewsOutput = z.object({ items: z.array(LocationReviewSummary) });

export const AdminDecideLocationReviewInput = z.object({
  homeId: z.string().min(1).max(128),
  decision: z.enum(REVIEW_DECISIONS),
  reason: z.string().trim().min(3).max(1000),
});
export const AdminDecideLocationReviewOutput = z.object({
  homeId: z.string(),
  locationCheck: z.enum(LOCATION_CHECK_STATUS),
});

/** FR-49 — home dashboard KPIs (counters of later milestones are 0 until they exist). */
export const AdminDashboardOutput = z.object({
  pendingVerifications: z.object({ count: z.number().int(), oldestAt: z.string().nullable() }),
  pendingLocationReviews: z.number().int(),
  openReports: z.number().int(),
  newUsers7d: z.number().int(),
  cities: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(CITY_STATUS),
      visibleCandidates: z.number().int(),
      threshold: z.number().int(),
      foundersAwarded: z.number().int(),
    }),
  ),
  matches7d: z.number().int(),
  exchangesConfirmed30d: z.number().int(),
  premiumBySource: z.record(z.enum(PREMIUM_SOURCE), z.number().int()),
});
export type AdminDashboardOutput = z.infer<typeof AdminDashboardOutput>;
