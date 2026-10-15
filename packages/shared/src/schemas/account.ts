import { z } from 'zod/mini';
import {
  ADMIN_ROLES,
  BLOCKERS,
  CITY_STATUS,
  HOME_STATUS,
  IDENTITY_STATUS,
  ONBOARDING_STEPS,
  PREMIUM_SOURCE,
  THEME_PREFERENCES,
  USER_STATUS,
} from '../constants/enums.js';
import { IsoDateSchema } from './common.js';

const Name = z.string().check(z.trim(), z.minLength(1), z.maxLength(60));
const Version = z.string().check(z.minLength(1), z.maxLength(40));
const IsoInstant = z.iso.datetime({ offset: true });

/** FR-01 — completeSignup (05 §2.1). The Auth user already exists (email or Google). */
export const CompleteSignupInput = z.object({
  firstName: Name,
  lastName: Name,
  birthDate: IsoDateSchema,
  referralCode: z.optional(z.string().check(z.trim(), z.maxLength(20))),
  acceptedTerms: Version,
  acceptedPrivacy: Version,
});
export type CompleteSignupInput = z.infer<typeof CompleteSignupInput>;

/** 05 §4 — `Me`: the signed-in user as the app needs it (computed by the server). */
const ChannelPreferences = z.strictObject({
  email: z.optional(z.boolean()),
  push: z.optional(z.boolean()),
});
/** SERVICE and LEGAL cannot be turned off, so they are not accepted here (FR-46). */
export const NotificationPreferencesSchema = z.strictObject({
  MATCHES: z.optional(ChannelPreferences),
  MESSAGES: z.optional(ChannelPreferences),
  LIKES: z.optional(ChannelPreferences),
  EXCHANGES: z.optional(ChannelPreferences),
  REVIEWS: z.optional(ChannelPreferences),
});
export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;

export const MeSchema = z.object({
  uid: z.string(),
  email: z.string(),
  firstName: z.string(),
  status: z.enum(USER_STATUS),
  verification: z.object({
    emailVerified: z.boolean(),
    phoneVerified: z.boolean(),
    identity: z.enum(IDENTITY_STATUS),
  }),
  onboarding: z.object({
    step: z.union(ONBOARDING_STEPS.map((step) => z.literal(step))),
    completed: z.boolean(),
    percent: z.int().check(z.gte(0), z.lte(100)),
  }),
  home: z.nullable(
    z.object({
      id: z.string(),
      status: z.enum(HOME_STATUS),
      visible: z.boolean(),
      cityId: z.nullable(z.string()),
    }),
  ),
  city: z.nullable(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(CITY_STATUS),
      progress: z.object({ count: z.int(), threshold: z.int() }),
    }),
  ),
  premium: z.object({
    active: z.boolean(),
    until: z.nullable(IsoInstant),
    source: z.nullable(z.enum(PREMIUM_SOURCE)),
    plan: z.nullable(z.enum(['MONTHLY', 'YEARLY'])),
    cancelAtPeriodEnd: z.boolean(),
    canWithdraw: z.boolean(),
  }),
  likes: z.object({ remainingToday: z.nullable(z.int()), resetsAt: IsoInstant }),
  canLike: z.boolean(),
  blockers: z.array(z.enum(BLOCKERS)),
  legalPending: z.array(
    z.object({ slug: z.string(), version: z.string(), requiresReacceptance: z.boolean() }),
  ),
  foundingMember: z.boolean(),
  referralCode: z.string(),
  roles: z.array(z.enum(ADMIN_ROLES)),
  settings: z.object({
    theme: z.enum(THEME_PREFERENCES),
    /** FR-46 / FR-70 — opt-outs by category and channel (missing = on). */
    notifications: NotificationPreferencesSchema,
    /** 03 §17 — show the message text in push notifications (off by default). */
    pushPreview: z.boolean(),
  }),
});
export type Me = z.infer<typeof MeSchema>;

export const CompleteSignupOutput = z.object({ me: MeSchema });
export type CompleteSignupOutput = z.infer<typeof CompleteSignupOutput>;

export const GetMeInput = z.strictObject({});
export const GetMeOutput = MeSchema;

/** updateSettings — theme (C-26), notification preferences and push preview (M8). */
export const UpdateSettingsInput = z.strictObject({
  theme: z.optional(z.enum(THEME_PREFERENCES)),
  notifications: z.optional(NotificationPreferencesSchema),
  pushPreview: z.optional(z.boolean()),
});
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsInput>;
export const OkOutput = z.object({ ok: z.literal(true) });
export type OkOutput = z.infer<typeof OkOutput>;

/** FR-07 — confirmPhoneLinked. */
export const ConfirmPhoneLinkedInput = z.strictObject({});
export const ConfirmPhoneLinkedOutput = z.object({ phoneVerified: z.literal(true) });

/** FR-58 / BR-35 — acceptLegalDocs. */
export const AcceptLegalDocsInput = z.object({
  items: z
    .array(z.object({ slug: z.string().check(z.minLength(1), z.maxLength(60)), version: Version }))
    .check(z.minLength(1), z.maxLength(10)),
});
export type AcceptLegalDocsInput = z.infer<typeof AcceptLegalDocsInput>;

/** FR-71 — signOutEverywhere (recent sign-in required). */
export const SignOutEverywhereInput = z.strictObject({});
