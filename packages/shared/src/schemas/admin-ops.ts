import { z } from 'zod';
import {
  ADMIN_ROLES,
  CITY_STATUS,
  IDENTITY_STATUS,
  LEGAL_DOC_SLUGS,
  PREMIUM_SOURCE,
  USER_STATUS,
} from '../constants/enums.js';
import { IsoDateSchema, PaginationInput } from './common.js';
import { ParamsSchema } from './config.js';
import { ModerationActionView, StatementInput, StrikeView } from './moderation.js';

const Uid = z.string().min(1).max(128);

/** FR-50 — users. */
export const UserAdminSummary = z.object({
  uid: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  phoneE164: z.string().nullable(),
  cityId: z.string().nullable(),
  status: z.enum(USER_STATUS),
  identity: z.enum(IDENTITY_STATUS),
  premiumUntil: z.string().nullable(),
  premiumSource: z.enum(PREMIUM_SOURCE).nullable(),
  role: z.enum(ADMIN_ROLES).nullable(),
  createdAt: z.string().nullable(),
});
export type UserAdminSummary = z.infer<typeof UserAdminSummary>;

export const AdminSearchUsersInput = PaginationInput.extend({
  q: z.string().trim().min(2).max(120),
});
export const AdminSearchUsersOutput = z.object({
  items: z.array(UserAdminSummary),
  nextCursor: z.string().nullable(),
});

export const AdminGetUserInput = z.object({ uid: Uid });
export const AdminGetUserOutput = z.object({
  user: UserAdminSummary.extend({
    strikesActive: z.number().int(),
    suspendedUntil: z.string().nullable(),
    onboardingStep: z.number().int(),
  }),
  home: z
    .object({
      title: z.string(),
      status: z.string(),
      visible: z.boolean(),
      hold: z.string().nullable(),
      hiddenByModeration: z.boolean(),
    })
    .nullable(),
  matchesCount: z.number().int(),
  reports: z.array(
    z.object({ id: z.string(), reason: z.string(), status: z.string(), createdAt: z.string() }),
  ),
  actions: z.array(ModerationActionView),
  strikes: z.array(StrikeView),
  entitlements: z.array(
    z.object({
      id: z.string(),
      source: z.enum(PREMIUM_SOURCE),
      startsAt: z.string(),
      endsAt: z.string(),
      revoked: z.boolean(),
      reason: z.string().nullable(),
    }),
  ),
  audit: z.array(AuditView()),
});
export type AdminGetUserOutput = z.infer<typeof AdminGetUserOutput>;

export const AdminGrantPremiumInput = z.object({
  uid: Uid,
  days: z.number().int().min(1).max(365),
  reason: z.string().trim().min(5).max(300),
});
export const AdminGrantPremiumOutput = z.object({ premiumUntil: z.string().nullable() });

/** FR-50 — suspend, ban or reactivate (restrictive changes need a statement, BR-27). */
export const AdminSetUserStatusInput = z.object({
  uid: Uid,
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  suspendedUntil: z.iso.datetime().optional(),
  statement: StatementInput.optional(),
});
export const AdminSetRoleInput = z.object({ uid: Uid, role: z.enum(ADMIN_ROLES).nullable() });

/** FR-51 — cities and windows (counters are server-maintained and never edited here). */
const Slug = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const AdminUpsertCityInput = z.object({
  id: Slug,
  name: z.string().trim().min(2).max(80),
  province: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  timezone: z.enum(['Europe/Madrid', 'Atlantic/Canary']),
  center: z.object({ lat: z.number().min(27).max(44), lng: z.number().min(-19).max(5) }),
  radiusKm: z.number().min(1).max(100),
  status: z.enum(CITY_STATUS),
  openThreshold: z.number().int().positive(),
  order: z.number().int().min(0).max(1000),
});
export type AdminUpsertCityInput = z.infer<typeof AdminUpsertCityInput>;
export const AdminUpsertWindowInput = z
  .object({
    id: Slug,
    name: z.string().trim().min(2).max(80),
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    active: z.boolean(),
    cityIds: z.array(Slug).nullable(),
    order: z.number().int().min(0).max(1000),
  })
  .refine((window) => window.startDate < window.endDate, {
    path: ['endDate'],
    message: 'before_start',
  });
