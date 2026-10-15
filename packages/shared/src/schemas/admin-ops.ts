import { z } from 'zod/mini';
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

const Uid = z.string().check(z.minLength(1), z.maxLength(128));

/** FR-50 — users. */
export const UserAdminSummary = z.object({
  uid: z.string(),
  displayName: z.string(),
  email: z.nullable(z.string()),
  phoneE164: z.nullable(z.string()),
  cityId: z.nullable(z.string()),
  status: z.enum(USER_STATUS),
  identity: z.enum(IDENTITY_STATUS),
  premiumUntil: z.nullable(z.string()),
  premiumSource: z.nullable(z.enum(PREMIUM_SOURCE)),
  role: z.nullable(z.enum(ADMIN_ROLES)),
  createdAt: z.nullable(z.string()),
});
export type UserAdminSummary = z.infer<typeof UserAdminSummary>;

export const AdminSearchUsersInput = z.extend(PaginationInput, {
  q: z.string().check(z.trim(), z.minLength(2), z.maxLength(120)),
});
export const AdminSearchUsersOutput = z.object({
  items: z.array(UserAdminSummary),
  nextCursor: z.nullable(z.string()),
});

export const AdminGetUserInput = z.object({ uid: Uid });
export const AdminGetUserOutput = z.object({
  user: z.extend(UserAdminSummary, {
    strikesActive: z.int(),
    suspendedUntil: z.nullable(z.string()),
    onboardingStep: z.int(),
  }),
  home: z.nullable(
    z.object({
      title: z.string(),
      status: z.string(),
      visible: z.boolean(),
      hold: z.nullable(z.string()),
      hiddenByModeration: z.boolean(),
    }),
  ),
  matchesCount: z.int(),
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
      reason: z.nullable(z.string()),
    }),
  ),
  audit: z.array(AuditView()),
});
export type AdminGetUserOutput = z.infer<typeof AdminGetUserOutput>;

export const AdminGrantPremiumInput = z.object({
  uid: Uid,
  days: z.int().check(z.gte(1), z.lte(365)),
  reason: z.string().check(z.trim(), z.minLength(5), z.maxLength(300)),
});
export const AdminGrantPremiumOutput = z.object({ premiumUntil: z.nullable(z.string()) });

/** FR-50 — suspend, ban or reactivate (restrictive changes need a statement, BR-27). */
export const AdminSetUserStatusInput = z.object({
  uid: Uid,
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  suspendedUntil: z.optional(z.iso.datetime()),
  statement: z.optional(StatementInput),
});
export const AdminSetRoleInput = z.object({ uid: Uid, role: z.nullable(z.enum(ADMIN_ROLES)) });

/** FR-51 — cities and windows (counters are server-maintained and never edited here). */
const Slug = z
  .string()
  .check(z.minLength(2), z.maxLength(60), z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));
export const AdminUpsertCityInput = z.object({
  id: Slug,
  name: z.string().check(z.trim(), z.minLength(2), z.maxLength(80)),
  province: z.string().check(z.trim(), z.minLength(2), z.maxLength(80)),
  region: z.string().check(z.trim(), z.minLength(2), z.maxLength(80)),
  timezone: z.enum(['Europe/Madrid', 'Atlantic/Canary']),
  center: z.object({
    lat: z.number().check(z.gte(27), z.lte(44)),
    lng: z.number().check(z.gte(-19), z.lte(5)),
  }),
  radiusKm: z.number().check(z.gte(1), z.lte(100)),
  status: z.enum(CITY_STATUS),
  openThreshold: z.int().check(z.positive()),
  order: z.int().check(z.gte(0), z.lte(1000)),
});
export type AdminUpsertCityInput = z.infer<typeof AdminUpsertCityInput>;
export const AdminUpsertWindowInput = z
  .object({
    id: Slug,
    name: z.string().check(z.trim(), z.minLength(2), z.maxLength(80)),
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    active: z.boolean(),
    cityIds: z.nullable(z.array(Slug)),
    order: z.int().check(z.gte(0), z.lte(1000)),
  })
  .check(
    z.refine((window) => window.startDate < window.endDate, {
      path: ['endDate'],
      message: 'before_start',
    }),
  );
export type AdminUpsertWindowInput = z.infer<typeof AdminUpsertWindowInput>;
export const AdminCatalogOutput = z.object({
  cities: z.array(
    z.extend(AdminUpsertCityInput, {
      counters: z.object({
        visibleCandidates: z.int(),
        waitlist: z.int(),
        foundersAwarded: z.int(),
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
      cityIds: z.nullable(z.array(z.string())),
      order: z.int(),
    }),
  ),
});

/** FR-52 — parameters (SADM). */
export const AdminParamsOutput = z.object({ params: ParamsSchema });
export const AdminUpdateParamsInput = z.partial(ParamsSchema);

/** FR-56 — legal texts with versions (SADM). */
export const AdminGetLegalDocInput = z.object({ slug: z.enum(LEGAL_DOC_SLUGS) });
export const AdminGetLegalDocOutput = z.object({
  slug: z.enum(LEGAL_DOC_SLUGS),
  title: z.string(),
  currentVersion: z.nullable(z.string()),
  markdown: z.string(),
  versions: z.array(
    z.object({
      version: z.string(),
      publishedAt: z.nullable(z.string()),
      requiresReacceptance: z.boolean(),
      changeSummary: z.string(),
    }),
  ),
});
export const AdminPublishLegalDocInput = z.object({
  slug: z.enum(LEGAL_DOC_SLUGS),
  markdown: z.string().check(z.trim(), z.minLength(50), z.maxLength(200_000)),
  requiresReacceptance: z.boolean(),
  changeSummary: z.string().check(z.trim(), z.minLength(5), z.maxLength(500)),
});
export const AdminPublishLegalDocOutput = z.object({ version: z.string() });

/** FR-54 — metrics (funnel by city, Premium, demand, sponsored clicks). */
export const AdminGetMetricsInput = z.object({
  from: IsoDateSchema,
  to: IsoDateSchema,
  cityId: z.optional(Slug),
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
  funnel: z.array(z.object({ step: z.enum(FUNNEL_STEPS), count: z.int() })),
  premium: z.object({
    active: z.int(),
    bySource: z.record(z.string(), z.int()),
    conversionPercent: z.number(),
  }),
  demand: z.array(
    z.object({
      fromCityId: z.string(),
      toCityId: z.string(),
      windowId: z.string(),
      count: z.int(),
    }),
  ),
  sponsored: z.array(z.object({ partnerId: z.string(), name: z.string(), clicks: z.int() })),
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
    reason: z.nullable(z.string()),
    createdAt: z.nullable(z.string()),
  });
}
export const AuditEntryView = AuditView();
export const AdminListAuditInput = z.extend(PaginationInput, {
  targetType: z.optional(z.string().check(z.minLength(1), z.maxLength(40))),
  targetId: z.optional(z.string().check(z.minLength(1), z.maxLength(256))),
  actorUid: z.optional(z.string().check(z.minLength(1), z.maxLength(128))),
});
export const AdminListAuditOutput = z.object({
  items: z.array(AuditEntryView),
  nextCursor: z.nullable(z.string()),
});
