import { z } from 'zod';
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

const Name = z.string().trim().min(1).max(60);
const Version = z.string().min(1).max(40);
const IsoInstant = z.iso.datetime({ offset: true });

/** FR-01 — completeSignup (05 §2.1). The Auth user already exists (email or Google). */
export const CompleteSignupInput = z.object({
  firstName: Name,
  lastName: Name,
  birthDate: IsoDateSchema,
  referralCode: z.string().trim().max(20).optional(),
  acceptedTerms: Version,
  acceptedPrivacy: Version,
});
export type CompleteSignupInput = z.infer<typeof CompleteSignupInput>;

/** 05 §4 — `Me`: the signed-in user as the app needs it (computed by the server). */
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
    percent: z.number().int().min(0).max(100),
  }),
  home: z
    .object({
      id: z.string(),
      status: z.enum(HOME_STATUS),
      visible: z.boolean(),
      cityId: z.string().nullable(),
    })
    .nullable(),
  city: z
    .object({
      id: z.string(),
      name: z.string(),
      status: z.enum(CITY_STATUS),
      progress: z.object({ count: z.number().int(), threshold: z.number().int() }),
    })
    .nullable(),
  premium: z.object({
    active: z.boolean(),
    until: IsoInstant.nullable(),
    source: z.enum(PREMIUM_SOURCE).nullable(),
    plan: z.enum(['MONTHLY', 'YEARLY']).nullable(),
    cancelAtPeriodEnd: z.boolean(),
    canWithdraw: z.boolean(),
  }),
  likes: z.object({ remainingToday: z.number().int().nullable(), resetsAt: IsoInstant }),
  canLike: z.boolean(),
  blockers: z.array(z.enum(BLOCKERS)),
  legalPending: z.array(
    z.object({ slug: z.string(), version: z.string(), requiresReacceptance: z.boolean() }),
  ),
  foundingMember: z.boolean(),
  referralCode: z.string(),
  roles: z.array(z.enum(ADMIN_ROLES)),
  settings: z.object({ theme: z.enum(THEME_PREFERENCES) }),
});
export type Me = z.infer<typeof MeSchema>;

export const CompleteSignupOutput = z.object({ me: MeSchema });
export type CompleteSignupOutput = z.infer<typeof CompleteSignupOutput>;

export const GetMeInput = z.object({}).strict();
export const GetMeOutput = MeSchema;

/** updateSettings — theme (C-26) now; notification preferences arrive in M8. */
export const UpdateSettingsInput = z
  .object({ theme: z.enum(THEME_PREFERENCES).optional() })
  .strict();
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsInput>;
export const OkOutput = z.object({ ok: z.literal(true) });
export type OkOutput = z.infer<typeof OkOutput>;

/** FR-07 — confirmPhoneLinked. */
export const ConfirmPhoneLinkedInput = z.object({}).strict();
export const ConfirmPhoneLinkedOutput = z.object({ phoneVerified: z.literal(true) });

/** FR-58 / BR-35 — acceptLegalDocs. */
export const AcceptLegalDocsInput = z.object({
  items: z
    .array(z.object({ slug: z.string().min(1).max(60), version: Version }))
    .min(1)
    .max(10),
});
export type AcceptLegalDocsInput = z.infer<typeof AcceptLegalDocsInput>;

/** FR-71 — signOutEverywhere (recent sign-in required). */
export const SignOutEverywhereInput = z.object({}).strict();
