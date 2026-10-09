import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { sha256Hex } from '../src/core/crypto.js';
import { adminAuth, db } from '../src/core/firebase.js';
import {
  acceptLegalDocs,
  completeSignup,
  confirmPhoneLinked,
  getMe,
  signOutEverywhere,
  updateSettings,
} from '../src/modules/account/callables.js';
import {
  authedRequest,
  clearAuth,
  clearFirestore,
  errorCode,
  seedLegal,
  type TestToken,
} from './helpers.js';

const NOW = '2027-03-01T10:00:00+01:00';
const laura: TestToken = { uid: 'laura', email: 'laura@ejemplo.es', email_verified: true };
const signup = {
  firstName: 'Laura',
  lastName: 'García',
  birthDate: '1990-05-10',
  acceptedTerms: '0.1',
  acceptedPrivacy: '0.1',
};

async function mails(templateId: string) {
  const snap = await db().collection('mailQueue').where('templateId', '==', templateId).get();
  return snap.docs.map((doc): Record<string, unknown> => doc.data());
}

beforeEach(async () => {
  await clearFirestore();
  await clearAuth();
  await seedLegal();
  setClock(fixedClock(NOW));
});

afterEach(() => {
  resetClock();
});

describe('completeSignup', () => {
  it('creates the user, public profile, acceptances, own referral code and welcome e-mail', async () => {
    const { me } = await completeSignup.run(authedRequest(signup, laura));

    expect(me).toMatchObject({
      uid: 'laura',
      firstName: 'Laura',
      status: 'ACTIVE',
      onboarding: { step: 2, completed: false, percent: 17 },
      verification: { emailVerified: true, phoneVerified: false, identity: 'NONE' },
      canLike: false,
      legalPending: [],
      settings: { theme: 'system' },
    });
    expect(me.blockers[0]).toBe('PHONE');
    expect(me.referralCode).toMatch(/^[A-Z2-9]{8}$/);

    const user = await db().doc('users/laura').get();
    expect(user.data()).toMatchObject({
      birthDate: '1990-05-10',
      legal: { terminos: '0.1', privacidad: '0.1' },
    });
    const profile = await db().doc('publicProfiles/laura').get();
    expect(profile.get('displayName')).toBe('Laura G.');
    expect((await db().doc(`referralCodes/${me.referralCode}`).get()).get('uid')).toBe('laura');
    const acceptances = await db().collection('legalAcceptances').where('uid', '==', 'laura').get();
    expect(acceptances.docs.map((d) => String(d.get('type'))).sort()).toEqual(['PRIVACY', 'TERMS']);
    expect(acceptances.docs[0]?.get('ipTruncated')).toBe('203.0.113.0/24');
    expect(await mails('N-02')).toHaveLength(1);
  });

  it('T-D01 — rejects a minor the day before turning 18 and accepts on the birthday', async () => {
    const minor = { ...signup, birthDate: '2009-03-02' };
    expect(await errorCode(completeSignup.run(authedRequest(minor, laura)))).toBe('E_UNDERAGE');
    expect((await db().doc('users/laura').get()).exists).toBe(false);

    const birthday = { ...signup, birthDate: '2009-03-01' };
    await expect(completeSignup.run(authedRequest(birthday, laura))).resolves.toBeDefined();
  });

  it('rejects future or impossible birth dates, outdated legal versions and duplicates', async () => {
    expect(
      await errorCode(
        completeSignup.run(authedRequest({ ...signup, birthDate: '2030-01-01' }, laura)),
      ),
    ).toBe('E_VALIDATION');
    expect(
      await errorCode(
        completeSignup.run(authedRequest({ ...signup, acceptedTerms: '0.0' }, laura)),
      ),
    ).toBe('E_LEGAL_VERSION');
    await completeSignup.run(authedRequest(signup, laura));
    expect(await errorCode(completeSignup.run(authedRequest(signup, laura)))).toBe(
      'E_ALREADY_EXISTS',
    );
  });

  it('requires a session', async () => {
    const { auth: _auth, ...anonymous } = authedRequest(signup, laura);
    expect(await errorCode(completeSignup.run(anonymous))).toBe('E_UNAUTHENTICATED');
  });

  it('stores a valid invitation (AC-01.5) and ignores an unknown one', async () => {
    const { me: inviter } = await completeSignup.run(authedRequest(signup, laura));
    const javier = { uid: 'javier', email: 'javier@ejemplo.es', email_verified: true };
    await completeSignup.run(
      authedRequest(
        { ...signup, firstName: 'Javier', referralCode: inviter.referralCode.toLowerCase() },
        javier,
      ),
    );

    expect((await db().doc('users/javier').get()).get('referredBy')).toBe('laura');
    expect((await db().doc('referrals/javier').get()).data()).toMatchObject({
      inviterUid: 'laura',
      status: 'REGISTERED',
    });

    const ana = { uid: 'ana', email: 'ana@ejemplo.es', email_verified: true };
    await completeSignup.run(authedRequest({ ...signup, referralCode: 'ZZZZZZZZ' }, ana));
    expect((await db().doc('users/ana').get()).get('referredBy')).toBeUndefined();
    expect((await db().doc('referrals/ana').get()).exists).toBe(false);
  });

  it('converts a waitlist entry with the same e-mail and keeps its preferences (FR-19)', async () => {
    await db()
      .doc(`waitlist/${sha256Hex('laura@ejemplo.es')}`)
      .set({
        email: 'laura@ejemplo.es',
        cityId: 'madrid',
        destinations: ['valencia'],
        windowIds: ['semana-santa-2027'],
        status: 'CONFIRMED',
      });
    await completeSignup.run(authedRequest(signup, laura));
    expect(
      (
        await db()
          .doc(`waitlist/${sha256Hex('laura@ejemplo.es')}`)
          .get()
      ).get('status'),
    ).toBe('CONVERTED');
    expect((await db().doc('users/laura').get()).get('waitlistPrefill')).toEqual({
      cityId: 'madrid',
      destinations: ['valencia'],
      windowIds: ['semana-santa-2027'],
    });
  });
});

