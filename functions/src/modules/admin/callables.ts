import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '@tinhome/shared/constants';
import {
  AdminCatalogOutput,
  AdminDashboardOutput,
  AdminExportCsvInput,
  AdminGetLegalDocInput,
  AdminGetLegalDocOutput,
  AdminGetMetricsInput,
  AdminGetMetricsOutput,
  AdminGetUserInput,
  AdminGetUserOutput,
  AdminGrantPremiumInput,
  AdminGrantPremiumOutput,
  AdminListAuditInput,
  AdminListAuditOutput,
  AdminExportSubscribersInput,
  AdminExportSubscribersOutput,
  AdminGetSubscriberStatsInput,
  AdminGetSubscriberStatsOutput,
  AdminListConsentsInput,
  AdminListConsentsOutput,
  AdminListSubscribersInput,
  AdminListSubscribersOutput,
  AdminParamsOutput,
  AdminPublishLegalDocInput,
  AdminPublishLegalDocOutput,
  AdminSearchUsersInput,
  AdminSearchUsersOutput,
  AdminSetRoleInput,
  AdminSetUserStatusInput,
  AdminUpdateParamsInput,
  AdminUpsertCityInput,
  AdminUpsertWindowInput,
  EmptyInput,
  OkOutput,
  UrlWithExpiryOutput,
} from '@tinhome/shared/schemas';
import { viewAudit } from '../../core/audit.js';
import { defineCallable } from '../../core/callable.js';
import { clock } from '../../core/clock.js';
import { sha256Hex } from '../../core/crypto.js';
import { db } from '../../core/firebase.js';
import { requireAdmin, requireSuperadmin } from '../../core/guards.js';
import { logger } from '../../core/logger.js';
import { getParams } from '../../core/params.js';
import { listAudit } from './audit.js';
import * as catalog from './catalog.js';
import { listConsents } from './consents.js';
import { dashboard } from './dashboard.js';
import { recomputeDemand } from './demand.js';
import { getLegalDoc, publishLegalDoc } from './legal.js';
import { exportCsv, metrics } from './metrics.js';
import { exportSubscribers, listSubscribers, subscriberStats } from './subscribers.js';
import * as users from './users.js';

const ok = { ok: true as const };

/** FR-49 — ADM. */
export const adminGetDashboard = defineCallable(
  'adminGetDashboard',
  { input: EmptyInput, output: AdminDashboardOutput },
  async ({ request, now }) => {
    requireAdmin(request);
    return dashboard(db(), await getParams(), now);
  },
);

/** FR-50 — ADM. */
export const adminSearchUsers = defineCallable(
  'adminSearchUsers',
  { input: AdminSearchUsersInput, output: AdminSearchUsersOutput },
  async ({ input, request }) => {
    const actor = requireAdmin(request);
    // ASVS V7.1 — looking people up is auditable; only a hash of the query is kept.
    await viewAudit(
      actor,
      'user.search',
      'query',
      sha256Hex(input.q.trim().toLowerCase()).slice(0, 16),
    );
    return users.searchUsers(db(), input);
  },
);

export const adminGetUser = defineCallable(
  'adminGetUser',
  { input: AdminGetUserInput, output: AdminGetUserOutput },
  async ({ input, request, now }) => {
    const actor = requireAdmin(request);
    await viewAudit(actor, 'user.view', 'user', input.uid);
    return users.getUser(db(), input.uid, await getParams(), now);
  },
);

export const adminGrantPremium = defineCallable(
  'adminGrantPremium',
  { input: AdminGrantPremiumInput, output: AdminGrantPremiumOutput },
  async ({ input, request, now }) => users.grantPremium(db(), requireAdmin(request), input, now),
);

export const adminSetUserStatus = defineCallable(
  'adminSetUserStatus',
  { input: AdminSetUserStatusInput, output: OkOutput },
  async ({ input, request, now }) => {
    await users.setUserStatus(db(), requireAdmin(request), input, await getParams(), now);
    return ok;
  },
);

/** FR-48 — SADM. */
export const adminSetRole = defineCallable(
  'adminSetRole',
  { input: AdminSetRoleInput, output: OkOutput },
  async ({ input, request }) => {
    await users.setRole(db(), requireSuperadmin(request), input);
    return ok;
  },
);

/** FR-51 — read: ADM; write: SADM. */
export const adminGetCatalog = defineCallable(
  'adminGetCatalog',
  { input: EmptyInput, output: AdminCatalogOutput },
  async ({ request }) => {
    requireAdmin(request);
    return catalog.catalog(db());
  },
);

export const adminUpsertCity = defineCallable(
  'adminUpsertCity',
  { input: AdminUpsertCityInput, output: OkOutput },
  async ({ input, request, now }) => {
    await catalog.upsertCity(db(), requireSuperadmin(request), input, now);
    return ok;
  },
);

