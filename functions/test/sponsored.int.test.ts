import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import { invalidateParams } from '../src/core/params.js';
import { getDiscoverDeck } from '../src/modules/discover/callables.js';
import {
  adminListPartners,
  adminUpsertPartner,
  getSponsored,
  partnerIdFromPath,
} from '../src/modules/sponsored/callables.js';
import { CLICKS_PER_HOUR, recordClick } from '../src/modules/sponsored/service.js';
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
const javier: TestToken = { uid: 'javier', email: 'javier@ejemplo.es', email_verified: true };

const partner = {
  name: 'Limpiezas Sol',
  category: 'CLEANING' as const,
  title: 'Limpieza antes de tu intercambio',
  text: 'Deja la casa lista para tus invitados.',
  logoUrl: 'https://example.com/logo.png',
  targetUrl: 'https://example.com/oferta?ref=1',
  cityIds: null,
  placements: ['MATCH' as const, 'DECK' as const],
  active: true,
};

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
    .doc('users/javier')
    .update({ premiumUntil: new Date('2027-06-01T00:00:00Z'), premiumSource: 'STRIPE' });
});

afterEach(() => resetClock());

describe('adminUpsertPartner / adminListPartners (FR-47)', () => {
  it('is superadmin only, audits and blocks insurance while P-26 is false', async () => {
    expect(await errorCode(adminUpsertPartner.run(authedRequest(partner, admin)))).toBe(
      'E_ROLE_REQUIRED',
    );
    expect(
      await errorCode(
        adminUpsertPartner.run(
          authedRequest({ ...partner, category: 'TRAVEL_INSURANCE' as const }, boss),
        ),
      ),
    ).toBe('E_VALIDATION');
    expect(
      await errorCode(
        adminUpsertPartner.run(authedRequest({ ...partner, targetUrl: 'http://x.es' }, boss)),
      ),
    ).toBe('E_VALIDATION');
    const { partner: created } = await adminUpsertPartner.run(authedRequest(partner, boss));
    expect(created.clicks30d).toBe(0);
    const { partner: updated } = await adminUpsertPartner.run(
      authedRequest({ ...partner, id: created.id, active: false }, boss),
    );
    expect(updated.active).toBe(false);
    const list = await adminListPartners.run(authedRequest({}, boss));
    expect(list.items.map((p) => p.id)).toEqual([created.id]);
    const audit = await db().collection('auditLog').where('targetId', '==', created.id).get();
    expect(audit.docs.map((d) => String(d.get('action'))).sort()).toEqual([
      'partner.create',
      'partner.update',
    ]);
  });
});

describe('getSponsored (BR-28)', () => {
  it('returns one labelled card by placement and city, never the deck card to Premium', async () => {
    const { partner: p } = await adminUpsertPartner.run(authedRequest(partner, boss));
    await adminUpsertPartner.run(
      authedRequest({ ...partner, name: 'Solo Valencia', cityIds: ['valencia'] }, boss),
    );
    const match = await getSponsored.run(authedRequest({ placement: 'MATCH' }, laura));
    expect(match.card).toMatchObject({ partnerId: p.id, label: 'Patrocinado' });
    expect(match.card?.clickUrl).toBe(`/r/${p.id}?p=MATCH`);
    expect((await getSponsored.run(authedRequest({ placement: 'EXCHANGE' }, laura))).card).toBe(
      null,
    );
    expect((await getSponsored.run(authedRequest({ placement: 'DECK' }, javier))).card).toBe(null);
    expect((await getSponsored.run(authedRequest({ placement: 'MATCH' }, javier))).card).not.toBe(
      null,
    );
    const deck = await getDiscoverDeck.run(authedRequest({}, laura));
    expect(deck.sponsored?.partnerId).toBe(p.id);
    const premiumDeck = await getDiscoverDeck.run(authedRequest({}, javier));
    expect(premiumDeck.sponsored).toBe(null);
  });

  it('ignores partners outside their dates', async () => {
    await adminUpsertPartner.run(
      authedRequest({ ...partner, startsAt: '2027-04-01T00:00:00+02:00' }, boss),
    );
    expect((await getSponsored.run(authedRequest({ placement: 'MATCH' }, laura))).card).toBe(null);
  });
});

describe('partner redirect (05 §2.15)', () => {
  it('counts the click without the uid and adds utm_source', async () => {
    const { partner: p } = await adminUpsertPartner.run(authedRequest(partner, boss));
    expect(partnerIdFromPath(`/r/${p.id}`)).toBe(p.id);
    expect(partnerIdFromPath(`/${p.id}`)).toBe(p.id);
    const target = await recordClick(db(), p.id, 'MATCH', new Date('2027-03-01T10:00:00Z'));
    expect(target).toBe('https://example.com/oferta?ref=1&utm_source=tinhome');
    const clicks = await db().collection('partnerClicks').get();
    expect(clicks.size).toBe(1);
    expect(Object.keys(clicks.docs[0]?.data() ?? {}).sort()).toEqual([
      'createdAt',
      'partnerId',
      'placement',
    ]);
    expect(await recordClick(db(), 'nope', 'MATCH', new Date())).toBe(null);
    expect(await recordClick(db(), '../x', 'MATCH', new Date())).toBe(null);
    const list = await adminListPartners.run(authedRequest({}, boss));
    expect(list.items[0]?.clicks30d).toBe(1);
  });
  it('always redirects but counts at most 5 clicks per IP, partner and hour (anti-fraud)', async () => {
    const { partner: p } = await adminUpsertPartner.run(authedRequest(partner, boss));
    const at = new Date('2027-03-01T10:00:00Z');
    for (let i = 0; i < 8; i += 1) {
      expect(await recordClick(db(), p.id, 'DECK', at, '198.51.100.20')).toContain('example.com');
    }
    await recordClick(db(), p.id, 'DECK', at, '198.51.100.21');
    expect((await db().collection('partnerClicks').get()).size).toBe(CLICKS_PER_HOUR + 1);
  });
});
