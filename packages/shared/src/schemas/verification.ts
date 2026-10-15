import { z } from 'zod/mini';
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
  .check(z.regex(/^private\/verifications\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{8,64}\/[A-Za-z]+$/));

/** FR-08 — `submitIdentityVerification`. */
export const SubmitIdentityVerificationInput = z.object({
  tenure: z.enum(TENURES),
  propertyDocType: z.enum(PROPERTY_DOC_TYPES),
  docNumber: z.string().check(z.trim(), z.minLength(8), z.maxLength(20)),
  files: z.object({
    idFront: z.optional(StoragePath),
    idBack: z.optional(StoragePath),
    selfie: z.optional(StoragePath),
    propertyDoc: z.optional(StoragePath),
    landlordAuthorization: z.optional(StoragePath),
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
  decisionReason: z.nullable(z.string()),
  infoRequest: z.nullable(z.string()),
  submittedAt: z.string(),
  decidedAt: z.nullable(z.string()),
});
export type MyVerification = z.infer<typeof MyVerification>;

export const GetMyVerificationOutput = z.object({ verification: z.nullable(MyVerification) });

export const VerificationSummary = z.object({
  id: z.string(),
  uid: z.string(),
  displayName: z.string(),
  cityId: z.nullable(z.string()),
  tenure: z.enum(TENURES),
  status: z.enum(VERIFICATION_STATUS),
  submittedAt: z.string(),
  duplicate: z.boolean(),
  fraudSuspicion: z.boolean(),
});
export type VerificationSummary = z.infer<typeof VerificationSummary>;

export const AdminListVerificationsInput = z.extend(PaginationInput, {
  status: z._default(z.enum(VERIFICATION_STATUS), 'PENDING'),
});
export const AdminListVerificationsOutput = z.object({
  items: z.array(VerificationSummary),
  nextCursor: z.nullable(z.string()),
});

export const AdminGetVerificationInput = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(128)),
});

export const VerificationAdminView = z.extend(VerificationSummary, {
  propertyDocType: z.enum(PROPERTY_DOC_TYPES),
  files: z.array(z.enum(VERIFICATION_FILES)),
  filesPurged: z.boolean(),
  reviewerUid: z.nullable(z.string()),
  decisionReason: z.nullable(z.string()),
  infoRequest: z.nullable(z.string()),
  decidedAt: z.nullable(z.string()),
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
    cityId: z.nullable(z.string()),
  }),
  home: z.nullable(
    z.object({
      title: z.nullable(z.string()),
      cityId: z.nullable(z.string()),
      zone: z.nullable(z.string()),
      tenure: z.nullable(z.enum(TENURES)),
    }),
  ),
  duplicateUser: z.nullable(z.object({ uid: z.string(), displayName: z.string() })),
});
export type AdminGetVerificationOutput = z.infer<typeof AdminGetVerificationOutput>;

export const AdminGetVerificationFileUrlInput = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(128)),
  file: z.enum(VERIFICATION_FILES),
});
export const AdminGetVerificationFileUrlOutput = z.object({
  url: z.string(),
  contentType: z.string(),
  expiresAt: z.string(),
});

export const AdminDecideVerificationInput = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(128)),
  decision: z.enum(VERIFICATION_DECISIONS),
  reason: z.optional(z.string().check(z.trim(), z.maxLength(1000))),
  infoRequest: z.optional(z.string().check(z.trim(), z.maxLength(1000))),
  fraudSuspicion: z.optional(z.boolean()),
});
export type AdminDecideVerificationInput = z.infer<typeof AdminDecideVerificationInput>;

export const AdminDecideVerificationOutput = z.object({ verification: VerificationAdminView });

/** FR-63 — `verifyHomeLocation`. Coordinates are rounded and purged after P-13 days. */
export const VerifyHomeLocationInput = z.object({
  lat: z.number().check(z.gte(-90), z.lte(90)),
  lng: z.number().check(z.gte(-180), z.lte(180)),
  accuracyM: z.number().check(z.gte(0), z.lte(100_000)),
  isMobile: z.boolean(),
});
export const VerifyHomeLocationOutput = z.object({
  result: z.enum(LOCATION_RESULTS),
  distanceKm: z.int(),
  attemptsLeft: z.int(),
});

export const RequestLocationReviewInput = z.object({
  note: z.string().check(z.trim(), z.minLength(10), z.maxLength(500)),
});

export const LocationReviewSummary = z.object({
  homeId: z.string(),
  displayName: z.string(),
  cityId: z.string(),
  note: z.string(),
  requestedAt: z.string(),
  lastCheck: z.nullable(
    z.object({
      result: z.enum(LOCATION_RESULTS),
      distanceKm: z.int(),
      accuracyM: z.number(),
    }),
  ),
});
export type LocationReviewSummary = z.infer<typeof LocationReviewSummary>;

export const AdminListLocationReviewsOutput = z.object({ items: z.array(LocationReviewSummary) });

export const AdminDecideLocationReviewInput = z.object({
  homeId: z.string().check(z.minLength(1), z.maxLength(128)),
  decision: z.enum(REVIEW_DECISIONS),
  reason: z.string().check(z.trim(), z.minLength(3), z.maxLength(1000)),
});
export const AdminDecideLocationReviewOutput = z.object({
  homeId: z.string(),
  locationCheck: z.enum(LOCATION_CHECK_STATUS),
});

/** FR-49 — home dashboard KPIs (counters of later milestones are 0 until they exist). */
export const AdminDashboardOutput = z.object({
  pendingVerifications: z.object({ count: z.int(), oldestAt: z.nullable(z.string()) }),
  pendingLocationReviews: z.int(),
  openReports: z.int(),
  newUsers7d: z.int(),
  cities: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(CITY_STATUS),
      visibleCandidates: z.int(),
      threshold: z.int(),
      foundersAwarded: z.int(),
    }),
  ),
  matches7d: z.int(),
  exchangesConfirmed30d: z.int(),
  premiumBySource: z.record(z.enum(PREMIUM_SOURCE), z.int()),
});
export type AdminDashboardOutput = z.infer<typeof AdminDashboardOutput>;
