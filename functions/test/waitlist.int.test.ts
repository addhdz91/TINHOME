import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PARAM_DEFAULTS } from '@tinhome/shared/constants';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { sha256Hex } from '../src/core/crypto.js';
import { db } from '../src/core/firebase.js';
import { confirmWaitlist, joinWaitlist } from '../src/modules/waitlist/callables.js';
import { clearFirestore, errorCode, publicRequest, seedWaitlistFixtures } from './helpers.js';

const input = {
  email: '  Visitante@Ejemplo.ES ',
  cityId: 'malaga',
  destinations: ['madrid', 'valencia'],
  windowIds: ['ss27'],
  acceptPrivacy: '0.1-provisional',
};
const emailId = sha256Hex('visitante@ejemplo.es');

async function queuedMails() {
  const snap = await db().collection('mailQueue').get();
  return snap.docs.map((doc) => doc.data());
}

async function tokenFromMail(): Promise<string> {
  const [mail] = await queuedMails();
  const url = (mail?.data as { confirmUrl: string }).confirmUrl;
  return new URL(url).searchParams.get('token') ?? '';
}

beforeEach(async () => {
  await clearFirestore();
  await seedWaitlistFixtures();
  setClock(fixedClock('2027-03-01T10:00:00+01:00'));
});

afterEach(() => {
  resetClock();
});

describe('joinWaitlist', () => {
  it('stores a pending entry keyed by the e-mail hash and queues N-19', async () => {
    await expect(joinWaitlist.run(publicRequest(input))).resolves.toEqual({ ok: true });

    const entry = await db().doc(`waitlist/${emailId}`).get();
    expect(entry.data()).toMatchObject({
      email: 'visitante@ejemplo.es',
      cityId: 'malaga',
      status: 'PENDING_CONFIRMATION',
      privacyVersion: '0.1-provisional',
    });
    const mails = await queuedMails();
    expect(mails).toHaveLength(1);
    expect(mails[0]).toMatchObject({
      to: 'visitante@ejemplo.es',
      templateId: 'N-19',
      status: 'QUEUED',
    });
    // Only the hash of the token is stored in the entry.
    const token = await tokenFromMail();
    expect(entry.get('confirmToken')).toBe(sha256Hex(token));
    expect(JSON.stringify(entry.data())).not.toContain(token);
  });

  it('answers the same for an already confirmed e-mail and sends nothing (no enumeration)', async () => {
    await joinWaitlist.run(publicRequest(input));
    await confirmWaitlist.run(publicRequest({ token: await tokenFromMail() }));
    await db()
      .collection('mailQueue')
      .get()
      .then((s) => Promise.all(s.docs.map((d) => d.ref.delete())));

    await expect(joinWaitlist.run(publicRequest(input))).resolves.toEqual({ ok: true });
    expect(await queuedMails()).toHaveLength(0);
    expect((await db().doc(`waitlist/${emailId}`).get()).get('status')).toBe('CONFIRMED');
  });

  it('does not resend the e-mail within 60 s but updates the preferences', async () => {
    await joinWaitlist.run(publicRequest(input));
    await joinWaitlist.run(publicRequest({ ...input, destinations: ['madrid'] }));
    expect(await queuedMails()).toHaveLength(1);
    expect((await db().doc(`waitlist/${emailId}`).get()).get('destinations')).toEqual(['madrid']);

    setClock(fixedClock('2027-03-01T10:01:01+01:00'));
    await joinWaitlist.run(publicRequest(input));
    expect(await queuedMails()).toHaveLength(2);
  });

  it('rejects unknown or closed cities, inactive windows and an outdated privacy version', async () => {
    expect(await errorCode(joinWaitlist.run(publicRequest({ ...input, cityId: 'nowhere' })))).toBe(
      'E_CITY_UNKNOWN',
    );
    expect(
      await errorCode(joinWaitlist.run(publicRequest({ ...input, destinations: ['closed'] }))),
    ).toBe('E_CITY_UNKNOWN');
    expect(await errorCode(joinWaitlist.run(publicRequest({ ...input, windowIds: ['old'] })))).toBe(
      'E_VALIDATION',
    );
    expect(
      await errorCode(joinWaitlist.run(publicRequest({ ...input, acceptPrivacy: '0.0' }))),
    ).toBe('E_LEGAL_VERSION');
    expect(await errorCode(joinWaitlist.run(publicRequest({ ...input, email: 'x' })))).toBe(
      'E_VALIDATION',
    );
  });

  it('limits requests per IP and hour', async () => {
    for (let i = 0; i < 10; i += 1) {
      await joinWaitlist.run(
        publicRequest({ ...input, email: `v${i}@ejemplo.es` }, '198.51.100.1'),
      );
    }
    expect(
      await errorCode(
        joinWaitlist.run(publicRequest({ ...input, email: 'v11@ejemplo.es' }, '198.51.100.1')),
      ),
    ).toBe('E_RATE_LIMIT');
    // Another IP is not affected; the raw IP is never stored.
    await expect(
      joinWaitlist.run(publicRequest({ ...input, email: 'z@ejemplo.es' }, '198.51.100.2')),
    ).resolves.toEqual({ ok: true });
    const limits = await db().collection('rateLimits').get();
    expect(JSON.stringify(limits.docs.map((d) => [d.id, d.data()]))).not.toContain('198.51.100');
  });
});

