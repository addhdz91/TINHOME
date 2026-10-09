import { z } from 'zod';

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const cents = z.number().int().nonnegative();

/** Validates `config/params` (01_PRD.md §9). */
export const ParamsSchema = z.object({
  freeDailyLikes: positiveInt,
  premiumHourlyLikeCap: positiveInt,
  passHideDays: positiveInt,
  topMinRating: z.number().min(1).max(5),
  topMinReviews: positiveInt,
  exchangeMaxNights: positiveInt,
  withdrawalRefundMode: z.enum(['FULL', 'PRORATED']),
  withdrawalDays: positiveInt,
  foundersPerCity: nonNegativeInt,
  founderPremiumMonths: nonNegativeInt,
  referralRewardDays: nonNegativeInt,
  referralMaxRewardsPerYear: nonNegativeInt,
  cityOpenThreshold: positiveInt,
  verificationDocsRetentionDays: positiveInt,
  rankingWeights: z.array(z.number().nonnegative()).length(7),
  appealWindowMonths: positiveInt,
  sponsoredEveryNCards: positiveInt,
  accountPurgeDays: positiveInt,
  gdprResponseDays: positiveInt,
  moderationRetentionYears: positiveInt,
  demandCounterMin: positiveInt,
  exchangeProposalExpiryDays: positiveInt,
  reviewWindowDays: positiveInt,
  premiumMonthlyPriceCents: cents,
  premiumYearlyPriceCents: cents,
  maxDestinations: positiveInt,
  maxFlexibleRanges: positiveInt,
  photosMin: positiveInt,
  photosMax: positiveInt,
  sponsoredInsuranceEnabled: z.boolean(),
  premiumMessageLikesPerDay: nonNegativeInt,
  chatMessageMaxLength: positiveInt,
  chatMessagesPerMinute: positiveInt,
  locationDefaultRadiusKm: positiveInt,
  strikeExpiryMonths: positiveInt,
  strikeSuspensionDays: positiveInt,
  strikesForBan: positiveInt,
  preventiveHoldReportsThreshold: positiveInt,
  preventiveHoldReviewHours: positiveInt,
  preventiveHoldReviewHoursHighPriority: positiveInt,
  photoDuplicateMaxHamming: z.number().int().min(0).max(7),
  photoChangeReviewRatio: z.number().min(0).max(1),
  complaintResponseDays: positiveInt,
  chatRetentionMonthsAfterClose: positiveInt,
  premiumMessageMaxLength: positiveInt,
});

/** Validates `config/public`. */
export const PublicConfigSchema = ParamsSchema.pick({
  freeDailyLikes: true,
  premiumMonthlyPriceCents: true,
  premiumYearlyPriceCents: true,
  photosMin: true,
  photosMax: true,
  maxDestinations: true,
  maxFlexibleRanges: true,
  exchangeMaxNights: true,
  withdrawalDays: true,
  sponsoredEveryNCards: true,
});
