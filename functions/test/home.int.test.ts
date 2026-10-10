import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PARAM_DEFAULTS } from '@tinhome/shared/constants';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import { bucket } from '../src/core/storage.js';
import {
  acceptDeclaration,
  deleteHomePhoto,
  pauseHome,
  publishHome,
  unpauseHome,
  updateTravelPrefs,
  upsertHome,
} from '../src/modules/home/callables.js';
import { processHomePhoto } from '../src/modules/home/photos.js';
import { recomputeHome } from '../src/modules/home/visibility.js';
import {
  authedRequest,
  clearFirestore,
  errorCode,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';
import { testJpeg } from './images.js';

const NOW = '2027-03-01T10:00:00+01:00';
const laura: TestToken = { uid: 'laura', email: 'laura@ejemplo.es', email_verified: true };
const home = {
  title: 'Piso luminoso en Chamberí',
  description:
    'Piso exterior de 80 m2 con dos dormitorios, salón amplio y cocina equipada, cerca del metro.',
  cityId: 'madrid',
  zone: 'Chamberí',
  type: 'FLAT',
  tenure: 'OWNER',
  residenceUse: 'PRIMARY',
  sizeM2: 80,
  bedrooms: 2,
  beds: 3,
  bathrooms: 1,
  maxGuests: 4,
  petsAllowed: true,
  amenities: ['WIFI', 'KITCHEN'],
  houseRules: 'No fumar dentro de casa.',
};

async function seedUser(uid: string, step = 3, phoneVerified = true) {
  await db()
    .doc(`users/${uid}`)
    .set({
      email: `${uid}@ejemplo.es`,
      status: 'ACTIVE',
      verification: { emailVerified: true, phoneVerified, identity: 'NONE' },
      onboarding: { step },
      moderationHold: null,
    });
}

async function uploadAndProcess(uid: string, photoId: string, image: Buffer) {
  await bucket().file(`homes/${uid}/raw/${photoId}`).save(image, { contentType: 'image/jpeg' });
  return processHomePhoto(db(), `homes/${uid}/raw/${photoId}`, PARAM_DEFAULTS, new Date(NOW));
}

async function clearStorage() {
  await bucket()
    .deleteFiles({ force: true })
    .catch(() => undefined);
}

beforeEach(async () => {
  await clearFirestore();
  await clearStorage();
  await seedWaitlistFixtures();
  await db()
    .doc('legalDocs/declaracion-responsable')
    .set({ title: 'Declaración', currentVersion: '0.1' });
  await seedUser('laura');
  setClock(fixedClock(NOW));
});

afterEach(() => resetClock());

describe('upsertHome (FR-10)', () => {
  it('creates a draft home that is not visible', async () => {
    const { home: view } = await upsertHome.run(authedRequest(home, laura));
    expect(view).toMatchObject({
      id: 'laura',
      status: 'DRAFT',
      visible: false,
      complete: false,
      photos: [],
    });
    expect((await db().doc('users/laura').get()).get('cityId')).toBe('madrid');
  });

  it('AC-10.1 — rejects phones, prices and rental vocabulary marking the field', async () => {
    try {
      await upsertHome.run(
        authedRequest(
          { ...home, description: `${home.description} Llama al 612 345 678, 50 €/noche.` },
          laura,
        ),
      );
      expect.unreachable();
    } catch (error) {
      expect(
        (error as { details: { code: string; fields: Record<string, string> } }).details,
      ).toMatchObject({
        code: 'E_TEXT_VIOLATION',
        fields: { description: expect.stringContaining('PHONE') as unknown },
      });
    }
  });

  it('saves partial drafts so the user can continue later (AC-06.1)', async () => {
    const { home: draft } = await upsertHome.run(
      authedRequest({ cityId: 'madrid', type: 'FLAT', maxGuests: 2 }, laura),
    );
    expect(draft).toMatchObject({
      status: 'DRAFT',
      complete: false,
      type: 'FLAT',
      maxGuests: 2,
      petsAllowed: false,
    });
    const { home: more } = await upsertHome.run(
      authedRequest({ cityId: 'madrid', title: 'Ático con terraza en Lavapiés' }, laura),
    );
    expect(more).toMatchObject({ type: 'FLAT', title: 'Ático con terraza en Lavapiés' });
    expect((await db().doc('homes/laura').get()).get('searchKeys')).toEqual({
      capacityBucket: 2,
      hasPets: false,
    });
  });

  it('rejects unknown cities and unverified e-mails', async () => {
    expect(
      await errorCode(upsertHome.run(authedRequest({ ...home, cityId: 'atlantida' }, laura))),
    ).toBe('E_CITY_UNKNOWN');
    expect(
      await errorCode(upsertHome.run(authedRequest(home, { ...laura, email_verified: false }))),
    ).toBe('E_EMAIL_NOT_VERIFIED');
  });
});

describe('photo processing (FR-11, FR-64)', () => {
  it('removes EXIF/GPS, writes three WebP sizes, deletes the original and stores the dHash', async () => {
    await upsertHome.run(authedRequest(home, laura));
    const original = await testJpeg(1, { exif: true });
    expect((await sharp(original).metadata()).exif).toBeDefined();

    expect(await uploadAndProcess('laura', 'p1', original)).toEqual({ status: 'PROCESSED' });

    const [rawExists] = await bucket().file('homes/laura/raw/p1').exists();
    expect(rawExists).toBe(false);
    for (const size of ['thumb', 'card', 'full']) {
      const [buffer] = await bucket().file(`homes/laura/photos/p1_${size}.webp`).download();
      const meta = await sharp(buffer).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.exif).toBeUndefined();
    }
    const photos = (await db().doc('homes/laura').get()).get('photos') as {
      dhash: string;
      cardUrl: string;
      width: number;
    }[];
    expect(photos).toHaveLength(1);
    expect(photos[0]?.dhash).toMatch(/^[0-9a-f]{16}$/);
    expect(photos[0]?.cardUrl).toContain('token=');
    expect(photos[0]?.width).toBe(1080);
  });

  it('puts a home on preventive hold when a photo duplicates another home (BR-40)', async () => {
    await seedUser('javier');
    await upsertHome.run(
      authedRequest(
        { ...home, cityId: 'valencia' },
        { uid: 'javier', email: 'javier@ejemplo.es', email_verified: true },
      ),
    );
    await uploadAndProcess('javier', 'j1', await testJpeg(7));

    await upsertHome.run(authedRequest(home, laura));
    // Same picture, resized and re-compressed.
    const copy = await sharp(await testJpeg(7))
      .resize({ width: 900 })
      .jpeg({ quality: 70 })
      .toBuffer();
    const result = await uploadAndProcess('laura', 'l1', copy);

    expect(result.duplicateOf).toEqual({ homeId: 'javier', photoId: 'j1' });
    const held = await db().doc('homes/laura').get();
    expect(held.get('moderationHold')).toMatchObject({ active: true, reason: 'PHOTO_DUPLICATE' });
    expect(held.get('visible')).toBe(false);
    const alerts = await db().collection('adminAlerts').get();
    expect(alerts.docs[0]?.data()).toMatchObject({
      type: 'PHOTO_DUPLICATE',
      refId: 'laura',
      priority: 'HIGH',
    });
    const mails = await db().collection('mailQueue').where('templateId', '==', 'N-23').get();
    expect(mails.size).toBe(1);
  });

  it('does not flag different pictures', async () => {
    await upsertHome.run(authedRequest(home, laura));
    await uploadAndProcess('laura', 'a', await testJpeg(1));
    await uploadAndProcess('laura', 'b', await testJpeg(2));
    expect((await db().doc('homes/laura').get()).get('moderationHold')).toBeNull();
  });
});

