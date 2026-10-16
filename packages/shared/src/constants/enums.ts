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
export const EMAIL_TEMPLATES = [
  'N-02',
  'N-03',
  'N-04',
  'N-05',
  'N-06',
  'N-07',
  'N-08',
  'N-09',
  'N-10',
  'N-11',
  'N-12',
  'N-13',
  'N-14',
  'N-15',
  'N-16',
  'N-17',
  'N-18',
  'N-19',
  'N-20',
  'N-21',
  'N-23',
  'N-24',
  'N-25',
  'N-26',
  'N-27',
  'N-30',
] as const;
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
  'COOKIES',
  'MARKETING_OPT_IN',
  'MARKETING_OPT_OUT',
] as const;
export type LegalAcceptanceType = (typeof LEGAL_ACCEPTANCE_TYPES)[number];

/** Legal texts every user accepts at sign-up (FR-01) and must keep accepted (BR-35, FR-58). */
export const SIGNUP_LEGAL_DOCS = {
  terminos: 'TERMS',
  privacidad: 'PRIVACY',
  cookies: 'COOKIES',
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

export const HOLD_REASONS = [
  'PHOTO_DUPLICATE',
  'PHOTO_CHANGES',
  'CITY_CHANGE',
  'REPORT',
  'REPORTS_THRESHOLD',
] as const;
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
  'REPORT_DUE',
  'HOLD_OVERDUE',
] as const;
export type AdminAlertType = (typeof ADMIN_ALERT_TYPES)[number];

/** 04 §2.6 — match states. */
export const MATCH_STATUS = ['ACTIVE', 'UNMATCHED', 'BLOCKED'] as const;
export type MatchStatus = (typeof MATCH_STATUS)[number];

