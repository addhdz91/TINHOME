import { Timestamp } from 'firebase-admin/firestore';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MARKETING_CONSENT_TEXT } from '@tinhome/shared/constants';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { sha256Hex } from '../src/core/crypto.js';
import { db } from '../src/core/firebase.js';
import { getMe, updateSettings } from '../src/modules/account/callables.js';
import {
  adminExportSubscribers,
  adminGetSubscriberStats,
  adminListSubscribers,
} from '../src/modules/admin/callables.js';
import { seedEligible } from './fixtures.js';
import {
  TEST_USER_AGENT,
  authedRequest,
  clearFirestore,
  errorCode,
  seedLegal,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

const NOW = '2027-03-01T10:00:00+01:00';
const mfa = { sign_in_second_factor: 'totp' };
const admin: TestToken = { uid: 'admin', email_verified: true, role: 'admin', firebase: mfa };
const boss: TestToken = { uid: 'boss', email_verified: true, role: 'superadmin', firebase: mfa };
const ts = (iso: string) => Timestamp.fromDate(new Date(iso));

/** Six people, one per segment (plus a banned account that never shows). */
async function seedSegments() {
  const people: [string, string][] = [
    ['paid', 'madrid'],
    ['canceling', 'madrid'],
    ['gifted', 'valencia'],
    ['lapsedpaid', 'madrid'],
    ['lapsedgift', 'valencia'],
    ['free', 'madrid'],
    ['banned', 'madrid'],
  ];
  for (const [uid, city] of people) await seedEligible(uid, city);
  const users = db().collection('users');
  await users.doc('paid').update({
    premiumUntil: ts('2027-03-20T00:00:00Z'),
    premiumSource: 'STRIPE',
    'settings.marketingOptIn': true,
  });
  await users
    .doc('canceling')
    .update({ premiumUntil: ts('2027-03-10T00:00:00Z'), premiumSource: 'STRIPE' });
  await users.doc('gifted').update({
    premiumUntil: ts('2027-03-15T00:00:00Z'),
    premiumSource: 'FOUNDER',
    'settings.marketingOptIn': true,
  });
  await users
    .doc('lapsedpaid')
    .update({ premiumUntil: ts('2027-01-01T00:00:00Z'), 'settings.marketingOptIn': true });
  await users.doc('lapsedgift').update({ premiumUntil: null });
  await users.doc('banned').update({ status: 'BANNED', 'settings.marketingOptIn': true });
  const subs = db().collection('subscriptions');
  await subs.doc('paid').set({ plan: 'YEARLY', status: 'active', cancelAtPeriodEnd: false });
  await subs.doc('canceling').set({ plan: 'MONTHLY', status: 'active', cancelAtPeriodEnd: true });
  await subs
    .doc('lapsedpaid')
    .set({ plan: 'MONTHLY', status: 'canceled', cancelAtPeriodEnd: false });
  const ent = db().collection('entitlements');
  for (const uid of ['paid', 'canceling', 'gifted', 'lapsedpaid', 'lapsedgift']) {
    await ent.doc(`e-${uid}`).set({ uid, source: 'ADMIN' });
  }
}

beforeEach(async () => {
  await clearFirestore();
  await seedWaitlistFixtures();
  await seedLegal();
  setClock(fixedClock(NOW));
});

afterEach(() => resetClock());

describe('subscribers panel (superadmin)', () => {
  it('counts each segment, the estimated MRR and the Premium about to end', async () => {
    await seedSegments();
    const stats = await adminGetSubscriberStats.run(authedRequest({}, boss));
    const count = Object.fromEntries(stats.segments.map((s) => [s.segment, s.count]));
    expect(count).toEqual({
      PAID_ACTIVE: 1,
      PAID_CANCELING: 1,
      GIFTED: 1,
      LAPSED_PAID: 1,
      LAPSED_GIFTED: 1,
      FREE: 1,
    });
    expect(stats.total).toBe(6); // the banned account is never offered anything
    expect(stats.plans).toEqual({ monthly: 0, yearly: 1 });
    expect(stats.mrrCents).toBe(658); // 79 € / 12
    expect(stats.expiringIn30Days).toBe(2); // gifted + cancelling (the renewing one is not)
    expect(stats.segments.find((s) => s.segment === 'GIFTED')?.marketingOptIn).toBe(1);

    const madrid = await adminGetSubscriberStats.run(authedRequest({ cityId: 'madrid' }, boss));
    expect(madrid.total).toBe(4);
  });

  it('lists a segment soonest-to-expire first, filters and audits the lookup', async () => {
    await seedSegments();
    const expiring = await adminListSubscribers.run(
      authedRequest({ expiringWithinDays: 30, limit: 20 }, boss),
    );
    expect(expiring.items.map((r) => r.uid)).toEqual(['canceling', 'gifted']);
    expect(expiring.items[0]).toMatchObject({
      daysLeft: 9,
      plan: 'MONTHLY',
      cancelAtPeriodEnd: true,
    });

    const lapsed = await adminListSubscribers.run(
      authedRequest({ segment: 'LAPSED_PAID', limit: 20 }, boss),
    );
    expect(lapsed.items).toHaveLength(1);
    expect(lapsed.items[0]).toMatchObject({
      uid: 'lapsedpaid',
      email: 'lapsedpaid@ejemplo.es',
      premiumSource: null,
    });

    const optIn = await adminListSubscribers.run(
      authedRequest({ marketingOnly: true, limit: 2 }, boss),
    );
    expect(optIn.total).toBe(3);
    expect(optIn.nextCursor).toBe('2');

    const audit = await db().collection('auditLog').where('action', '==', 'subscribers.list').get();
    expect(audit.size).toBe(3);
  });

  it('exports for a campaign ONLY people who accepted commercial e-mails', async () => {
    await seedSegments();
    const all = await adminExportSubscribers.run(authedRequest({}, boss));
    expect(all.rows).toBe(3);
    const csv = Buffer.from(all.url.split(',')[1] ?? '', 'base64').toString('utf8');
    expect(csv).toContain('paid@ejemplo.es');
    expect(csv).toContain('gifted@ejemplo.es');
    expect(csv).not.toContain('free@ejemplo.es');
    expect(csv).not.toContain('canceling@ejemplo.es');
    expect(csv).not.toContain('banned@ejemplo.es');
    const winBack = await adminExportSubscribers.run(
      authedRequest({ segment: 'LAPSED_PAID' }, boss),
    );
    expect(winBack.rows).toBe(1);
    expect(
      (await db().collection('auditLog').where('action', '==', 'subscribers.export').get()).size,
    ).toBe(2);
  });

  it('is superadmin only', async () => {
    const laura: TestToken = { uid: 'laura', email_verified: true };
    for (const token of [laura, admin]) {
      expect(await errorCode(adminGetSubscriberStats.run(authedRequest({}, token)))).toBe(
        'E_ROLE_REQUIRED',
      );
      expect(await errorCode(adminListSubscribers.run(authedRequest({ limit: 5 }, token)))).toBe(
        'E_ROLE_REQUIRED',
      );
      expect(await errorCode(adminExportSubscribers.run(authedRequest({}, token)))).toBe(
        'E_ROLE_REQUIRED',
      );
    }
  });
});

describe('commercial e-mail consent (FR-46, LSSI art. 21)', () => {
  it('is off by default, and each change is stored with its evidence', async () => {
    await seedEligible('laura', 'madrid');
    const laura: TestToken = { uid: 'laura', email: 'laura@ejemplo.es', email_verified: true };
    expect((await getMe.run(authedRequest({}, laura))).settings.marketingOptIn).toBe(false);

    await updateSettings.run(authedRequest({ marketingOptIn: true }, laura, '203.0.113.80'));
    await updateSettings.run(authedRequest({ marketingOptIn: true }, laura)); // no change → no record
    await updateSettings.run(authedRequest({ marketingOptIn: false }, laura));
    expect((await getMe.run(authedRequest({}, laura))).settings.marketingOptIn).toBe(false);

    const records = (
      await db().collection('legalAcceptances').where('uid', '==', 'laura').get()
    ).docs
      .map((d): Record<string, unknown> => d.data())
      .sort((a, b) => String(a.type).localeCompare(String(b.type)));
    expect(records.map((r) => r.type)).toEqual(['MARKETING_OPT_IN', 'MARKETING_OPT_OUT']);
    expect(records[0]).toMatchObject({
      source: 'SETTINGS',
      method: 'TOGGLE',
      consentText: MARKETING_CONSENT_TEXT,
      contentHash: sha256Hex(MARKETING_CONSENT_TEXT),
      ipTruncated: '203.0.113.0/24',
      userAgent: TEST_USER_AGENT,
      emailHash: sha256Hex('laura@ejemplo.es'),
    });
  });
});
