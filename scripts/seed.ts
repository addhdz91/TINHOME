/**
 * Sample data for the emulators (03_TECHNICAL_SPEC.md §13). Grows milestone by milestone:
 * M0 → `config/params` + `config/public`.
 * M1 → cities, windows, provisional legal texts, demand counters.
 * M2 → demo users (Auth emulator + users/publicProfiles), FAQ articles.
 * M3 → Javier's published home (photos uploaded to the Storage emulator), travel preferences.
 *
 * Usage: `pnpm emulators` in one terminal, then `pnpm seed`. Idempotent (overwrites).
 * Needs the Auth, Firestore and Storage emulators.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import {
  DECLARATION_SLUG,
  DEMO_PROJECT_ID,
  PARAM_DEFAULTS,
  toPublicConfig,
} from '@tinhome/shared/constants';
import { demandStatId, dhashBands } from '@tinhome/shared/domain';
import { CITIES, DEMAND, WINDOWS } from './seed-data/cities.js';
import { FAQS } from './seed-data/faqs.js';
import { DEMO_HOMES, type DemoHome } from './seed-data/homes.js';
import { LEGAL_DOCS, LEGAL_VERSION, REACCEPTANCE } from './seed-data/legal.js';
import { photosFor, uploadPhotoPool, type SeedPhoto } from './seed-data/photos.js';
import { DEMO_PASSWORD, DEMO_USERS } from './seed-data/users.js';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199';

const projectId = process.env.GCLOUD_PROJECT ?? DEMO_PROJECT_ID;
if (!projectId.startsWith('demo-')) {
  // Safety net: seeding is only allowed against a demo (emulator-only) project.
  console.error(`Refusing to seed project "${projectId}": only demo-* projects are allowed.`);
  process.exit(1);
}

const bucketName = process.env.STORAGE_BUCKET ?? `${projectId}.appspot.com`;
initializeApp({ projectId, storageBucket: bucketName });
const db = getFirestore();
const auth = getAuth();
const now = FieldValue.serverTimestamp();

async function seedConfig(): Promise<void> {
  await db.doc('config/params').set({ ...PARAM_DEFAULTS, updatedAt: now });
  await db.doc('config/public').set({ ...toPublicConfig(PARAM_DEFAULTS), updatedAt: now });
}

async function seedCitiesAndWindows(): Promise<void> {
  const batch = db.batch();
  for (const [id, city] of Object.entries(CITIES)) batch.set(db.doc(`cities/${id}`), city);
  for (const [id, window] of Object.entries(WINDOWS)) batch.set(db.doc(`windows/${id}`), window);
  await batch.commit();
}

async function seedLegal(): Promise<void> {
  const batch = db.batch();
  for (const [slug, docData] of Object.entries(LEGAL_DOCS)) {
    batch.set(db.doc(`legalDocs/${slug}`), { title: docData.title, currentVersion: LEGAL_VERSION });
    batch.set(db.doc(`legalDocs/${slug}/versions/${LEGAL_VERSION}`), {
      markdown: docData.markdown,
      publishedAt: now,
      requiresReacceptance: slug in REACCEPTANCE,
      changeSummary:
        REACCEPTANCE[slug as keyof typeof REACCEPTANCE] ?? 'Borrador provisional (LEG-03)',
    });
  }
  await batch.commit();
}

async function seedDemand(): Promise<void> {
  const batch = db.batch();
  for (const pair of DEMAND) {
    const id = demandStatId(pair.from, pair.to, pair.window);
    const data = {
      fromCityId: pair.from,
      toCityId: pair.to,
      windowId: pair.window,
      count: pair.count,
      updatedAt: now,
    };
    batch.set(db.doc(`demandCounters/${id}`), data);
    // FR-18 — published only at or above P-18.
    if (pair.count >= PARAM_DEFAULTS.demandCounterMin) batch.set(db.doc(`demandStats/${id}`), data);
    else batch.delete(db.doc(`demandStats/${id}`));
  }
  await batch.commit();
}

async function seedFaqs(): Promise<void> {
  const batch = db.batch();
  for (const [slug, faq] of Object.entries(FAQS)) {
    batch.set(db.doc(`faqs/${slug}`), {
      ...faq,
      published: true,
      helpfulYes: 0,
      helpfulNo: 0,
      updatedAt: now,
    });
  }
  await batch.commit();
}

async function seedUsers(): Promise<void> {
  for (const demo of DEMO_USERS) {
    await auth.deleteUser(demo.uid).catch(() => undefined);
    await auth.createUser({
      uid: demo.uid,
      email: demo.email,
      emailVerified: true,
      password: DEMO_PASSWORD,
      phoneNumber: demo.phone,
      displayName: `${demo.firstName} ${demo.lastName}`,
    });
    if (demo.role) await auth.setCustomUserClaims(demo.uid, { role: demo.role });

    const premiumUntil =
      demo.premiumMonths > 0
        ? Timestamp.fromMillis(Date.now() + demo.premiumMonths * 30 * 86_400_000)
        : null;
    const batch = db.batch();
    batch.set(db.doc(`users/${demo.uid}`), {
      email: demo.email,
      firstName: demo.firstName,
      lastName: demo.lastName,
      birthDate: demo.birthDate,
      phoneE164: demo.phone,
      status: 'ACTIVE',
      verification: { emailVerified: true, phoneVerified: true, identity: 'NONE' },
      // Users with a demo home finished onboarding; the rest start at step 3 (FR-06).
      onboarding: DEMO_HOMES.some((home) => home.ownerUid === demo.uid)
        ? { step: 6, completedAt: now }
        : { step: 3 },
      cityId: demo.cityId,
      premiumUntil,
      premiumSource: premiumUntil ? 'ADMIN' : null,
      strikesActive: 0,
      moderationHold: null,
      foundingMember: false,
      referralCode: demo.referralCode,
      withdrawalUsed: false,
      legal: {
        terminos: demo.acceptedTerms === 'current' ? LEGAL_VERSION : demo.acceptedTerms,
        privacidad: LEGAL_VERSION,
      },
      settings: { theme: demo.theme, notifications: {} },
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.doc(`publicProfiles/${demo.uid}`), {
      displayName: `${demo.firstName} ${demo.lastName.charAt(0)}.`,
      photoUrl: null,
      languages: ['es'],
      memberSince: now,
      identityVerified: false,
      foundingMember: false,
      isTopHost: false,
      reviewsCount: 0,
      active: true,
    });
    batch.set(db.doc(`referralCodes/${demo.referralCode}`), { uid: demo.uid, createdAt: now });
    if (premiumUntil) {
      batch.set(db.doc(`entitlements/seed-${demo.uid}`), {
        uid: demo.uid,
        source: 'ADMIN',
        startsAt: now,
        endsAt: premiumUntil,
        reason: 'Usuario demo Premium (seed)',
      });
    }
    await batch.commit();
  }
}

/** Same shape `upsertHome` + `updateTravelPrefs` + `publishHome` leave (04 §homes). */
function homeDoc(home: DemoHome, photos: SeedPhoto[], ownerPremium: boolean) {
  return {
    ownerUid: home.ownerUid,
    title: home.title,
    description: home.description,
    cityId: home.cityId,
    zone: home.zone,
    type: home.type,
    tenure: 'OWNER',
    residenceUse: 'PRIMARY',
    sizeM2: home.sizeM2,
    bedrooms: home.bedrooms,
    beds: home.beds,
    bathrooms: home.bathrooms,
    maxGuests: home.maxGuests,
    petsAllowed: home.petsAllowed,
    amenities: home.amenities,
    houseRules: home.houseRules,
    searchKeys: { capacityBucket: home.maxGuests, hasPets: home.petsAllowed },
    status: 'PUBLISHED',
    // BR-04: not visible until identity and location are verified (M4).
    visible: false,
    complete: true,
    photos,
    photoChangeLog: [],
    destinations: { mode: 'LIST', cityIds: home.destinations },
    availability: { windowIds: home.windowIds, ranges: [] },
    travelers: home.travelers,
    declaration: { version: LEGAL_VERSION, acceptedAt: now },
    rating: { avg: 0, count: 0, sub: { cleanliness: 0, accuracy: 0, communication: 0, care: 0 } },
    isTop: false,
    locationCheck: { status: 'NONE' },
    moderationHold: null,
    ownerPremium,
    ownerFounding: false,
    countedCityId: null,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedHomes(): Promise<void> {
  // Demo users without a demo home start again from step 3 (homes left by manual tests or E2E).
  for (const demo of DEMO_USERS) {
    if (!DEMO_HOMES.some((home) => home.ownerUid === demo.uid)) {
      await db.recursiveDelete(db.doc(`homes/${demo.uid}`));
    }
  }
  const pool = await uploadPhotoPool(bucketName);
  const batch = db.batch();
  DEMO_HOMES.forEach((home, index) => {
    const owner = DEMO_USERS.find((user) => user.uid === home.ownerUid);
    batch.set(
      db.doc(`homes/${home.ownerUid}`),
      homeDoc(home, photosFor(pool, index, home.photoCount), (owner?.premiumMonths ?? 0) > 0),
    );
    batch.set(db.doc(`legalAcceptances/seed-${home.ownerUid}-${DECLARATION_SLUG}`), {
      uid: home.ownerUid,
      type: 'DECLARATION',
      version: LEGAL_VERSION,
      acceptedAt: now,
      ipTruncated: null,
      context: home.ownerUid,
    });
  });
  await batch.commit();
  // FR-64 — duplicate-photo index, so uploading a demo photo to another home triggers a hold.
  const bands = new Map<string, { homeId: string; photoId: string; dhash: string }[]>();
  DEMO_HOMES.forEach((home, index) => {
    for (const photo of photosFor(pool, index, home.photoCount)) {
      for (const band of dhashBands(photo.dhash)) {
        const entries = bands.get(band) ?? [];
        entries.push({ homeId: home.ownerUid, photoId: photo.id, dhash: photo.dhash });
        bands.set(band, entries);
      }
    }
  });
  const indexBatch = db.batch();
  for (const [band, entries] of bands)
    indexBatch.set(db.doc(`photoHashIndex/${band}`), { entries });
  await indexBatch.commit();
}

async function main(): Promise<void> {
  console.log(`Seeding ${projectId} at ${emulatorHost}…`);
  await seedConfig();
  console.log('✔ config/params and config/public');
  await seedCitiesAndWindows();
  console.log(`✔ ${Object.keys(CITIES).length} cities, ${Object.keys(WINDOWS).length} windows`);
  await seedLegal();
  console.log(`✔ ${Object.keys(LEGAL_DOCS).length} legal documents (${LEGAL_VERSION})`);
  await seedDemand();
  console.log(`✔ ${DEMAND.length} demand counters`);
  await seedFaqs();
  console.log(`✔ ${Object.keys(FAQS).length} FAQ articles`);
  await seedUsers();
  console.log(
    `✔ ${DEMO_USERS.length} demo users (password ${DEMO_PASSWORD}): ${DEMO_USERS.map((u) => u.email).join(', ')}`,
  );
  await seedHomes();
  console.log(`✔ ${DEMO_HOMES.length} demo homes (photos in the Storage emulator)`);
  console.log('Done.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