describe('publication and visibility (BR-03, BR-04)', () => {
  async function homeWithPhotos(count: number) {
    await upsertHome.run(authedRequest(home, laura));
    for (let i = 0; i < count; i += 1)
      await uploadAndProcess('laura', `p${String(i)}`, await testJpeg(10 + i, { width: 640 }));
  }

  it('advances the onboarding to step 4 once data and 5 photos are in', async () => {
    await homeWithPhotos(5);
    const { home: view } = await upsertHome.run(authedRequest(home, laura));
    expect(view.complete).toBe(true);
    expect((await db().doc('users/laura').get()).get('onboarding.step')).toBe(4);
  });

  it('refuses to publish without 5 photos or without the declaration', async () => {
    await homeWithPhotos(4);
    try {
      await publishHome.run(authedRequest({}, laura));
      expect.unreachable();
    } catch (error) {
      expect(
        (error as { details: { code: string; meta: { missing: string[] } } }).details,
      ).toMatchObject({
        code: 'E_HOME_INCOMPLETE',
        meta: { missing: ['photos'] },
      });
    }
    await uploadAndProcess('laura', 'p9', await testJpeg(30, { width: 640 }));
    expect(await errorCode(publishHome.run(authedRequest({}, laura)))).toBe(
      'E_DECLARATION_REQUIRED',
    );
  });

  it('publishes but stays hidden until identity and location are verified (DoD)', async () => {
    await homeWithPhotos(5);
    await acceptDeclaration.run(authedRequest({ version: '0.1' }, laura));
    const result = await publishHome.run(authedRequest({}, laura));
    expect(result.visible).toBe(false);
    expect(result.pendingReasons).toEqual(['IDENTITY', 'LOCATION']);
    expect((await db().doc('cities/madrid').get()).get('counters.visibleCandidates')).toBe(0);

    await db().doc('users/laura').update({ 'verification.identity': 'APPROVED' });
    await db()
      .doc('homes/laura')
      .update({ locationCheck: { status: 'PASS' } });
    const state = await recomputeHome(db(), 'laura', PARAM_DEFAULTS);
    expect(state?.visible).toBe(true);
    expect((await db().doc('cities/madrid').get()).get('counters.visibleCandidates')).toBe(1);

    await pauseHome.run(authedRequest({}, laura));
    expect((await db().doc('homes/laura').get()).get('visible')).toBe(false);
    expect((await db().doc('cities/madrid').get()).get('counters.visibleCandidates')).toBe(0);
    await unpauseHome.run(authedRequest({}, laura));
    expect((await db().doc('homes/laura').get()).get('visible')).toBe(true);
    expect(await errorCode(unpauseHome.run(authedRequest({}, laura)))).toBe('E_HOME_STATE');
    expect(await errorCode(deleteHomePhoto.run(authedRequest({ photoId: 'p0' }, laura)))).toBe(
      'E_PHOTOS_MIN',
    );
  });
});

