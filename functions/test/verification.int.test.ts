import { Timestamp } from 'firebase-admin/firestore';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import { bucket } from '../src/core/storage.js';
import { adminGetDashboard } from '../src/modules/admin/callables.js';
import {
  adminDecideLocationReview,
  adminDecideVerification,
  adminGetVerification,
  adminGetVerificationFileUrl,
  adminListLocationReviews,
  adminListVerifications,
  getMyVerification,
  requestLocationReview,
  submitIdentityVerification,
  verifyHomeLocation,
} from '../src/modules/verification/callables.js';
import {
  purgeLocationCoordinates,
  purgeVerificationFiles,
} from '../src/modules/verification/jobs.js';
import {
  authedRequest,
  clearFirestore,
  errorCode,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

const NOW = '2027-03-01T10:00:00+01:00';
const laura: TestToken = { uid: 'laura', email: 'laura@ejemplo.es', email_verified: true };
const javier: TestToken = { uid: 'javier', email: 'javier@ejemplo.es', email_verified: true };
const admin: TestToken = {
  uid: 'admin',
  email_verified: true,
  role: 'admin',
  firebase: { sign_in_second_factor: 'totp' },
};
const adminNoMfa: TestToken = { uid: 'admin', email_verified: true, role: 'admin' };
type DocKey = 'idFront' | 'idBack' | 'selfie' | 'propertyDoc' | 'landlordAuthorization';

async function seedUser(uid: string, phone: string) {
  await db()
    .doc(`users/${uid}`)
    .set({
      email: `${uid}@ejemplo.es`,
      firstName: uid === 'laura' ? 'Laura' : 'Javier',
      lastName: 'Prueba',
      birthDate: '1990-01-01',
      phoneE164: phone,
      cityId: 'madrid',
      status: 'ACTIVE',
      verification: { emailVerified: true, phoneVerified: true, identity: 'NONE' },
      onboarding: { step: 6, completedAt: Timestamp.now() },
      moderationHold: null,
      premiumUntil: null,
    });
  await db().doc(`publicProfiles/${uid}`).set({ displayName: uid, identityVerified: false });
}

async function seedHome(uid: string, locationStatus = 'PASS') {
  await db()
    .doc(`homes/${uid}`)
    .set({
      ownerUid: uid,
      status: 'PUBLISHED',
      cityId: 'madrid',
      complete: true,
      visible: false,
      countedCityId: null,
      moderationHold: null,
      locationCheck: { status: locationStatus },
      photos: [],
    });
}

/** Uploads the documents and returns the `files` map of the request. */
async function upload(uid: string, vid: string, keys: readonly DocKey[]) {
  const files: Partial<Record<DocKey, string>> = {};
  for (const key of keys) {
    const path = `private/verifications/${uid}/${vid}/${key}`;
    await bucket()
      .file(path)
      .save(Buffer.from('%PDF-1.4 test'), { contentType: 'application/pdf' });
    files[key] = path;
  }
  return files;
}

async function submit(token: TestToken, vid: string, docNumber = '12345678Z') {
  const files = await upload(token.uid, vid, ['idFront', 'idBack', 'selfie', 'propertyDoc']);
  return submitIdentityVerification.run(
    authedRequest({ tenure: 'OWNER', propertyDocType: 'IBI_RECEIPT', docNumber, files }, token),
  );
}

async function mailTemplates(): Promise<string[]> {
  return (await db().collection('mailQueue').get()).docs
    .map((d) => `${String(d.get('templateId'))}:${String(d.get('to'))}`)
    .sort();
}

beforeEach(async () => {
  await clearFirestore();
  await bucket()
    .deleteFiles({ force: true })
    .catch(() => undefined);
  await seedWaitlistFixtures();
  await seedUser('laura', '+34600000001');
  await seedUser('javier', '+34600000002');
  setClock(fixedClock(NOW));
});

afterEach(() => resetClock());

describe('submitIdentityVerification (FR-08)', () => {
  it('blocks a tenant without the landlord authorization (AC-08.2)', async () => {
    const files = await upload('laura', 'verif0001', [
      'idFront',
      'idBack',
      'selfie',
      'propertyDoc',
    ]);
    const request = authedRequest(
      { tenure: 'TENANT', propertyDocType: 'RENTAL_CONTRACT', docNumber: '12345678Z', files },
      laura,
    );
    expect(await errorCode(submitIdentityVerification.run(request))).toBe(
      'E_LANDLORD_AUTH_REQUIRED',
    );
  });

  it('says which document is missing (AC-08.1)', async () => {
    const files = await upload('laura', 'verif0001', ['idFront', 'idBack']);
    const request = authedRequest(
      { tenure: 'OWNER', propertyDocType: 'DEED', docNumber: '12345678Z', files },
      laura,
    );
    expect(await errorCode(submitIdentityVerification.run(request))).toBe('E_FILES_MISSING');
  });

  it('rejects files that were never uploaded or belong to another user', async () => {
    const files = {
      idFront: 'private/verifications/laura/verif0001/idFront',
      idBack: 'private/verifications/laura/verif0001/idBack',
      selfie: 'private/verifications/laura/verif0001/selfie',
      propertyDoc: 'private/verifications/laura/verif0001/propertyDoc',
    };
    const request = authedRequest(
      { tenure: 'OWNER', propertyDocType: 'DEED', docNumber: '12345678Z', files },
      laura,
    );
    expect(await errorCode(submitIdentityVerification.run(request))).toBe('E_FILES_MISSING');
    const foreign = await upload('javier', 'verif0002', [
      'idFront',
      'idBack',
      'selfie',
      'propertyDoc',
    ]);
    const stolen = authedRequest(
      { tenure: 'OWNER', propertyDocType: 'DEED', docNumber: '12345678Z', files: foreign },
      laura,
    );
    expect(await errorCode(submitIdentityVerification.run(stolen))).toBe('E_VALIDATION');
  });

  it('rejects an invalid DNI/NIE', async () => {
    expect(await errorCode(submit(laura, 'verif0001', '12345678A'))).toBe('E_VALIDATION');
  });

  it('creates a PENDING verification without storing the number', async () => {
    expect(await submit(laura, 'verif0001')).toEqual({
      verificationId: 'verif0001',
      status: 'PENDING',
    });
    const stored = (await db().doc('verifications/verif0001').get()).data();
    expect(JSON.stringify(stored)).not.toContain('12345678');
    expect(stored?.docNumberHash).toMatch(/^[a-f0-9]{64}$/);
    expect((await db().doc('users/laura').get()).get('verification.identity')).toBe('PENDING');
    expect(await errorCode(submit(laura, 'verif0002'))).toBe('E_VERIFICATION_PENDING');
    const { verification } = await getMyVerification.run(authedRequest({}, laura));
    expect(verification).toMatchObject({
      id: 'verif0001',
      status: 'PENDING',
      decisionReason: null,
    });
    expect(verification).not.toHaveProperty('docNumberHash');
  });

  it('flags a document already used by another account and alerts admins (FR-09)', async () => {
    await submit(laura, 'verif0001', '12.345.678-z');
    await submit(javier, 'verif0002', '12345678Z');
    expect((await db().doc('verifications/verif0002').get()).get('duplicateOfUid')).toBe('laura');
    const alerts = await db()
      .collection('adminAlerts')
      .where('type', '==', 'VERIFICATION_DUPLICATE')
      .get();
    expect(alerts.size).toBe(1);
  });
});

describe('admin review (FR-09)', () => {
  it('requires the admin role and a second factor', async () => {
    expect(await errorCode(adminListVerifications.run(authedRequest({}, laura)))).toBe(
      'E_ROLE_REQUIRED',
    );
    expect(await errorCode(adminListVerifications.run(authedRequest({}, adminNoMfa)))).toBe(
      'E_MFA_REQUIRED',
    );
  });

  it('lists the queue oldest first and audits every view and document opening', async () => {
    await submit(laura, 'verif0001');
    setClock(fixedClock('2027-03-01T11:00:00+01:00'));
    await submit(javier, 'verif0002', 'X1234567L');
    const { items } = await adminListVerifications.run(authedRequest({}, admin));
    expect(items.map((item) => item.id)).toEqual(['verif0001', 'verif0002']);
    expect(items[0]).toMatchObject({ displayName: 'Laura P.', cityId: 'madrid', duplicate: false });

    const detail = await adminGetVerification.run(authedRequest({ id: 'verif0001' }, admin));
    expect(detail.verification.files).toEqual(['idFront', 'idBack', 'selfie', 'propertyDoc']);
    const { url } = await adminGetVerificationFileUrl.run(
      authedRequest({ id: 'verif0001', file: 'selfie' }, admin),
    );
    expect(url.startsWith('data:application/pdf;base64,')).toBe(true);
    const audit = (await db().collection('auditLog').get()).docs
      .map((d) => d.get('action') as string)
      .sort();
    expect(audit).toEqual(['verification.file.open', 'verification.view']);
  });

  it('needs a reason to reject or to ask for information', async () => {
    await submit(laura, 'verif0001');
    expect(
      await errorCode(
        adminDecideVerification.run(authedRequest({ id: 'verif0001', decision: 'REJECT' }, admin)),
      ),
    ).toBe('E_REASON_REQUIRED');
    expect(
      await errorCode(
        adminDecideVerification.run(
          authedRequest({ id: 'verif0001', decision: 'REQUEST_INFO' }, admin),
        ),
      ),
    ).toBe('E_REASON_REQUIRED');
  });

  it('approval makes the home visible, awards founder and referral rewards (AC-09.1)', async () => {
    await seedHome('laura');
    await db()
      .doc('referrals/laura')
      .set({ inviterUid: 'javier', inviteeUid: 'laura', code: 'JAVSVC23', status: 'REGISTERED' });
    await submit(laura, 'verif0001');
    const { verification } = await adminDecideVerification.run(
      authedRequest({ id: 'verif0001', decision: 'APPROVE' }, admin),
    );
    expect(verification.status).toBe('APPROVED');

    const user = (await db().doc('users/laura').get()).data();
    expect(user?.verification).toMatchObject({ identity: 'APPROVED' });
    expect(user?.foundingMember).toBe(true);
    // 12 months (founder) + 30 days (referral), stacked.
    expect((user?.premiumUntil as Timestamp).toDate().toISOString()).toBe(
      '2028-03-31T09:00:00.000Z',
    );
    expect((await db().doc('homes/laura').get()).get('visible')).toBe(true);
    expect((await db().doc('cities/madrid').get()).get('counters.foundersAwarded')).toBe(1);
    expect((await db().doc('referrals/laura').get()).get('status')).toBe('REWARDED');
    expect((await db().doc('users/javier').get()).get('premiumUntil')).toBeInstanceOf(Timestamp);
    expect((await db().doc('publicProfiles/laura').get()).data()).toMatchObject({
      identityVerified: true,
      foundingMember: true,
    });
    const sources = (await db().collection('entitlements').get()).docs
      .map((d) => `${String(d.get('uid'))}:${String(d.get('source'))}`)
      .sort();
    expect(sources).toEqual(['javier:REFERRAL', 'laura:FOUNDER', 'laura:REFERRAL']);
    expect(await mailTemplates()).toEqual([
      'N-03:laura@ejemplo.es',
      'N-04:laura@ejemplo.es',
      'N-13:javier@ejemplo.es',
      'N-13:laura@ejemplo.es',
    ]);
    const stored = (await db().doc('verifications/verif0001').get()).data();
    expect((stored?.filesPurgeAt as Timestamp).toDate().toISOString()).toBe(
      '2027-03-31T09:00:00.000Z',
    );
    expect(
      await errorCode(
        adminDecideVerification.run(authedRequest({ id: 'verif0001', decision: 'APPROVE' }, admin)),
      ),
    ).toBe('E_STATE');
  });

  it('no founder reward once the city reached P-08, no referral with a shared phone (BR-19/20)', async () => {
    await db().doc('cities/madrid').update({ 'counters.foundersAwarded': 100 });
    await db().doc('users/javier').update({ phoneE164: '+34600000001' });
    await db()
      .doc('referrals/laura')
      .set({ inviterUid: 'javier', inviteeUid: 'laura', code: 'X', status: 'REGISTERED' });
    await submit(laura, 'verif0001');
    await adminDecideVerification.run(
      authedRequest({ id: 'verif0001', decision: 'APPROVE' }, admin),
    );
    const user = (await db().doc('users/laura').get()).data();
    expect(user?.foundingMember).toBeUndefined();
    expect(user?.premiumUntil).toBeNull();
    expect((await db().doc('referrals/laura').get()).data()).toMatchObject({
      status: 'INELIGIBLE',
      ineligibleReason: 'SAME_PHONE',
    });
  });

  it('asking for information lets the user resubmit; the old files are scheduled for deletion', async () => {
    await submit(laura, 'verif0001');
    await adminDecideVerification.run(
      authedRequest(
        { id: 'verif0001', decision: 'REQUEST_INFO', infoRequest: 'La foto del DNI está borrosa.' },
        admin,
      ),
    );
    const { verification } = await getMyVerification.run(authedRequest({}, laura));
    expect(verification).toMatchObject({
      status: 'INFO_REQUESTED',
      infoRequest: 'La foto del DNI está borrosa.',
    });
    await submit(laura, 'verif0002');
    expect((await db().doc('verifications/verif0001').get()).get('filesPurgeAt')).toBeInstanceOf(
      Timestamp,
    );
  });
});

describe('purge jobs (BR-25, BR-39)', () => {
  it('J-04 deletes documents after P-13 days except fraud suspicions', async () => {
    await submit(laura, 'verif0001');
    await submit(javier, 'verif0002', 'X1234567L');
    await adminDecideVerification.run(
      authedRequest({ id: 'verif0001', decision: 'REJECT', reason: 'Documento ilegible.' }, admin),
    );
    await adminDecideVerification.run(
      authedRequest(
        { id: 'verif0002', decision: 'REJECT', reason: 'Documento falso.', fraudSuspicion: true },
        admin,
      ),
    );
    expect(await purgeVerificationFiles(db(), new Date('2027-03-15T10:00:00Z'))).toBe(0);
    expect(await purgeVerificationFiles(db(), new Date('2027-04-01T10:00:00Z'))).toBe(1);
    const [lauraFiles] = await bucket().getFiles({ prefix: 'private/verifications/laura/' });
    const [javierFiles] = await bucket().getFiles({ prefix: 'private/verifications/javier/' });
    expect(lauraFiles).toHaveLength(0);
    expect(javierFiles).toHaveLength(4);
    expect(
      await errorCode(
        adminGetVerificationFileUrl.run(authedRequest({ id: 'verif0001', file: 'selfie' }, admin)),
      ),
    ).toBe('E_FILES_PURGED');
  });

  it('J-10 removes the rounded coordinates and keeps the result', async () => {
    await seedHome('laura', 'NONE');
    await verifyHomeLocation.run(
      authedRequest({ lat: 40.01, lng: -3.01, accuracyM: 20, isMobile: true }, laura),
    );
    expect(await purgeLocationCoordinates(db(), new Date('2027-04-01T10:00:00Z'))).toBe(1);
    const check = (await db().collection('locationChecks').get()).docs[0]?.data();
    expect(check).toMatchObject({ result: 'PASS', distanceKm: 1 });
    expect(check).not.toHaveProperty('latRounded');
  });
});

describe('verifyHomeLocation (FR-63, BR-39)', () => {
  beforeEach(async () => {
    await seedHome('laura', 'NONE');
  });

  it('passes inside the city radius and stores only rounded data', async () => {
    const result = await verifyHomeLocation.run(
      authedRequest({ lat: 40.12345, lng: -3.0567, accuracyM: 35.4, isMobile: true }, laura),
    );
    expect(result).toEqual({ result: 'PASS', distanceKm: 15, attemptsLeft: 4 });
    const check = (await db().collection('locationChecks').get()).docs[0]?.data();
    expect(check).toMatchObject({ latRounded: 40.12, lngRounded: -3.06, accuracyM: 35 });
    expect((await db().doc('homes/laura').get()).get('locationCheck.status')).toBe('PASS');
  });

  it('fails outside the radius (Valencia) and the home stays hidden', async () => {
    const result = await verifyHomeLocation.run(
      authedRequest({ lat: 39.47, lng: -0.38, accuracyM: 20, isMobile: true }, laura),
    );
    expect(result.result).toBe('FAIL');
    expect((await db().doc('homes/laura').get()).data()).toMatchObject({
      visible: false,
      locationCheck: { status: 'FAIL' },
    });
  });

  it('reports insufficient accuracy without changing the status', async () => {
    const result = await verifyHomeLocation.run(
      authedRequest({ lat: 40, lng: -3, accuracyM: 900, isMobile: false }, laura),
    );
    expect(result.result).toBe('INACCURATE');
    expect((await db().doc('homes/laura').get()).get('locationCheck.status')).toBe('NONE');
  });

  it('allows 5 readings per day', async () => {
    const reading = authedRequest({ lat: 39.47, lng: -0.38, accuracyM: 20, isMobile: true }, laura);
    for (let i = 0; i < 5; i += 1) await verifyHomeLocation.run(reading);
    expect(await errorCode(verifyHomeLocation.run(reading))).toBe('E_LOCATION_ATTEMPTS');
  });

  it('manual review: requested after a failure and approved by an admin', async () => {
    expect(
      await errorCode(
        requestLocationReview.run(
          authedRequest({ note: 'Vivo en el límite de la ciudad.' }, laura),
        ),
      ),
    ).toBe('E_STATE');
    await verifyHomeLocation.run(
      authedRequest({ lat: 39.47, lng: -0.38, accuracyM: 20, isMobile: true }, laura),
    );
    await requestLocationReview.run(
      authedRequest({ note: 'Vivo en el límite de la ciudad.' }, laura),
    );
    const { items } = await adminListLocationReviews.run(authedRequest({}, admin));
    expect(items).toMatchObject([
      { homeId: 'laura', note: 'Vivo en el límite de la ciudad.', lastCheck: { result: 'FAIL' } },
    ]);
    const decided = await adminDecideLocationReview.run(
      authedRequest(
        { homeId: 'laura', decision: 'APPROVE', reason: 'Justificante aportado.' },
        admin,
      ),
    );
    expect(decided.locationCheck).toBe('MANUAL_APPROVED');
  });
});

describe('adminGetDashboard (FR-49)', () => {
  it('counts pending verifications and city progress', async () => {
    await submit(laura, 'verif0001');
    const kpis = await adminGetDashboard.run(authedRequest({}, admin));
    expect(kpis.pendingVerifications.count).toBe(1);
    expect(kpis.cities.find((city) => city.id === 'madrid')).toMatchObject({
      status: 'OPEN',
      threshold: 150,
    });
    expect(kpis.premiumBySource).toEqual({ STRIPE: 0, FOUNDER: 0, REFERRAL: 0, ADMIN: 0 });
  });
});
