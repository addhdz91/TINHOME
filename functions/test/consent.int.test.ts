import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONSENT_TEXTS } from '@tinhome/shared/constants';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { sha256Hex } from '../src/core/crypto.js';
import { db } from '../src/core/firebase.js';
import { acceptLegalDocs, completeSignup } from '../src/modules/account/callables.js';
import { adminListConsents } from '../src/modules/admin/callables.js';
import { submitComplaint, submitPublicReport } from '../src/modules/support/callables.js';
import { joinWaitlist } from '../src/modules/waitlist/callables.js';
import { seedEligible } from './fixtures.js';
import {
  TEST_USER_AGENT,
  authedRequest,
  clearAuth,
  clearFirestore,
  errorCode,
  publicRequest,
  seedLegal,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

const mfa = { sign_in_second_factor: 'totp' };
const admin: TestToken = { uid: 'admin', email_verified: true, role: 'admin', firebase: mfa };
const boss: TestToken = { uid: 'boss', email_verified: true, role: 'superadmin', firebase: mfa };
const laura: TestToken = {
  uid: 'laura',
  email: 'laura@ejemplo.es',
  email_verified: true,
  firebase: { sign_in_provider: 'password' },
};
const signup = {
  firstName: 'Laura',
  lastName: 'García',
  birthDate: '1990-05-10',
  acceptedTerms: '0.1',
  acceptedPrivacy: '0.1',
  acceptedCookies: '0.1',
};
const visitorConsents = { privacidad: '0.1', cookies: '0.1' };
const complaint = {
  category: 'ACCOUNT' as const,
  subject: 'No puedo entrar',
  description: 'Desde ayer no consigo entrar con mi cuenta.',
  email: 'Visitante@Ejemplo.es',
};
const report = {
  name: 'Visitante',
  email: 'visitante@ejemplo.es',
  targetUrl: 'https://tinhome.es/app/casa/javier',
  reason: 'PHOTOS_NOT_OWN' as const,
  description: 'Estas fotos son de mi piso, no de esta persona.',
  goodFaith: true as const,
};

async function records(
  field: 'uid' | 'emailHash',
  value: string,
): Promise<Record<string, unknown>[]> {
  const snaps = await db().collection('legalAcceptances').where(field, '==', value).get();
  return snaps.docs.map((doc): Record<string, unknown> => doc.data());
}

beforeEach(async () => {
  await clearFirestore();
  await clearAuth();
  await seedWaitlistFixtures();
  await seedLegal();
  setClock(fixedClock('2027-03-01T10:00:00+01:00'));
});

afterEach(() => resetClock());

describe('consent evidence (BR-35, RGPD art. 7.1)', () => {
  it('sign-up stores one record per text: what, version, content hash, when and how', async () => {
    await completeSignup.run(authedRequest(signup, laura, '203.0.113.45'));
    const stored = await records('uid', 'laura');
    expect(stored.map((r) => r.slug).sort()).toEqual(['cookies', 'privacidad', 'terminos']);
    for (const record of stored) {
      expect(record).toMatchObject({
        version: '0.1',
        contentHash: sha256Hex('# x'),
        source: 'SIGNUP',
        method: 'CHECKBOX',
        authProvider: 'password',
        ipTruncated: '203.0.113.0/24',
        userAgent: TEST_USER_AGENT,
        emailHash: sha256Hex('laura@ejemplo.es'),
      });
      expect(record.consentText).toBe(CONSENT_TEXTS[record.slug as keyof typeof CONSENT_TEXTS]);
      expect(record.acceptedAt).toBeDefined();
    }
    // The full IP and the e-mail itself are never part of the evidence.
    expect(JSON.stringify(stored)).not.toContain('203.0.113.45');
    expect(JSON.stringify(stored)).not.toContain('laura@ejemplo.es');
  });

  it('sign-up needs the current cookies version and stores nothing otherwise', async () => {
    expect(
      await errorCode(
        completeSignup.run(authedRequest({ ...signup, acceptedCookies: '0.0' }, laura)),
      ),
    ).toBe('E_LEGAL_VERSION');
    const { acceptedCookies: _cookies, ...withoutCookies } = signup;
    expect(await errorCode(completeSignup.run(authedRequest(withoutCookies, laura)))).toBe(
      'E_VALIDATION',
    );
    expect(await records('uid', 'laura')).toHaveLength(0);
    expect((await db().doc('users/laura').get()).exists).toBe(false);
  });

  it('re-acceptance adds a new record and keeps the earlier ones (insert-only)', async () => {
    await completeSignup.run(authedRequest(signup, laura));
    await db().doc('legalDocs/terminos').set({ title: 'terminos', currentVersion: '0.2' });
    await db()
      .doc('legalDocs/terminos/versions/0.2')
      .set({ markdown: '# v2', requiresReacceptance: true });
    await acceptLegalDocs.run(
      authedRequest({ items: [{ slug: 'terminos', version: '0.2' }] }, laura),
    );
    const terms = (await records('uid', 'laura')).filter((r) => r.slug === 'terminos');
    expect(terms.map((r) => [r.version, r.source]).sort()).toEqual([
      ['0.1', 'SIGNUP'],
      ['0.2', 'REACCEPTANCE'],
    ]);
    expect(terms.find((r) => r.version === '0.2')?.contentHash).toBe(sha256Hex('# v2'));
  });

  it('the waitlist stores the three texts by e-mail hash (no account yet)', async () => {
    await joinWaitlist.run(
      publicRequest({
        email: 'Visitante@Ejemplo.es',
        cityId: 'malaga',
        destinations: ['madrid'],
        windowIds: ['ss27'],
        acceptTerms: '0.1',
        acceptPrivacy: '0.1',
        acceptCookies: '0.1',
      }),
    );
    const stored = await records('emailHash', sha256Hex('visitante@ejemplo.es'));
    expect(stored.map((r) => [r.slug, r.source, r.uid]).sort()).toEqual([
      ['cookies', 'WAITLIST', null],
      ['privacidad', 'WAITLIST', null],
      ['terminos', 'WAITLIST', null],
    ]);
  });

  it('a visitor complaint needs privacy and cookies; an account does not repeat them', async () => {
    expect(await errorCode(submitComplaint.run(publicRequest(complaint)))).toBe('E_VALIDATION');
    expect(
      await errorCode(
        submitComplaint.run(
          publicRequest({ ...complaint, consents: { ...visitorConsents, cookies: '0.0' } }),
        ),
      ),
    ).toBe('E_LEGAL_VERSION');
    expect(await db().collection('supportTickets').get()).toHaveProperty('size', 0);

    await submitComplaint.run(publicRequest({ ...complaint, consents: visitorConsents }));
    const stored = await records('emailHash', sha256Hex('visitante@ejemplo.es'));
    expect(stored.map((r) => [r.type, r.source]).sort()).toEqual([
      ['COOKIES', 'PUBLIC_COMPLAINT'],
      ['PRIVACY', 'PUBLIC_COMPLAINT'],
    ]);

    await seedEligible('laura', 'madrid');
    const before = (await db().collection('legalAcceptances').get()).size;
    const { email: _email, ...fromAccount } = complaint;
    await submitComplaint.run(authedRequest(fromAccount, laura));
    expect((await db().collection('legalAcceptances').get()).size).toBe(before);
  });

  it('a public report stores privacy and cookies and rejects a stale version', async () => {
    await seedEligible('javier', 'valencia');
    expect(
      await errorCode(
        submitPublicReport.run(
          publicRequest({ ...report, consents: { ...visitorConsents, privacidad: '0.0' } }),
        ),
      ),
    ).toBe('E_LEGAL_VERSION');
    const { reportId } = await submitPublicReport.run(
      publicRequest({ ...report, consents: visitorConsents }),
    );
    expect(reportId).toBeTruthy();
    const stored = await records('emailHash', sha256Hex('visitante@ejemplo.es'));
    expect(stored.map((r) => r.source)).toEqual(['PUBLIC_REPORT', 'PUBLIC_REPORT']);
  });
});

describe('adminListConsents (SADM)', () => {
  it('finds records by account or e-mail, only for superadmins, and audits each lookup', async () => {
    await completeSignup.run(authedRequest(signup, laura));

    expect(await errorCode(adminListConsents.run(authedRequest({ uid: 'laura' }, laura)))).toBe(
      'E_ROLE_REQUIRED',
    );
    expect(await errorCode(adminListConsents.run(authedRequest({ uid: 'laura' }, admin)))).toBe(
      'E_ROLE_REQUIRED',
    );
    expect(await errorCode(adminListConsents.run(authedRequest({}, boss)))).toBe('E_VALIDATION');

    const byUid = await adminListConsents.run(authedRequest({ uid: 'laura' }, boss));
    expect(byUid.items).toHaveLength(3);
    expect(byUid.items[0]).toMatchObject({ uid: 'laura', source: 'SIGNUP', method: 'CHECKBOX' });
    expect(byUid.items[0]?.acceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const byEmail = await adminListConsents.run(authedRequest({ email: 'LAURA@Ejemplo.es' }, boss));
    expect(byEmail.items.map((i) => i.id).sort()).toEqual(byUid.items.map((i) => i.id).sort());

    const audit = await db().collection('auditLog').where('action', '==', 'consents.view').get();
    expect(audit.size).toBe(2);
    // The audit trail does not carry the e-mail that was searched.
    expect(JSON.stringify(audit.docs.map((d) => d.data()))).not.toContain('laura@ejemplo.es');
  });
});
