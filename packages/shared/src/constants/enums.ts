/** Closed lists from 04_DATABASE_SCHEMA.md §2 (unions of literals, never TS enums). */

export const USER_STATUS = [
  'ACTIVE',
  'SUSPENDED',
  'BANNED',
  'DELETION_PENDING',
  'DELETED',
] as const;
export type UserStatus = (typeof USER_STATUS)[number];

export const IDENTITY_STATUS = [
  'NONE',
  'PENDING',
  'INFO_REQUESTED',
  'APPROVED',
  'REJECTED',
] as const;
export type IdentityStatus = (typeof IDENTITY_STATUS)[number];

export const HOME_STATUS = ['DRAFT', 'PUBLISHED', 'PAUSED', 'HIDDEN_BY_ADMIN'] as const;
export type HomeStatus = (typeof HOME_STATUS)[number];

export const CITY_STATUS = ['WAITLIST', 'OPEN', 'CLOSED'] as const;
export type CityStatus = (typeof CITY_STATUS)[number];

export const PREMIUM_SOURCE = ['STRIPE', 'FOUNDER', 'REFERRAL', 'ADMIN'] as const;
export type PremiumSource = (typeof PREMIUM_SOURCE)[number];

export const ADMIN_ROLES = ['admin', 'superadmin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** DEC-82 — User theme preference; `system` follows prefers-color-scheme. */
export const THEME_PREFERENCES = ['system', 'light', 'dark', 'black'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Resolved theme actually applied to `<html data-theme>`. */
export const THEMES = ['light', 'dark', 'black'] as const;
export type Theme = (typeof THEMES)[number];

/** 05_API_CONTRACT.md §1 — guard abbreviations used by callables. */
export const GUARDS = ['EV', 'PV', 'ID', 'ACT', 'LEG', 'CO'] as const;
export type Guard = (typeof GUARDS)[number];

export const WAITLIST_STATUS = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'CONVERTED',
  'UNSUBSCRIBED',
] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUS)[number];

/** 04_DATABASE_SCHEMA.md §2.20 — legal document slugs. */
export const LEGAL_DOC_SLUGS = [
  'aviso-legal',
  'terminos',
  'privacidad',
  'cookies',
  'normas-comunidad',
  'info-dsa',
  'declaracion-responsable',
  'autorizacion-arrendador',
  'acuerdo-intercambio',
] as const;
export type LegalDocSlug = (typeof LEGAL_DOC_SLUGS)[number];

export const MAIL_STATUS = ['QUEUED', 'SENT', 'FAILED'] as const;
export type MailStatus = (typeof MAIL_STATUS)[number];

/** Email templates (02_UX_UI_SPEC.md §8). Grows milestone by milestone. */
export const EMAIL_TEMPLATES = ['N-02', 'N-03', 'N-04', 'N-13', 'N-19', 'N-23', 'N-27'] as const;
export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[number];

/** 05_API_CONTRACT.md §4 — reasons why a user cannot like yet (BR-05), in resolution order. */
export const BLOCKERS = [
  'ACCOUNT_RESTRICTED',
  'EMAIL',
  'PHONE',
  'HOME_INCOMPLETE',
  'NO_AVAILABILITY',
  'IDENTITY_MISSING',
  'IDENTITY_PENDING',
  'IDENTITY_REJECTED',
  'DECLARATION',
  'HOME_NOT_PUBLISHED',
  'CITY_WAITLIST',
  'LEGAL_OUTDATED',
] as const;
export type Blocker = (typeof BLOCKERS)[number];

/** 04 §2.21 — kinds of legal acceptance. */
export const LEGAL_ACCEPTANCE_TYPES = [
  'TERMS',
  'PRIVACY',
  'DECLARATION',
  'WITHDRAWAL_START',
  'COMMUNITY_RULES',
] as const;
export type LegalAcceptanceType = (typeof LEGAL_ACCEPTANCE_TYPES)[number];

/** Legal texts every user accepts at sign-up (FR-01) and must keep accepted (BR-35, FR-58). */
export const SIGNUP_LEGAL_DOCS = {
  terminos: 'TERMS',
  privacidad: 'PRIVACY',
} as const satisfies Partial<Record<LegalDocSlug, LegalAcceptanceType>>;
export type SignupLegalSlug = keyof typeof SIGNUP_LEGAL_DOCS;

