import { Timestamp, type Firestore, type Query } from 'firebase-admin/firestore';
import { PREMIUM_SOURCE, type CityStatus, type PremiumSource } from '@tinhome/shared/constants';
import type { AdminDashboardOutput } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { iso } from '../verification/view.js';

const DAY_MS = 86_400_000;

async function count(query: Query): Promise<number> {
  return (await query.count().get()).data().count;
}

/** FR-49 — KPIs of the admin home (reports, matches and exchanges fill in from M6–M9). */
export async function dashboard(
  db: Firestore,
  params: Params,
  now: Date,
): Promise<AdminDashboardOutput> {
  const since = (days: number) => Timestamp.fromMillis(now.getTime() - days * DAY_MS);
  const pending = db.collection('verifications').where('status', '==', 'PENDING');
  const [
    pendingCount,
    oldest,
    locationReviews,
    reports,
    newUsers,
    matches,
    exchanges,
    cities,
    premium,
  ] = await Promise.all([
    count(pending),
    pending.orderBy('submittedAt', 'asc').limit(1).get(),
    count(db.collection('homes').where('locationCheck.status', '==', 'MANUAL_PENDING')),
    count(db.collection('reports').where('status', '==', 'OPEN')),
    count(db.collection('users').where('createdAt', '>=', since(7))),
    count(db.collection('matches').where('createdAt', '>=', since(7))),
    count(db.collection('exchanges').where('confirmedAt', '>=', since(30))),
    db.collection('cities').orderBy('order').get(),
    Promise.all(
      PREMIUM_SOURCE.map(
        async (source) =>
          [
            source,
            await count(
              db
                .collection('users')
                .where('premiumSource', '==', source)
                .where('premiumUntil', '>', Timestamp.fromDate(now)),
            ),
          ] as const,
      ),
    ),
  ]);
  return {
    pendingVerifications: {
      count: pendingCount,
      oldestAt: iso(oldest.docs[0]?.get('submittedAt')),
    },
    pendingLocationReviews: locationReviews,
    openReports: reports,
    newUsers7d: newUsers,
    cities: cities.docs.map((city) => ({
      id: city.id,
      name: String(city.get('name')),
      status: city.get('status') as CityStatus,
      visibleCandidates: Number(city.get('counters.visibleCandidates') ?? 0),
      threshold: Number(city.get('openThreshold') ?? params.cityOpenThreshold),
      foundersAwarded: Number(city.get('counters.foundersAwarded') ?? 0),
    })),
    matches7d: matches,
    exchangesConfirmed30d: exchanges,
    premiumBySource: Object.fromEntries(premium) as Record<PremiumSource, number>,
  };
}
