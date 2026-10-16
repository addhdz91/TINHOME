import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import {
  PREMIUM_SOURCE,
  SUBSCRIBER_SEGMENTS,
  type SubscriberSegment,
} from '@tinhome/shared/constants';
import { daysUntil, estimatedMrrCents, subscriberSegment } from '@tinhome/shared/domain';
import type {
  AdminExportSubscribersInput,
  AdminExportSubscribersOutput,
  AdminGetSubscriberStatsOutput,
  AdminListSubscribersInput,
  AdminListSubscribersOutput,
  SubscriberRow,
} from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { cursorOffset } from '../../core/pagination.js';
import { bucket } from '../../core/storage.js';
import { isEmulated } from '../premium/gateway.js';
import { toCsv } from './metrics.js';

/**
 * Accounts read per request. Enough for the launch (a few thousand per city); beyond it the
 * stats say `truncated` and the segment should be stored on the user (10_DECISIONS §5).
 */
export const MAX_SUBSCRIBER_ROWS = 5000;
/** Accounts never offered anything: banned, being deleted or deleted (BR-29, FR-44). */
const EXCLUDED_STATUS = new Set(['BANNED', 'DELETION_PENDING', 'DELETED']);
const EXPIRING_DAYS = 30;

const date = (value: unknown): Date | null => (value instanceof Timestamp ? value.toDate() : null);
const iso = (value: unknown): string | null => date(value)?.toISOString() ?? null;

/**
 * Builds one row per account from `users`, `subscriptions` and `entitlements` (only the
 * fields the panel needs). Every rule about who counts as paying lives in `subscriberSegment`.
 */
async function loadRows(
  db: Firestore,
  now: Date,
  cityId: string | undefined,
): Promise<{ rows: SubscriberRow[]; truncated: boolean }> {
  let users = db
    .collection('users')
    .select(
      'firstName',
      'lastName',
      'email',
      'cityId',
      'status',
      'premiumUntil',
      'premiumSource',
      'settings.marketingOptIn',
      'createdAt',
    );
  if (cityId) users = users.where('cityId', '==', cityId);
  const [userSnaps, subscriptions, entitlements] = await Promise.all([
    users.limit(MAX_SUBSCRIBER_ROWS + 1).get(),
    db.collection('subscriptions').select('plan', 'status', 'cancelAtPeriodEnd').get(),
    db.collection('entitlements').select('uid').get(),
  ]);
  const subscriptionOf = new Map(subscriptions.docs.map((doc) => [doc.id, doc]));
  const everPremium = new Set(entitlements.docs.map((doc) => String(doc.get('uid'))));

  const rows: SubscriberRow[] = [];
  for (const user of userSnaps.docs.slice(0, MAX_SUBSCRIBER_ROWS)) {
    if (EXCLUDED_STATUS.has(String(user.get('status') ?? 'ACTIVE'))) continue;
    const subscription = subscriptionOf.get(user.id);
    const premiumUntil = date(user.get('premiumUntil'));
    const status = subscription ? String(subscription.get('status') ?? '') : null;
    const cancelAtPeriodEnd = subscription?.get('cancelAtPeriodEnd') === true;
    const segment = subscriberSegment(
      {
        premiumUntil,
        hasSubscription: subscription !== undefined,
        subscriptionStatus: status,
        cancelAtPeriodEnd,
        everPremium: everPremium.has(user.id),
      },
      now,
    );
    const plan = subscription?.get('plan') as unknown;
    const source = user.get('premiumSource') as unknown;
    const premium =
      segment === 'PAID_ACTIVE' || segment === 'PAID_CANCELING' || segment === 'GIFTED';
    rows.push({
      uid: user.id,
      displayName: [user.get('firstName'), user.get('lastName')]
        .filter((part): part is string => typeof part === 'string' && part.length > 0)
        .join(' '),
      email: typeof user.get('email') === 'string' ? (user.get('email') as string) : null,
      cityId: typeof user.get('cityId') === 'string' ? (user.get('cityId') as string) : null,
      segment,
      premiumSource: premium ? (PREMIUM_SOURCE.find((s) => s === source) ?? null) : null,
      premiumUntil: iso(user.get('premiumUntil')),
      daysLeft: premium ? daysUntil(premiumUntil, now) : null,
      plan: plan === 'MONTHLY' || plan === 'YEARLY' ? plan : null,
      cancelAtPeriodEnd,
      marketingOptIn: user.get('settings.marketingOptIn') === true,
      createdAt: iso(user.get('createdAt')),
    });
  }
  return { rows, truncated: userSnaps.size > MAX_SUBSCRIBER_ROWS };
}