describe('updateTravelPrefs (FR-14–16)', () => {
  const prefs = {
    destinations: { mode: 'LIST', cityIds: ['valencia'] },
    availability: { windowIds: ['ss27'], ranges: [{ start: '2027-06-01', end: '2027-06-10' }] },
    travelers: { count: 3, withPet: false },
  };

  it('saves preferences and advances step 4 → 5', async () => {
    await seedUser('laura', 4);
    await upsertHome.run(authedRequest(home, laura));
    const { home: view } = await updateTravelPrefs.run(authedRequest(prefs, laura));
    expect(view.destinations).toEqual({ mode: 'LIST', cityIds: ['valencia'] });
    expect((await db().doc('users/laura').get()).get('onboarding.step')).toBe(5);
  });

  it('validates ranges, own city and inactive windows', async () => {
    await upsertHome.run(authedRequest(home, laura));
    expect(
      await errorCode(
        updateTravelPrefs.run(
          authedRequest(
            {
              ...prefs,
              availability: { windowIds: [], ranges: [{ start: '2027-02-01', end: '2027-02-05' }] },
            },
            laura,
          ),
        ),
      ),
    ).toBe('E_RANGE_INVALID');
    expect(
      await errorCode(
        updateTravelPrefs.run(
          authedRequest({ ...prefs, destinations: { mode: 'LIST', cityIds: ['madrid'] } }, laura),
        ),
      ),
    ).toBe('E_VALIDATION');
    expect(
      await errorCode(
        updateTravelPrefs.run(
          authedRequest({ ...prefs, availability: { windowIds: ['old'], ranges: [] } }, laura),
        ),
      ),
    ).toBe('E_VALIDATION');
    const any = await updateTravelPrefs.run(
      authedRequest({ ...prefs, destinations: { mode: 'ANY_OPEN', cityIds: ['valencia'] } }, laura),
    );
    expect(any.home.destinations).toEqual({ mode: 'ANY_OPEN', cityIds: [] });
  });
});
