import { getAuth } from 'firebase-admin/auth';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import { getParams, invalidateParams } from '../src/core/params.js';
import { getMe } from '../src/modules/account/callables.js';
import {
  adminExportCsv,
  adminGetCatalog,
  adminGetLegalDoc,
  adminGetMetrics,
  adminGetUser,
  adminGrantPremium,
  adminListAudit,
  adminPublishLegalDoc,
  adminSearchUsers,
  adminSetRole,
  adminSetUserStatus,
  adminUpdateParams,
  adminUpsertCity,
  adminUpsertWindow,
} from '../src/modules/admin/callables.js';
import { recomputeDemand } from '../src/modules/admin/demand.js';
import { toCsv } from '../src/modules/admin/metrics.js';
import { seedEligible } from './fixtures.js';
import {
  authedRequest,
  clearAuth,
  clearFirestore,
  errorCode,
  seedLegal,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

const mfa = { sign_in_second_factor: 'totp' };
const admin: TestToken = { uid: 'admin', email_verified: true, role: 'admin', firebase: mfa };
const boss: TestToken = { uid: 'boss', email_verified: true, role: 'superadmin', firebase: mfa };
const laura: TestToken = { uid: 'laura', email: 'laura@ejemplo.es', email_verified: true };
const statement = {
  templateId: 'FRAUD' as const,
  facts: 'Ha pedido una fianza por transferencia a otra persona usuaria.',
  ground: 'TERMS' as const,
  groundDetail: 'Términos: sin pagos entre personas usuarias.',
};

async function mails(template: string): Promise<string[]> {
  const snaps = await db().collection('mailQueue').where('templateId', '==', template).get();
  return snaps.docs.map((d) => String(d.get('to'))).sort();
}

beforeEach(async () => {
  await clearFirestore();
  await clearAuth();
  await seedWaitlistFixtures();
  await seedLegal();
  invalidateParams();
  setClock(fixedClock('2027-03-01T10:00:00+01:00'));
  await seedEligible('laura', 'madrid');
  await seedEligible('javier', 'valencia');
  await db()
    .doc('users/laura')
    .update({ createdAt: new Date('2027-02-15T10:00:00Z') });
  await db()
    .doc('users/javier')
    .update({ createdAt: new Date('2027-02-20T10:00:00Z') });
});

afterEach(() => resetClock());

describe('users (FR-50)', () => {
  it('searches by e-mail, phone and name and shows the full record', async () => {
    const byEmail = await adminSearchUsers.run(
      authedRequest({ q: 'laura@ejemplo.es', limit: 20 }, admin),
    );
    expect(byEmail.items.map((u) => u.uid)).toEqual(['laura']);
    const byPhone = await adminSearchUsers.run(authedRequest({ q: '600000002', limit: 20 }, admin));
    expect(byPhone.items.map((u) => u.uid)).toEqual(['javier']);
    const byName = await adminSearchUsers.run(authedRequest({ q: 'jav', limit: 20 }, admin));
    expect(byName.items.map((u) => u.uid)).toEqual(['javier']);
    const record = await adminGetUser.run(authedRequest({ uid: 'laura' }, admin));
    expect(record.user).toMatchObject({ uid: 'laura', status: 'ACTIVE', identity: 'APPROVED' });
    expect(record.home).toMatchObject({ title: 'Casa de laura', visible: true });
    expect(
      await errorCode(adminSearchUsers.run(authedRequest({ q: 'laura', limit: 20 }, laura))),
    ).toBe('E_ROLE_REQUIRED');
  });

  it('grants Premium days from the end of the current chain (audited)', async () => {
    const first = await adminGrantPremium.run(
      authedRequest({ uid: 'laura', days: 30, reason: 'Compensación por incidencia' }, admin),
    );
    expect(first.premiumUntil).toBe('2027-03-31T09:00:00.000Z');
    const second = await adminGrantPremium.run(
      authedRequest({ uid: 'laura', days: 10, reason: 'Ampliación acordada' }, admin),
    );
    expect(second.premiumUntil).toBe('2027-04-10T09:00:00.000Z');
    const audit = await adminListAudit.run(authedRequest({ targetId: 'laura', limit: 10 }, boss));
    expect(audit.items.map((a) => a.action)).toEqual(['premium.grant', 'premium.grant']);
  });

  it('suspending needs a statement; roles need a superadmin', async () => {
    expect(
      await errorCode(
        adminSetUserStatus.run(authedRequest({ uid: 'laura', status: 'SUSPENDED' }, admin)),
      ),
    ).toBe('E_STATEMENT_REQUIRED');
    await adminSetUserStatus.run(
      authedRequest({ uid: 'laura', status: 'SUSPENDED', statement }, admin),
    );
    expect((await db().doc('users/laura').get()).get('status')).toBe('SUSPENDED');
    await adminSetUserStatus.run(authedRequest({ uid: 'laura', status: 'ACTIVE' }, admin));
    expect((await db().doc('users/laura').get()).get('status')).toBe('ACTIVE');

    await getAuth().createUser({ uid: 'laura', email: 'laura@ejemplo.es' });
    expect(
      await errorCode(adminSetRole.run(authedRequest({ uid: 'laura', role: 'admin' }, admin))),
    ).toBe('E_ROLE_REQUIRED');
    await adminSetRole.run(authedRequest({ uid: 'laura', role: 'admin' }, boss));
    expect((await getAuth().getUser('laura')).customClaims?.role).toBe('admin');
    expect((await db().doc('adminDirectory/laura').get()).data()).toEqual({
      email: 'laura@ejemplo.es',
      role: 'admin',
    });
    await adminSetRole.run(authedRequest({ uid: 'laura', role: null }, boss));
    expect((await db().doc('adminDirectory/laura').get()).exists).toBe(false);
  });
});

describe('cities, windows and parameters (FR-51, FR-52)', () => {
  it('opening a city tells its users and its waitlist (N-05); windows validate dates', async () => {
    await db()
      .doc('waitlist/w1')
      .set({ email: 'espera@ejemplo.es', cityId: 'malaga', status: 'CONFIRMED' });
    await db().doc('users/laura').update({ cityId: 'malaga' });
    const city = {
      id: 'malaga',
      name: 'Málaga',
      province: 'Málaga',
      region: 'Andalucía',
      timezone: 'Europe/Madrid' as const,
      center: { lat: 36.72, lng: -4.42 },
      radiusKm: 20,
      status: 'OPEN' as const,
      openThreshold: 150,
      order: 3,
    };
    await adminUpsertCity.run(authedRequest(city, boss));
    expect(await mails('N-05')).toEqual(['espera@ejemplo.es', 'laura@ejemplo.es']);
    expect(await errorCode(adminUpsertCity.run(authedRequest(city, admin)))).toBe(
      'E_ROLE_REQUIRED',
    );
    const window = {
      id: 'verano-27',
      name: 'Verano 2027',
      startDate: '2027-07-01',
      endDate: '2027-06-01',
      active: true,
      cityIds: null,
      order: 9,
    };
    expect(await errorCode(adminUpsertWindow.run(authedRequest(window, boss)))).toBe(
      'E_VALIDATION',
    );
    await adminUpsertWindow.run(authedRequest({ ...window, endDate: '2027-07-31' }, boss));
    const catalog = await adminGetCatalog.run(authedRequest({}, admin));
    expect(catalog.windows.map((w) => w.id)).toContain('verano-27');
    expect(catalog.cities.find((c) => c.id === 'malaga')?.status).toBe('OPEN');
  });

  it('edits parameters, mirrors config/public and keeps P-26 off (audited)', async () => {
    const { params } = await adminUpdateParams.run(authedRequest({ freeDailyLikes: 15 }, boss));
    expect(params.freeDailyLikes).toBe(15);
    expect((await db().doc('config/public').get()).get('freeDailyLikes')).toBe(15);
    expect((await getParams()).freeDailyLikes).toBe(15);
    expect(
      await errorCode(
        adminUpdateParams.run(authedRequest({ sponsoredInsuranceEnabled: true }, boss)),
      ),
    ).toBe('E_VALIDATION');
    expect(await errorCode(adminUpdateParams.run(authedRequest({ freeDailyLikes: 0 }, boss)))).toBe(
      'E_VALIDATION',
    );
    const audit = await adminListAudit.run(
      authedRequest({ targetType: 'config', limit: 10 }, boss),
    );
    expect(audit.items[0]).toMatchObject({ action: 'params.update' });
  });
});

describe('legal texts (FR-56, FR-58)', () => {
  it('publishes a new version that asks for re-acceptance and e-mails active users (N-17)', async () => {
    const before = await adminGetLegalDoc.run(authedRequest({ slug: 'terminos' }, boss));
    const { version } = await adminPublishLegalDoc.run(
      authedRequest(
        {
          slug: 'terminos',
          markdown:
            '# Términos\n\nNueva versión PROVISIONAL de los términos de uso de TinHome para pruebas.',
          requiresReacceptance: true,
          changeSummary: 'Aclaramos las normas de los intercambios.',
        },
        boss,
      ),
    );
    expect(version).not.toBe(before.currentVersion);
    const after = await adminGetLegalDoc.run(authedRequest({ slug: 'terminos' }, boss));
    expect(after).toMatchObject({ currentVersion: version });
    expect(after.versions).toHaveLength(before.versions.length + 1);
    expect(await mails('N-17')).toEqual(['javier@ejemplo.es', 'laura@ejemplo.es']);
    const me = await getMe.run(authedRequest({}, laura));
    expect(me.legalPending).toEqual([
      expect.objectContaining({ slug: 'terminos', version, requiresReacceptance: true }),
    ]);
  });
});

describe('metrics, CSV and demand (FR-54, FR-18)', () => {
  it('counts the funnel of the period and exports CSV without personal data', async () => {
    const result = await adminGetMetrics.run(
      authedRequest({ from: '2027-02-01', to: '2027-02-28' }, admin),
    );
    expect(result.funnel.find((f) => f.step === 'registered')?.count).toBe(2);
    expect(result.funnel.find((f) => f.step === 'homePublished')?.count).toBe(2);
    expect(result.funnel.find((f) => f.step === 'matched')?.count).toBe(0);
    const madrid = await adminGetMetrics.run(
      authedRequest({ from: '2027-02-01', to: '2027-02-28', cityId: 'madrid' }, admin),
    );
    expect(madrid.funnel[0]?.count).toBe(1);
    const csv = await adminExportCsv.run(
      authedRequest({ report: 'USERS', from: '2027-02-01', to: '2027-02-28' }, admin),
    );
    const text = Buffer.from(csv.url.split(',')[1] ?? '', 'base64').toString('utf8');
    expect(text).toContain('ciudad,estado,personas');
    expect(text).not.toContain('@');
    expect(toCsv([['=cmd()', 'a,b']])).toBe('\'=cmd(),"a,b"');
  });

  it('J-08 adds the demand of visible homes and publishes pairs at P-18', async () => {
    await db()
      .doc('demandCounters/madrid_valencia_ss27')
      .set({ fromCityId: 'madrid', toCityId: 'valencia', windowId: 'ss27', count: 4 });
    const params = await getParams();
    // Laura's home (Madrid → Valencia, ss27) adds 1: 4 + 1 = 5 = P-18.
    expect(await recomputeDemand(db(), params)).toBe(1);
    expect((await db().doc('demandStats/madrid_valencia_ss27').get()).get('count')).toBe(5);
    expect((await db().doc('demandStats/valencia_madrid_ss27').get()).exists).toBe(false);
  });
});