/** Premium in force that will end (not renew) within `days`. */
function expiresWithin(row: SubscriberRow, days: number): boolean {
  return (
    (row.segment === 'GIFTED' || row.segment === 'PAID_CANCELING') &&
    row.daysLeft !== null &&
    row.daysLeft <= days
  );
}

function filterRows(
  rows: SubscriberRow[],
  filters: {
    segment?: SubscriberSegment | undefined;
    expiringWithinDays?: number | undefined;
    marketingOnly?: boolean | undefined;
  },
): SubscriberRow[] {
  return rows.filter(
    (row) =>
      (!filters.segment || row.segment === filters.segment) &&
      (!filters.expiringWithinDays || expiresWithin(row, filters.expiringWithinDays)) &&
      (!filters.marketingOnly || row.marketingOptIn),
  );
}

/** Soonest to expire first, then the newest accounts. */
function byPriority(a: SubscriberRow, b: SubscriberRow): number {
  const left = a.daysLeft ?? Number.POSITIVE_INFINITY;
  const right = b.daysLeft ?? Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
}

/** Tiles of the panel: people per segment (and how many accept commercial e-mails), MRR. */
export async function subscriberStats(
  db: Firestore,
  input: { cityId?: string | undefined },
  params: Params,
  now: Date,
): Promise<AdminGetSubscriberStatsOutput> {
  const { rows, truncated } = await loadRows(db, now, input.cityId);
  const plans = { monthly: 0, yearly: 0 };
  for (const row of rows) {
    if (row.segment !== 'PAID_ACTIVE') continue;
    if (row.plan === 'YEARLY') plans.yearly += 1;
    else plans.monthly += 1;
  }
  return {
    segments: SUBSCRIBER_SEGMENTS.map((segment) => {
      const of = rows.filter((row) => row.segment === segment);
      return {
        segment,
        count: of.length,
        marketingOptIn: of.filter((r) => r.marketingOptIn).length,
      };
    }),
    plans,
    mrrCents: estimatedMrrCents(plans, {
      monthlyCents: params.premiumMonthlyPriceCents,
      yearlyCents: params.premiumYearlyPriceCents,
    }),
    expiringIn30Days: rows.filter((row) => expiresWithin(row, EXPIRING_DAYS)).length,
    total: rows.length,
    truncated,
  };
}

/** The people behind a segment, soonest to expire first. */
export async function listSubscribers(
  db: Firestore,
  input: AdminListSubscribersInput,
  now: Date,
): Promise<AdminListSubscribersOutput> {
  const { rows } = await loadRows(db, now, input.cityId);
  const matching = filterRows(rows, input).sort(byPriority);
  const offset = cursorOffset(input.cursor);
  const items = matching.slice(offset, offset + input.limit);
  const next = offset + items.length;
  return {
    items,
    nextCursor: next < matching.length ? String(next) : null,
    total: matching.length,
  };
}

/**
 * CSV for an e-mail campaign (FR-46, LSSI art. 21): ONLY people who accepted commercial
 * e-mails, whatever the filters. First name, e-mail, segment, city and expiry: nothing else.
 * Deployed: Storage + signed URL for 15 minutes; emulator: a `data:` URL.
 */
export async function exportSubscribers(
  db: Firestore,
  input: AdminExportSubscribersInput,
  now: Date,
): Promise<AdminExportSubscribersOutput> {
  const { rows } = await loadRows(db, now, input.cityId);
  const selected = filterRows(rows, { ...input, marketingOnly: true }).sort(byPriority);
  const csv = `${String.fromCharCode(0xfeff)}${toCsv([
    ['nombre', 'email', 'segmento', 'ciudad', 'premium_hasta', 'dias_restantes'],
    ...selected.map((row) => [
      row.displayName.split(' ')[0] ?? '',
      row.email ?? '',
      row.segment,
      row.cityId ?? '',
      row.premiumUntil?.slice(0, 10) ?? '',
      row.daysLeft ?? '',
    ]),
  ])}\n`;
  const expires = new Date(now.getTime() + 15 * 60_000);
  if (isEmulated()) {
    return {
      url: `data:text/csv;charset=utf-8;base64,${Buffer.from(csv).toString('base64')}`,
      expiresAt: expires.toISOString(),
      rows: selected.length,
    };
  }
  // Same folder as the other exports: deleted after 1 day by the bucket lifecycle.
  const file = bucket().file(`private/exports/subscribers-${String(now.getTime())}.csv`);
  await file.save(csv, { contentType: 'text/csv; charset=utf-8' });
  const [url] = await file.getSignedUrl({ version: 'v4', action: 'read', expires });
  return { url, expiresAt: expires.toISOString(), rows: selected.length };
}