describe('confirmWaitlist', () => {
  it('confirms, counts the city and returns the position', async () => {
    await joinWaitlist.run(publicRequest(input));
    const result = await confirmWaitlist.run(publicRequest({ token: await tokenFromMail() }));

    expect(result).toEqual({ cityId: 'malaga', position: 1 });
    expect((await db().doc(`waitlist/${emailId}`).get()).get('status')).toBe('CONFIRMED');
    expect((await db().doc('cities/malaga').get()).get('counters.waitlist')).toBe(1);
  });

  it('is idempotent on a second click', async () => {
    await joinWaitlist.run(publicRequest(input));
    const token = await tokenFromMail();
    await confirmWaitlist.run(publicRequest({ token }));
    await expect(confirmWaitlist.run(publicRequest({ token }))).resolves.toEqual({
      cityId: 'malaga',
    });
    expect((await db().doc('cities/malaga').get()).get('counters.waitlist')).toBe(1);
  });

  it('rejects unknown and expired tokens', async () => {
    expect(await errorCode(confirmWaitlist.run(publicRequest({ token: 'x'.repeat(43) })))).toBe(
      'E_TOKEN_INVALID',
    );

    await joinWaitlist.run(publicRequest(input));
    const token = await tokenFromMail();
    setClock(fixedClock('2027-03-09T10:00:00+01:00'));
    expect(await errorCode(confirmWaitlist.run(publicRequest({ token })))).toBe('E_TOKEN_INVALID');
  });

  it('only publishes demand once a pair reaches P-18', async () => {
    const min = PARAM_DEFAULTS.demandCounterMin;
    for (let i = 1; i <= min; i += 1) {
      setClock(fixedClock(`2027-03-01T1${i}:00:00+01:00`));
      await db()
        .collection('mailQueue')
        .get()
        .then((s) => Promise.all(s.docs.map((d) => d.ref.delete())));
      await joinWaitlist.run(
        publicRequest({ ...input, email: `p${i}@ejemplo.es` }, `192.0.2.${i}`),
      );
      await confirmWaitlist.run(publicRequest({ token: await tokenFromMail() }));

      const stat = await db().doc('demandStats/malaga_madrid_ss27').get();
      expect(stat.exists).toBe(i >= min);
    }
    const stat = await db().doc('demandStats/malaga_madrid_ss27').get();
    expect(stat.data()).toMatchObject({
      fromCityId: 'malaga',
      toCityId: 'madrid',
      windowId: 'ss27',
      count: min,
    });
    expect((await db().doc('demandCounters/malaga_valencia_ss27').get()).get('count')).toBe(min);
  });
});
