import type { Params, PublicConfig } from '../types/config.js';

/**
 * Default values for `config/params` (01_PRD.md §9). The server reads the stored document and
 * falls back to these defaults; never hard-code a P-xx value elsewhere.
 */
export const PARAM_DEFAULTS = {
  freeDailyLikes: 10, // P-01
  premiumHourlyLikeCap: 60, // P-02
  passHideDays: 30, // P-03
  topMinRating: 4.5, // P-04
  topMinReviews: 3, // P-05
  exchangeMaxNights: 60, // P-06
  withdrawalRefundMode: 'FULL', // P-07 — TODO(DEC-63): confirm with the lawyer
  withdrawalDays: 14, // P-07D
  foundersPerCity: 100, // P-08
  founderPremiumMonths: 12, // P-09
  referralRewardDays: 30, // P-10
  referralMaxRewardsPerYear: 12, // P-11
  cityOpenThreshold: 150, // P-12
  verificationDocsRetentionDays: 30, // P-13
  rankingWeights: [30, 20, 25, 10, 8, 5, 2], // P-14W (W1..W7)
  appealWindowMonths: 6, // P-14R
  sponsoredEveryNCards: 12, // P-15
  accountPurgeDays: 30, // P-16
  gdprResponseDays: 30, // P-16R
  moderationRetentionYears: 5, // P-17 — TODO(DEC-61): pending lawyer
  demandCounterMin: 5, // P-18
  exchangeProposalExpiryDays: 7, // P-19
  reviewWindowDays: 14, // P-20
  premiumMonthlyPriceCents: 999, // P-21 — TODO(DEC-75): final price
  premiumYearlyPriceCents: 7900, // P-22 — TODO(DEC-75): final price
  maxDestinations: 5, // P-23
  maxFlexibleRanges: 5, // P-24
  photosMin: 5, // P-25
  photosMax: 20, // P-25
  sponsoredInsuranceEnabled: false, // P-26 — blocked until legal validation (LEG-04)
  premiumMessageLikesPerDay: 5, // P-27
  chatMessageMaxLength: 1000, // P-28
  chatMessagesPerMinute: 20, // P-29
  locationDefaultRadiusKm: 25, // P-30
  strikeExpiryMonths: 12, // P-31
  strikeSuspensionDays: 7, // P-32
  strikesForBan: 3, // P-33
  preventiveHoldReportsThreshold: 2, // P-34
  preventiveHoldReviewHours: 72, // P-35
  preventiveHoldReviewHoursHighPriority: 24, // P-35 (high priority)
  photoDuplicateMaxHamming: 6, // P-36
  photoChangeReviewRatio: 0.5, // P-37
  complaintResponseDays: 15, // P-38 — TODO(LEG-06): legal maximum
  chatRetentionMonthsAfterClose: 12, // P-39 — TODO(LEG-07)
  premiumMessageMaxLength: 280, // P-40
} as const satisfies Params;

/** Keys of `config/params` mirrored to the publicly readable `config/public` (04 §2.22). */
export const PUBLIC_PARAM_KEYS = [
  'freeDailyLikes',
  'premiumMonthlyPriceCents',
  'premiumYearlyPriceCents',
  'photosMin',
  'photosMax',
  'maxDestinations',
  'maxFlexibleRanges',
  'exchangeMaxNights',
  'withdrawalDays',
  'sponsoredEveryNCards',
] as const satisfies readonly (keyof Params)[];

/** Builds the `config/public` projection from the full parameter set. */
export function toPublicConfig(params: Params): PublicConfig {
  return {
    freeDailyLikes: params.freeDailyLikes,
    premiumMonthlyPriceCents: params.premiumMonthlyPriceCents,
    premiumYearlyPriceCents: params.premiumYearlyPriceCents,
    photosMin: params.photosMin,
    photosMax: params.photosMax,
    maxDestinations: params.maxDestinations,
    maxFlexibleRanges: params.maxFlexibleRanges,
    exchangeMaxNights: params.exchangeMaxNights,
    withdrawalDays: params.withdrawalDays,
    sponsoredEveryNCards: params.sponsoredEveryNCards,
  };
}
