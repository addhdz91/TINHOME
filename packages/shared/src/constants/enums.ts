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
export const EMAIL_TEMPLATES = ['N-02', 'N-19', 'N-27'] as const;
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
