import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { PREMIUM_SOURCE } from '@tinhome/shared/constants';
import { FUNNEL_STEPS, type AdminGetMetricsOutput } from '@tinhome/shared/schemas';
import { bucket } from '../../core/storage.js';
import { isEmulated } from '../premium/gateway.js';

const MAX_USERS = 2000;

function range(from: string, to: string) {
  return {
    start: Timestamp.fromDate(new Date(`${from}T00:00:00+01:00`)),
    end: Timestamp.fromDate(new Date(`${to}T23:59:59+01:00`)),
  };
}

async function exists(query: FirebaseFirestore.Query): Promise<boolean> {
  return (await query.limit(1).get()).size > 0;
}

/**
 * FR-54 — funnel by city of the users who signed up in the period (at most 2 000 users per
 * query: enough for launch; BigQuery export later, 10_DECISIONS §5), Premium, demand, clicks.
 */
export async function metrics(
  db: Firestore,
  input: { from: string; to: string; cityId?: string | undefined },
  now: Date,
): Promise<AdminGetMetricsOutput> {
  const { start, end } = range(input.from, input.to);
  let query = db.collection('users').where('createdAt', '>=', start).where('createdAt', '<=', end);
  if (input.cityId) query = query.where('cityId', '==', input.cityId);
  const users = await query.limit(MAX_USERS + 1).get();
  const docs = users.docs.slice(0, MAX_USERS);
  const counts: Record<(typeof FUNNEL_STEPS)[number], number> = {
    registered: 0,
    phoneVerified: 0,
    homePublished: 0,
    identityApproved: 0,
    firstLike: 0,
    matched: 0,
    exchangeConfirmed: 0,
    reviewed: 0,
  };
  for (const user of docs) {
    const uid = user.id;
    const verification = (user.get('verification') ?? {}) as {
      phoneVerified?: boolean;
      identity?: string;
    };
    const [home, liked, matched, exchanged, reviewed] = await Promise.all([
      db.doc(`homes/${uid}`).get(),
      exists(db.collection('likes').where('fromUid', '==', uid)),
      exists(db.collection('matches').where('participants', 'array-contains', uid)),
      exists(
        db
          .collection('exchanges')
          .where('participants', 'array-contains', uid)
          .where('status', 'in', ['CONFIRMED', 'COMPLETED']),
      ),
      exists(db.collection('reviews').where('authorUid', '==', uid)),
    ]);
    counts.registered += 1;
    if (verification.phoneVerified) counts.phoneVerified += 1;
    if (home.get('status') === 'PUBLISHED') counts.homePublished += 1;
    if (verification.identity === 'APPROVED') counts.identityApproved += 1;
    if (liked) counts.firstLike += 1;
    if (matched) counts.matched += 1;
    if (exchanged) counts.exchangeConfirmed += 1;
    if (reviewed) counts.reviewed += 1;
  }
  const nowTs = Timestamp.fromDate(now);
  const bySource: Record<string, number> = {};
  for (const source of PREMIUM_SOURCE) {
    bySource[source] = (
      await db
        .collection('users')
        .where('premiumSource', '==', source)
        .where('premiumUntil', '>', nowTs)
        .count()
        .get()
    ).data().count;
  }
  const active = Object.values(bySource).reduce((a, b) => a + b, 0);
  const paying = bySource.STRIPE ?? 0;
  const total = (await db.collection('users').count().get()).data().count;
  const demand = await db.collection('demandCounters').orderBy('count', 'desc').limit(50).get();
  const partners = await db.collection('partners').get();
  const sponsored = [];
  for (const partner of partners.docs) {
    const clicks = await db
      .collection('partnerClicks')
      .where('partnerId', '==', partner.id)
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .count()
      .get();
    sponsored.push({
      partnerId: partner.id,
      name: String(partner.get('name') ?? ''),
      clicks: clicks.data().count,
    });
  }
  return {
    funnel: FUNNEL_STEPS.map((step) => ({ step, count: counts[step] })),
    premium: {
      active,
      bySource,
      conversionPercent: total ? Math.round((paying / total) * 1000) / 10 : 0,
    },
    demand: demand.docs.map((doc) => ({
      fromCityId: String(doc.get('fromCityId')),
      toCityId: String(doc.get('toCityId')),
      windowId: String(doc.get('windowId')),
      count: Number(doc.get('count') ?? 0) + Number(doc.get('homeCount') ?? 0),
    })),
    sponsored,
    truncated: users.size > MAX_USERS,
  };
}

function csvCell(value: unknown): string {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  // CSV injection: a leading = + - @ is neutralised for spreadsheets.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

/**
 * FR-54 — CSV export (no personal data: the USERS report only has aggregated rows by city and
 * status). Deployed: Storage + signed URL for 15 minutes; emulator: a `data:` URL.
 */
export async function exportCsv(
  db: Firestore,
  input: { report: 'FUNNEL' | 'DEMAND' | 'USERS'; from: string; to: string },
  now: Date,
): Promise<{ url: string; expiresAt: string }> {
  let rows: unknown[][];
  if (input.report === 'FUNNEL') {
    const data = await metrics(db, input, now);
    rows = [['paso', 'personas'], ...data.funnel.map((f) => [f.step, f.count])];
  } else if (input.report === 'DEMAND') {
    const data = await metrics(db, input, now);
    rows = [
      ['origen', 'destino', 'ventana', 'demanda'],
      ...data.demand.map((d) => [d.fromCityId, d.toCityId, d.windowId, d.count]),
    ];
  } else {
    const { start, end } = range(input.from, input.to);
    const users = await db
      .collection('users')
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .limit(MAX_USERS)
      .get();
    const groups = new Map<string, number>();
    for (const user of users.docs) {
      const key = `${String(user.get('cityId') ?? '-')}|${String(user.get('status') ?? 'ACTIVE')}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    rows = [
      ['ciudad', 'estado', 'personas'],
      ...[...groups].map(([key, count]) => [...key.split('|'), count]),
    ];
  }
  // UTF-8 BOM so spreadsheets read the accents.
  const csv = `${String.fromCharCode(0xfeff)}${toCsv(rows)}\n`;
  const expires = new Date(now.getTime() + 15 * 60_000);
  if (isEmulated()) {
    return {
      url: `data:text/csv;charset=utf-8;base64,${Buffer.from(csv).toString('base64')}`,
      expiresAt: expires.toISOString(),
    };
  }
  const file = bucket().file(
    `private/exports/${input.report.toLowerCase()}-${String(now.getTime())}.csv`,
  );
  await file.save(csv, { contentType: 'text/csv; charset=utf-8' });
  const [url] = await file.getSignedUrl({ version: 'v4', action: 'read', expires });
  return { url, expiresAt: expires.toISOString() };
}