/** 04 §2.2 — who the user usually travels with (FR-04). */
export const TRAVELS_WITH = ['SOLO', 'COUPLE', 'FAMILY', 'FRIENDS'] as const;
export type TravelsWith = (typeof TRAVELS_WITH)[number];

/** FR-66 — help center categories. */
export const FAQ_CATEGORIES = [
  'START',
  'VERIFICATION',
  'LIKES_MATCH',
  'CHAT_SAFETY',
  'EXCHANGES',
  'PREMIUM_PAYMENTS',
  'PRIVACY',
  'REPORTS',
] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const REFERRAL_STATUS = ['REGISTERED', 'REWARDED', 'INELIGIBLE'] as const;
export type ReferralStatus = (typeof REFERRAL_STATUS)[number];

/** FR-06 — onboarding steps 1..6. */
export const ONBOARDING_STEPS = [1, 2, 3, 4, 5, 6] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** 04 §2.3 — home attributes (FR-10). */
export const HOME_TYPES = [
  'FLAT',
  'HOUSE',
  'STUDIO',
  'PENTHOUSE',
  'DUPLEX',
  'VILLA',
  'OTHER',
] as const;
export type HomeType = (typeof HOME_TYPES)[number];

export const TENURES = ['OWNER', 'TENANT'] as const;
export type Tenure = (typeof TENURES)[number];

export const RESIDENCE_USES = ['PRIMARY', 'SECONDARY'] as const;
export type ResidenceUse = (typeof RESIDENCE_USES)[number];

/** FR-10 — closed list of amenities. */
export const AMENITIES = [
  'WIFI',
  'KITCHEN',
  'WASHER',
  'AIR_CONDITIONING',
  'HEATING',
  'ELEVATOR',
  'TERRACE',
  'POOL',
  'PARKING',
  'KIDS_FRIENDLY',
  'WORKSPACE',
  'ACCESSIBLE',
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const DESTINATION_MODES = ['LIST', 'ANY_OPEN'] as const;
export type DestinationMode = (typeof DESTINATION_MODES)[number];

export const HOLD_REASONS = ['PHOTO_DUPLICATE', 'PHOTO_CHANGES', 'CITY_CHANGE', 'REPORT'] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

export const LOCATION_CHECK_STATUS = [
  'NONE',
  'PASS',
  'FAIL',
  'MANUAL_PENDING',
  'MANUAL_APPROVED',
  'MANUAL_REJECTED',
] as const;
export type LocationCheckStatus = (typeof LOCATION_CHECK_STATUS)[number];

/** Legal slug of the responsible declaration accepted per home (FR-12). */
export const DECLARATION_SLUG = 'declaracion-responsable';

/** 04 §2.10 — document proving the relation with the home (FR-08). */
export const PROPERTY_DOC_TYPES = [
  'DEED',
  'LAND_REGISTRY_NOTE',
  'IBI_RECEIPT',
  'RENTAL_CONTRACT',
  'UTILITY_BILL',
] as const;
export type PropertyDocType = (typeof PROPERTY_DOC_TYPES)[number];

/** 04 §2.10 — files of an identity verification (Storage `private/verifications/{uid}/{id}/{key}`). */
export const VERIFICATION_FILES = [
  'idFront',
  'idBack',
  'selfie',
  'propertyDoc',
  'landlordAuthorization',
] as const;
export type VerificationFile = (typeof VERIFICATION_FILES)[number];

export const VERIFICATION_STATUS = ['PENDING', 'INFO_REQUESTED', 'APPROVED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[number];

export const VERIFICATION_DECISIONS = ['APPROVE', 'REJECT', 'REQUEST_INFO'] as const;
export type VerificationDecision = (typeof VERIFICATION_DECISIONS)[number];

/** BR-39 — outcome of one location reading. */
export const LOCATION_RESULTS = ['PASS', 'FAIL', 'INACCURATE'] as const;
export type LocationResult = (typeof LOCATION_RESULTS)[number];

export const REVIEW_DECISIONS = ['APPROVE', 'REJECT'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

/** 04 §2.27 — admin alert types (VERIFICATION_DUPLICATE added in M4, 10_DECISIONS §5). */
export const ADMIN_ALERT_TYPES = [
  'REPORT_HIGH',
  'PHOTO_DUPLICATE',
  'HOLD_DUE',
  'COMPLAINT_DUE',
  'LOCATION_MANUAL',
  'VERIFICATION_DUPLICATE',
] as const;
export type AdminAlertType = (typeof ADMIN_ALERT_TYPES)[number];