describe('getMe', () => {
  it('needs an existing profile', async () => {
    expect(await errorCode(getMe.run(authedRequest({}, laura)))).toBe('E_NOT_FOUND');
  });

  it('reports legal texts that must be accepted again (FR-58) and Premium', async () => {
    await completeSignup.run(authedRequest(signup, laura));
    await db().doc('legalDocs/terminos').set({ title: 'terminos', currentVersion: '0.2' });
    await db()
      .doc('legalDocs/terminos/versions/0.2')
      .set({ markdown: '#', requiresReacceptance: true });
    await db()
      .doc('users/laura')
      .update({ premiumUntil: new Date('2027-04-01T00:00:00Z'), premiumSource: 'ADMIN' });

    const me = await getMe.run(authedRequest({}, { ...laura, role: 'superadmin' }));
    expect(me.legalPending).toEqual([
      { slug: 'terminos', version: '0.2', requiresReacceptance: true },
    ]);
    expect(me.blockers).toContain('LEGAL_OUTDATED');
    expect(me.premium).toMatchObject({
      active: true,
      source: 'ADMIN',
      until: '2027-04-01T00:00:00.000Z',
    });
    expect(me.likes.remainingToday).toBeNull();
    expect(me.roles).toEqual(['superadmin']);
  });
});

