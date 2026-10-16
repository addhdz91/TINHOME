import { z } from 'zod/mini';
import { PREMIUM_SOURCE, SUBSCRIBER_SEGMENTS } from '../constants/enums.js';
import { PaginationInput } from './common.js';

const CityId = z.string().check(z.minLength(1), z.maxLength(60), z.regex(/^[a-z0-9-]+$/));

/** Shared filters of the subscribers panel (all optional). */
const SubscriberFilters = {
  segment: z.optional(z.enum(SUBSCRIBER_SEGMENTS)),
  cityId: z.optional(CityId),
  /** Premium in force that ends within N days (renewing subscriptions excluded). */
  expiringWithinDays: z.optional(z.int().check(z.gte(1), z.lte(365))),
  /** Only people who accepted commercial e-mails (LSSI art. 21). */
  marketingOnly: z.optional(z.boolean()),
};

/** `adminGetSubscriberStats` (SADM): counts per segment for the panel's tiles. */
export const AdminGetSubscriberStatsInput = z.strictObject({ cityId: z.optional(CityId) });
export type AdminGetSubscriberStatsInput = z.infer<typeof AdminGetSubscriberStatsInput>;
export const AdminGetSubscriberStatsOutput = z.object({
  segments: z.array(
    z.object({
      segment: z.enum(SUBSCRIBER_SEGMENTS),
      count: z.int(),
      /** Of those, how many accepted commercial e-mails. */
      marketingOptIn: z.int(),
    }),
  ),
  plans: z.object({ monthly: z.int(), yearly: z.int() }),
  /** Estimated monthly recurring revenue of renewing subscriptions, IVA included. */
  mrrCents: z.int(),
  /** Premium in force (gifted or cancelling) that ends in the next 30 days. */
  expiringIn30Days: z.int(),
  total: z.int(),
  /** More accounts than the panel reads at once (counts cover the first ones only). */
  truncated: z.boolean(),
});
export type AdminGetSubscriberStatsOutput = z.infer<typeof AdminGetSubscriberStatsOutput>;

export const SubscriberRow = z.object({
  uid: z.string(),
  displayName: z.string(),
  email: z.nullable(z.string()),
  cityId: z.nullable(z.string()),
  segment: z.enum(SUBSCRIBER_SEGMENTS),
  premiumSource: z.nullable(z.enum(PREMIUM_SOURCE)),
  premiumUntil: z.nullable(z.string()),
  daysLeft: z.nullable(z.int()),
  plan: z.nullable(z.enum(['MONTHLY', 'YEARLY'])),
  cancelAtPeriodEnd: z.boolean(),
  marketingOptIn: z.boolean(),
  createdAt: z.nullable(z.string()),
});
export type SubscriberRow = z.infer<typeof SubscriberRow>;

/** `adminListSubscribers` (SADM, audited). */
export const AdminListSubscribersInput = z.extend(PaginationInput, SubscriberFilters);
export type AdminListSubscribersInput = z.infer<typeof AdminListSubscribersInput>;
export const AdminListSubscribersOutput = z.object({
  items: z.array(SubscriberRow),
  nextCursor: z.nullable(z.string()),
  /** Rows matching the filters (before paging). */
  total: z.int(),
});
export type AdminListSubscribersOutput = z.infer<typeof AdminListSubscribersOutput>;

/**
 * `adminExportSubscribers` (SADM, audited): CSV for an e-mail campaign. Always limited to
 * people who accepted commercial e-mails, whatever the filter says (FR-46, LSSI art. 21).
 */
export const AdminExportSubscribersInput = z.strictObject({
  segment: z.optional(z.enum(SUBSCRIBER_SEGMENTS)),
  cityId: z.optional(CityId),
  expiringWithinDays: z.optional(z.int().check(z.gte(1), z.lte(365))),
});
export type AdminExportSubscribersInput = z.infer<typeof AdminExportSubscribersInput>;
export const AdminExportSubscribersOutput = z.object({
  url: z.string(),
  expiresAt: z.string(),
  rows: z.int(),
});
export type AdminExportSubscribersOutput = z.infer<typeof AdminExportSubscribersOutput>;