/** 04 §2.7b — chat message kinds. */
export const MESSAGE_TYPES = ['TEXT', 'SYSTEM', 'PHONE_SHARED', 'PREMIUM_LIKE_MESSAGE'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

/** System messages shown in the chat (FR-60). */
export const SYSTEM_CODES = [
  'MATCH_CREATED',
  'PHONE_SHARED',
  'EXCHANGE_PROPOSED',
  'EXCHANGE_CONFIRMED',
  'EXCHANGE_DECLINED',
  'EXCHANGE_CANCELLED',
  'EXCHANGE_EXPIRED',
  'EXCHANGE_COMPLETED',
] as const;
export type SystemCode = (typeof SYSTEM_CODES)[number];

/** FR-35 — Premium plans (P-21 / P-22). */
export const PREMIUM_PLANS = ['MONTHLY', 'YEARLY'] as const;
export type PremiumPlan = (typeof PREMIUM_PLANS)[number];

/** 04 §2.7 — exchange lifecycle (01_PRD.md §6). */
export const EXCHANGE_STATUS = [
  'PROPOSED',
  'CONFIRMED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
  'COMPLETED',
] as const;
export type ExchangeStatus = (typeof EXCHANGE_STATUS)[number];

/** S-09 — steps of the exchange timeline (IN_PROGRESS is derived from the dates). */
export const EXCHANGE_PHASES = ['PROPOSED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type ExchangePhase = (typeof EXCHANGE_PHASES)[number];

/** 04 §2.8 — double-blind reviews (BR-16). */
export const REVIEW_STATUS = ['PENDING', 'PUBLISHED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];
export const REVIEW_SUBSCORES = ['cleanliness', 'accuracy', 'communication', 'care'] as const;
export type ReviewSubscore = (typeof REVIEW_SUBSCORES)[number];

/**
 * FR-46 / BR-44 — notification categories for preferences. SERVICE and LEGAL cannot be turned
 * off (account, verification, billing, moderation and legal notices).
 */
export const NOTIFICATION_CATEGORIES = [
  'MATCHES',
  'MESSAGES',
  'LIKES',
  'EXCHANGES',
  'REVIEWS',
  'SERVICE',
  'LEGAL',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export const MANDATORY_NOTIFICATION_CATEGORIES = [
  'SERVICE',
  'LEGAL',
] as const satisfies readonly NotificationCategory[];

/** Channels a preference controls (the in-app notification center is always on). */
export const NOTIFICATION_CHANNELS = ['email', 'push'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Notification types written to `notifications/{uid}/items` (02 §8). */
export const NOTIFICATION_TYPES = [
  'N-02',
  'N-03',
  'N-04',
  'N-06',
  'N-07',
  'N-08',
  'N-09',
  'N-10',
  'N-11',
  'N-12',
  'N-13',
  'N-20',
  'N-21',
  'N-22',
  'N-23',
  'N-15',
  'N-16',
  'N-24',
  'N-25',
  'N-05',
  'N-17',
  'N-28',
  'N-18',
  'N-30',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** FR-42 / 04 §2.24 — what can be reported and why. */
export const REPORT_TARGETS = ['HOME', 'USER', 'REVIEW', 'MESSAGE'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export const REPORT_REASONS = [
  'PHOTOS_NOT_OWN',
  'RUDE',
  'HARASSMENT',
  'INAPPROPRIATE_MESSAGES',
  'FRAUD',
  'HIDDEN_RENTAL',
  'ILLEGAL',
  'PERSONAL_DATA',
  'OTHER',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
/** FR-44 — high priority (24 h, e-mail to admins): photos not theirs, fraud, harassment or threats, illegal. */
export const HIGH_PRIORITY_REASONS = [
  'PHOTOS_NOT_OWN',
  'FRAUD',
  'HARASSMENT',
  'ILLEGAL',
] as const satisfies readonly ReportReason[];
export const REPORT_STATUS = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUS)[number];
export const REPORT_PRIORITIES = ['HIGH', 'NORMAL'] as const;
export type ReportPriority = (typeof REPORT_PRIORITIES)[number];

/** FR-44 / 05 §2.12 — moderation actions. */
export const MODERATION_ACTIONS = [
  'DISMISS',
  'WARN',
  'HIDE_CONTENT',
  'HIDE_MESSAGE',
  'SUSPEND',
  'BAN',
  'RESTORE',
  'RELEASE_HOLD',
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];
/** BR-27 — actions that restrict someone and need a statement of reasons. */
export const RESTRICTIVE_ACTIONS = [
  'WARN',
  'HIDE_CONTENT',
  'HIDE_MESSAGE',
  'SUSPEND',
  'BAN',
] as const satisfies readonly ModerationAction[];
export const STATEMENT_GROUNDS = ['LAW', 'TERMS'] as const;
export type StatementGround = (typeof STATEMENT_GROUNDS)[number];
/** Statement-of-reasons templates (texts PROVISIONAL in es.json, reviewed by the lawyer). */
export const STATEMENT_TEMPLATES = [
  'PHOTOS_NOT_OWN',
  'RUDE',
  'HARASSMENT',
  'SPAM',
  'FRAUD',
  'HIDDEN_RENTAL',
  'ILLEGAL',
  'PERSONAL_DATA',
  'OTHER',
] as const;
export type StatementTemplate = (typeof STATEMENT_TEMPLATES)[number];
export const SANCTION_SUGGESTIONS = ['NONE', 'SUSPEND', 'BAN'] as const;
export type SanctionSuggestion = (typeof SANCTION_SUGGESTIONS)[number];
export const STRIKE_SEVERITY = ['MINOR', 'SERIOUS'] as const;
export type StrikeSeverity = (typeof STRIKE_SEVERITY)[number];
export const APPEAL_STATUS = ['OPEN', 'UPHELD', 'REJECTED'] as const;
export type AppealStatus = (typeof APPEAL_STATUS)[number];
export const APPEAL_DECISIONS = ['UPHOLD', 'REJECT'] as const;
export type AppealDecision = (typeof APPEAL_DECISIONS)[number];
export const HOLD_DECISIONS = ['RELEASE', 'CONFIRM'] as const;
export type HoldDecision = (typeof HOLD_DECISIONS)[number];

/** FR-67 — complaints and claims. */
export const COMPLAINT_CATEGORIES = [
  'ACCOUNT',
  'VERIFICATION',
  'PREMIUM_BILLING',
  'MODERATION_DECISION',
  'TECHNICAL',
  'OTHER',
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];
export const TICKET_STATUS = [
  'RECEIVED',
  'IN_REVIEW',
  'WAITING_USER',
  'RESOLVED',
  'CLOSED',
] as const;
export type TicketStatus = (typeof TICKET_STATUS)[number];

/** FR-47 — sponsored partners (TRAVEL_INSURANCE blocked while P-26 is false). */
export const PARTNER_CATEGORIES = [
  'CLEANING',
  'KEYS',
  'TRANSPORT',
  'LUGGAGE',
  'TRAVEL_INSURANCE',
  'OTHER',
] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];
export const SPONSORED_PLACEMENTS = ['MATCH', 'EXCHANGE', 'DECK'] as const;
export type SponsoredPlacement = (typeof SPONSORED_PLACEMENTS)[number];

/** FR-59 / 04 §2.27 — GDPR rights requests. */
export const GDPR_REQUEST_TYPES = [
  'ACCESS',
  'RECTIFICATION',
  'ERASURE',
  'OBJECTION',
  'RESTRICTION',
  'PORTABILITY',
] as const;
export type GdprRequestType = (typeof GDPR_REQUEST_TYPES)[number];
export const GDPR_REQUEST_STATUS = ['OPEN', 'DONE', 'REJECTED'] as const;
export type GdprRequestStatus = (typeof GDPR_REQUEST_STATUS)[number];

/** 03 §6 — closed list of analytics events (no personal data in their properties). */
export const ANALYTICS_EVENTS = [
  'signup_completed',
  'phone_verified',
  'home_published',
  'identity_submitted',
  'like_sent',
  'match_created',
  'exchange_confirmed',
  'review_submitted',
  'paywall_viewed',
  'checkout_started',
  'premium_activated',
  'invite_shared',
  'sponsored_clicked',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Where a legal acceptance was given (evidence record, `legalAcceptances.source`). */
export const CONSENT_SOURCES = [
  'SIGNUP',
  'REACCEPTANCE',
  'WAITLIST',
  'PUBLIC_COMPLAINT',
  'PUBLIC_REPORT',
  'HOME_DECLARATION',
  'PREMIUM_CHECKOUT',
  'SETTINGS',
] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

/** Legal texts asked as separate checkboxes in the forms (each with its own link). */
export const CONSENT_DOCS = ['terminos', 'privacidad', 'cookies'] as const;
export type ConsentDoc = (typeof CONSENT_DOCS)[number];

/**
 * Marketing segments of the admin subscribers panel, computed on the server from the
 * entitlements and the Stripe subscription (see `subscriberSegment`).
 */
export const SUBSCRIBER_SEGMENTS = [
  'PAID_ACTIVE',
  'PAID_CANCELING',
  'GIFTED',
  'LAPSED_PAID',
  'LAPSED_GIFTED',
  'FREE',
] as const;
export type SubscriberSegment = (typeof SUBSCRIBER_SEGMENTS)[number];