describe('updateSettings and acceptLegalDocs', () => {
  it('stores the theme', async () => {
    await completeSignup.run(authedRequest(signup, laura));
    await updateSettings.run(authedRequest({ theme: 'black' }, laura));
    expect((await db().doc('users/laura').get()).get('settings.theme')).toBe('black');
    expect(await errorCode(updateSettings.run(authedRequest({ theme: 'sepia' }, laura)))).toBe(
      'E_VALIDATION',
    );
  });

  it('records the acceptance of the current version only', async () => {
    await completeSignup.run(authedRequest(signup, laura));
    await db().doc('legalDocs/terminos').set({ title: 'terminos', currentVersion: '0.2' });
    await db()
      .doc('legalDocs/terminos/versions/0.2')
      .set({ markdown: '#', requiresReacceptance: true });

    expect(
      await errorCode(
        acceptLegalDocs.run(
          authedRequest({ items: [{ slug: 'terminos', version: '0.1' }] }, laura),
        ),
      ),
    ).toBe('E_LEGAL_VERSION');
    expect(
      await errorCode(
        acceptLegalDocs.run(authedRequest({ items: [{ slug: 'cookies', version: '0.1' }] }, laura)),
      ),
    ).toBe('E_VALIDATION');
    await acceptLegalDocs.run(
      authedRequest({ items: [{ slug: 'terminos', version: '0.2' }] }, laura),
    );
    expect((await db().doc('users/laura').get()).get('legal.terminos')).toBe('0.2');
    expect((await getMe.run(authedRequest({}, laura))).legalPending).toEqual([]);
  });
});

describe('confirmPhoneLinked', () => {
  it('requires a verified e-mail and a linked Spanish mobile', async () => {
    await completeSignup.run(authedRequest(signup, laura));
    expect(
      await errorCode(
        confirmPhoneLinked.run(authedRequest({}, { ...laura, email_verified: false })),
      ),
    ).toBe('E_EMAIL_NOT_VERIFIED');

    await adminAuth().createUser({ uid: 'laura', email: 'laura@ejemplo.es' });
    expect(await errorCode(confirmPhoneLinked.run(authedRequest({}, laura)))).toBe(
      'E_PHONE_NOT_LINKED',
    );

    await adminAuth().updateUser('laura', { phoneNumber: '+33612345678' });
    expect(await errorCode(confirmPhoneLinked.run(authedRequest({}, laura)))).toBe(
      'E_PHONE_NOT_ES',
    );
  });

  it('marks the phone as verified and moves the onboarding to step 3', async () => {
    await completeSignup.run(authedRequest(signup, laura));
    await adminAuth().createUser({
      uid: 'laura',
      email: 'laura@ejemplo.es',
      phoneNumber: '+34612345678',
    });
    await expect(confirmPhoneLinked.run(authedRequest({}, laura))).resolves.toEqual({
      phoneVerified: true,
    });

    const user = await db().doc('users/laura').get();
    expect(user.get('verification.phoneVerified')).toBe(true);
    expect(user.get('onboarding.step')).toBe(3);
    expect(user.get('phoneE164')).toBe('+34612345678');
  });
});

describe('signOutEverywhere', () => {
  it('requires a sign-in in the last 5 minutes', async () => {
    const old = Math.floor(new Date(NOW).getTime() / 1000) - 6 * 60;
    expect(
      await errorCode(signOutEverywhere.run(authedRequest({}, { ...laura, auth_time: old }))),
    ).toBe('E_REAUTH_REQUIRED');
  });

  it('revokes every session and sends N-27', async () => {
    await completeSignup.run(authedRequest(signup, laura));
    await adminAuth().createUser({ uid: 'laura', email: 'laura@ejemplo.es' });
    const recent = Math.floor(new Date(NOW).getTime() / 1000) - 60;

    await expect(
      signOutEverywhere.run(authedRequest({}, { ...laura, auth_time: recent })),
    ).resolves.toEqual({ ok: true });
    const user = await adminAuth().getUser('laura');
    expect(user.tokensValidAfterTime).toBeDefined();
    const [mail] = await mails('N-27');
    expect(mail).toMatchObject({
      to: 'laura@ejemplo.es',
      data: { event: 'SIGNED_OUT_EVERYWHERE' },
    });
  });
});