export type AdminUpsertWindowInput = z.infer<typeof AdminUpsertWindowInput>;
export const AdminCatalogOutput = z.object({
  cities: z.array(
    AdminUpsertCityInput.extend({
      counters: z.object({
        visibleCandidates: z.number().int(),
        waitlist: z.number().int(),
        foundersAwarded: z.number().int(),
      }),
    }),
  ),
  windows: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      active: z.boolean(),
      cityIds: z.array(z.string()).nullable(),
      order: z.number().int(),
    }),
  ),
});

/** FR-52 — parameters (SADM). */
export const AdminParamsOutput = z.object({ params: ParamsSchema });
export const AdminUpdateParamsInput = ParamsSchema.partial();

/** FR-56 — legal texts with versions (SADM). */
export const AdminGetLegalDocInput = z.object({ slug: z.enum(LEGAL_DOC_SLUGS) });
export const AdminGetLegalDocOutput = z.object({
  slug: z.enum(LEGAL_DOC_SLUGS),
  title: z.string(),
  currentVersion: z.string().nullable(),
  markdown: z.string(),
  versions: z.array(
    z.object({
      version: z.string(),
      publishedAt: z.string().nullable(),
      requiresReacceptance: z.boolean(),
      changeSummary: z.string(),
    }),
  ),
});
export const AdminPublishLegalDocInput = z.object({
  slug: z.enum(LEGAL_DOC_SLUGS),
  markdown: z.string().trim().min(50).max(200_000),
  requiresReacceptance: z.boolean(),
  changeSummary: z.string().trim().min(5).max(500),
});
export const AdminPublishLegalDocOutput = z.object({ version: z.string() });

/** FR-54 — metrics (funnel by city, Premium, demand, sponsored clicks). */
export const AdminGetMetricsInput = z.object({
  from: IsoDateSchema,
  to: IsoDateSchema,
  cityId: Slug.optional(),
});
export const FUNNEL_STEPS = [
  'registered',
  'phoneVerified',
  'homePublished',
  'identityApproved',
  'firstLike',
  'matched',
  'exchangeConfirmed',
  'reviewed',
] as const;
export const AdminGetMetricsOutput = z.object({
  funnel: z.array(z.object({ step: z.enum(FUNNEL_STEPS), count: z.number().int() })),
  premium: z.object({
    active: z.number().int(),
    bySource: z.record(z.string(), z.number().int()),
    conversionPercent: z.number(),
  }),
  demand: z.array(
    z.object({
      fromCityId: z.string(),
      toCityId: z.string(),
      windowId: z.string(),
      count: z.number().int(),
    }),
  ),
  sponsored: z.array(
    z.object({ partnerId: z.string(), name: z.string(), clicks: z.number().int() }),
  ),
  truncated: z.boolean(),
});
export type AdminGetMetricsOutput = z.infer<typeof AdminGetMetricsOutput>;
export const AdminExportCsvInput = z.object({
  report: z.enum(['FUNNEL', 'DEMAND', 'USERS']),
  from: IsoDateSchema,
  to: IsoDateSchema,
});
export const UrlWithExpiryOutput = z.object({ url: z.string(), expiresAt: z.string() });

/** FR-55 — audit (SADM). */
function AuditView() {
  return z.object({
    id: z.string(),
    actorUid: z.string(),
    actorRole: z.string(),
    action: z.string(),
    targetType: z.string(),
    targetId: z.string(),
    reason: z.string().nullable(),
    createdAt: z.string().nullable(),
  });
}
export const AuditEntryView = AuditView();
export const AdminListAuditInput = PaginationInput.extend({
  targetType: z.string().min(1).max(40).optional(),
  targetId: z.string().min(1).max(256).optional(),
  actorUid: z.string().min(1).max(128).optional(),
});
export const AdminListAuditOutput = z.object({
  items: z.array(AuditEntryView),
  nextCursor: z.string().nullable(),
});