export const adminUpsertWindow = defineCallable(
  'adminUpsertWindow',
  { input: AdminUpsertWindowInput, output: OkOutput },
  async ({ input, request }) => {
    await catalog.upsertWindow(db(), requireSuperadmin(request), input);
    return ok;
  },
);

/** FR-52 — SADM. */
export const adminGetParams = defineCallable(
  'adminGetParams',
  { input: EmptyInput, output: AdminParamsOutput },
  async ({ request }) => {
    requireSuperadmin(request);
    return { params: await getParams() };
  },
);

export const adminUpdateParams = defineCallable(
  'adminUpdateParams',
  { input: AdminUpdateParamsInput, output: AdminParamsOutput },
  async ({ input, request }) => ({
    params: await catalog.updateParams(db(), requireSuperadmin(request), input, await getParams()),
  }),
);

/** FR-56 — SADM. */
export const adminGetLegalDoc = defineCallable(
  'adminGetLegalDoc',
  { input: AdminGetLegalDocInput, output: AdminGetLegalDocOutput },
  async ({ input, request }) => {
    requireSuperadmin(request);
    return getLegalDoc(db(), input.slug);
  },
);

export const adminPublishLegalDoc = defineCallable(
  'adminPublishLegalDoc',
  { input: AdminPublishLegalDocInput, output: AdminPublishLegalDocOutput },
  async ({ input, request, now }) => publishLegalDoc(db(), requireSuperadmin(request), input, now),
);

/** FR-54 — ADM. */
export const adminGetMetrics = defineCallable(
  'adminGetMetrics',
  {
    input: AdminGetMetricsInput,
    output: AdminGetMetricsOutput,
    options: { timeoutSeconds: 120, memory: '512MiB' },
  },
  async ({ input, request, now }) => {
    requireAdmin(request);
    return metrics(db(), input, now);
  },
);

export const adminExportCsv = defineCallable(
  'adminExportCsv',
  {
    input: AdminExportCsvInput,
    output: UrlWithExpiryOutput,
    options: { timeoutSeconds: 120, memory: '512MiB' },
  },
  async ({ input, request, now }) => {
    const actor = requireAdmin(request);
    await viewAudit(actor, 'export.csv', 'report', input.report);
    return exportCsv(db(), input, now);
  },
);

/** FR-55 — SADM. */
export const adminListAudit = defineCallable(
  'adminListAudit',
  { input: AdminListAuditInput, output: AdminListAuditOutput },
  async ({ input, request }) => {
    requireSuperadmin(request);
    return listAudit(db(), input);
  },
);

/** J-08 — 04:00 daily. */
export const jobRecomputeDemand = onSchedule(
  { region: REGION, timeZone: 'Europe/Madrid', schedule: '0 4 * * *', timeoutSeconds: 540 },
  async () => {
    logger.info('J-08', {
      published: await recomputeDemand(db(), await getParams()),
      at: clock.now().toISOString(),
    });
  },
);

/** BR-35 — SADM: legal acceptance evidence by account or e-mail (audited). */
export const adminListConsents = defineCallable(
  'adminListConsents',
  { input: AdminListConsentsInput, output: AdminListConsentsOutput },
  async ({ input, request }) => listConsents(db(), requireSuperadmin(request), input),
);

/** Subscribers panel (marketing) — SADM: segments and estimated MRR. */
export const adminGetSubscriberStats = defineCallable(
  'adminGetSubscriberStats',
  { input: AdminGetSubscriberStatsInput, output: AdminGetSubscriberStatsOutput },
  async ({ input, request, now }) => {
    requireSuperadmin(request);
    return subscriberStats(db(), input, await getParams(), now);
  },
);

/** Subscribers panel — SADM, audited (names and e-mails of a segment). */
export const adminListSubscribers = defineCallable(
  'adminListSubscribers',
  { input: AdminListSubscribersInput, output: AdminListSubscribersOutput },
  async ({ input, request, now }) => {
    const actor = requireSuperadmin(request);
    await viewAudit(actor, 'subscribers.list', 'segment', input.segment ?? 'ALL');
    return listSubscribers(db(), input, now);
  },
);

/** Campaign CSV — SADM, audited; only people who accepted commercial e-mails (FR-46). */
export const adminExportSubscribers = defineCallable(
  'adminExportSubscribers',
  {
    input: AdminExportSubscribersInput,
    output: AdminExportSubscribersOutput,
    options: { timeoutSeconds: 120, memory: '512MiB' },
  },
  async ({ input, request, now }) => {
    const actor = requireSuperadmin(request);
    await viewAudit(actor, 'subscribers.export', 'segment', input.segment ?? 'ALL');
    return exportSubscribers(db(), input, now);
  },
);
