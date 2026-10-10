/**
 * Sample data for the emulators (03_TECHNICAL_SPEC.md §13). Grows milestone by milestone:
 * M0 → `config/params` + `config/public`.
 * M1 → cities, windows, provisional legal texts, demand counters.
 * M2 → demo users (Auth emulator + users/publicProfiles), FAQ articles.
 * M3 → Javier's published home (photos uploaded to the Storage emulator), travel preferences.
 * M4 → identities (Javier approved, Marta pending with sample documents), admin second factor,
 *      location checks (Sofía's home still unchecked).
 * M5 → 60 catalogue homes (Madrid/Valencia) and likes to Javier.
 *
 * Usage: `pnpm emulators` in one terminal, then `pnpm seed`. Idempotent (overwrites).
 * Needs the Auth, Firestore and Storage emulators.
 */
import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import {
  DECLARATION_SLUG,
  DEMO_PROJECT_ID,
  PARAM_DEFAULTS,
  toPublicConfig,
} from '@tinhome/shared/constants';
import { demandStatId, dhashBands } from '@tinhome/shared/domain';
import { buildCatalog } from './seed-data/catalog.js';
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
      // FR-48 — the Auth emulator has no TOTP, so demo admins use an SMS second factor.
      ...(demo.mfa
        ? {
            multiFactor: {
              enrolledFactors: [
                { phoneNumber: demo.phone, factorId: 'phone', displayName: 'Móvil' },
              ],
            },
          }
        : {}),
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
      verification: {
        emailVerified: true,
        phoneVerified: true,
        identity: demo.identity,
        ...(demo.identity === 'PENDING' ? { latestId: `seed${demo.uid}` } : {}),
      },
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
      identityVerified: demo.identity === 'APPROVED',
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

let photoPool: ReturnType<typeof uploadPhotoPool> | null = null;

/** The illustrations are uploaded once per run and shared by demo and catalogue homes. */
function getPhotoPool(): ReturnType<typeof uploadPhotoPool> {
  photoPool ??= uploadPhotoPool(bucketName);
  return photoPool;
}

/** Same shape `upsertHome` + `updateTravelPrefs` + `publishHome` leave (04 §homes). */
interface HomeExtras {
  ownerPremium: boolean;
  visible: boolean;
  rating?: { avg: number; count: number };
  isTop?: boolean;
  publishedAt?: Timestamp;
  ranges?: { start: string; end: string }[];
}

function homeDoc(home: DemoHome, photos: SeedPhoto[], extras: HomeExtras) {
  const { ownerPremium, visible } = extras;
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
    // BR-04: visible once identity and location are verified (city OPEN, no hold).
    visible,
    complete: true,
    photos,
    photoChangeLog: [],
    destinations: home.anyOpen
      ? { mode: 'ANY_OPEN', cityIds: [] }
      : { mode: 'LIST', cityIds: home.destinations },
    availability: { windowIds: home.windowIds, ranges: extras.ranges ?? [] },
    travelers: home.travelers,
    declaration: { version: LEGAL_VERSION, acceptedAt: now },
    rating: {
      avg: extras.rating?.avg ?? 0,
      count: extras.rating?.count ?? 0,
      sub: { cleanliness: 0, accuracy: 0, communication: 0, care: 0 },
    },
    isTop: extras.isTop ?? false,
    locationCheck: { status: home.locationCheck },
    moderationHold: null,
    ownerPremium,
    ownerFounding: false,
    countedCityId: visible ? home.cityId : null,
    publishedAt: extras.publishedAt ?? now,
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
  const pool = await getPhotoPool();
  const batch = db.batch();
  DEMO_HOMES.forEach((home, index) => {
    const owner = DEMO_USERS.find((user) => user.uid === home.ownerUid);
    const visible =
      owner?.identity === 'APPROVED' &&
      home.locationCheck === 'PASS' &&
      CITIES[home.cityId]?.status === 'OPEN';
    batch.set(
      db.doc(`homes/${home.ownerUid}`),
      homeDoc(home, photosFor(pool, index, home.photoCount), {
        ownerPremium: (owner?.premiumMonths ?? 0) > 0,
        visible,
      }),
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

/** M5 — 60 visible homes with owners that only exist in Firestore, plus some likes to Javier. */
async function seedCatalog(): Promise<number> {
  const pool = await getPhotoPool();
  const catalog = buildCatalog();
  const batch = db.batch();
  catalog.forEach((home, index) => {
    const uid = home.ownerUid;
    batch.set(db.doc(`users/${uid}`), {
      email: `${uid}@ejemplo.invalid`,
      firstName: home.firstName,
      lastName: `${home.lastInitial}.`,
      cityId: home.cityId,
      status: 'ACTIVE',
      verification: { emailVerified: true, phoneVerified: true, identity: 'APPROVED' },
      onboarding: { step: 6, completedAt: now },
      premiumUntil: home.ownerPremium ? Timestamp.fromMillis(Date.now() + 90 * 86_400_000) : null,
      premiumSource: home.ownerPremium ? 'ADMIN' : null,
      foundingMember: home.foundingMember,
      settings: { theme: 'system', notifications: {} },
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.doc(`publicProfiles/${uid}`), {
      displayName: `${home.firstName} ${home.lastInitial}.`,
      photoUrl: null,
      about: 'Me encanta conocer otras ciudades como si viviera en ellas.',
      languages: index % 3 === 0 ? ['es', 'en'] : ['es'],
      memberSince: now,
      identityVerified: true,
      foundingMember: home.foundingMember,
      isTopHost: home.isTop,
      reviewsCount: home.rating.count,
      ...(home.rating.count > 0 ? { ratingAvg: home.rating.avg } : {}),
      active: true,
    });
    batch.set(
      db.doc(`homes/${uid}`),
      homeDoc(home, photosFor(pool, index + 7, home.photoCount), {
        ownerPremium: home.ownerPremium,
        visible: true,
        rating: home.rating,
        isTop: home.isTop,
        publishedAt: Timestamp.fromMillis(Date.now() - home.daysSincePublished * 86_400_000),
        ranges: home.ranges,
      }),
    );
    // A few Madrid owners already liked Javier's home («le gusto», FR-20 / FR-26).
    if (home.cityId === 'madrid' && index % 4 === 1) {
      batch.set(db.doc(`likes/${uid}_demo-javier`), {
        fromUid: uid,
        toUid: 'demo-javier',
        toHomeId: 'demo-javier',
        fromHomeId: uid,
        createdAt: now,
      });
    }
  });
  await batch.commit();
  return catalog.length;
}

/** Placeholder «document» images; never real documents or people. */
async function sampleDocument(label: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560">
    <rect width="900" height="560" rx="32" fill="#E9E4F7"/>
    <text x="50%" y="45%" text-anchor="middle" font-family="sans-serif" font-size="44" fill="#3D2A7A">DOCUMENTO DE PRUEBA</text>
    <text x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#3D2A7A">${label} · no es real</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** FR-09 — pending verifications (with sample files) for the admin queue. */
async function seedVerifications(): Promise<number> {
  const bucket = getStorage().bucket(bucketName);
  const pending = DEMO_USERS.filter((demo) => demo.identity === 'PENDING');
  for (const demo of pending) {
    const id = `seed${demo.uid}`;
    const files: Record<string, string> = {};
    for (const key of ['idFront', 'idBack', 'selfie', 'propertyDoc'] as const) {
      const path = `private/verifications/${demo.uid}/${id}/${key}`;
      await bucket.file(path).save(await sampleDocument(key), { contentType: 'image/png' });
      files[key] = path;
    }
    const docNumberHash = createHash('sha256').update(`seed-${demo.uid}`).digest('hex');
    await db.doc(`verifications/${id}`).set({
      uid: demo.uid,
      status: 'PENDING',
      tenure: 'OWNER',
      propertyDocType: 'IBI_RECEIPT',
      files,
      docNumberHash,
      duplicateOfUid: null,
      fraudSuspicion: false,
      submittedAt: Timestamp.fromMillis(Date.now() - 26 * 3_600_000),
      filesPurgeAt: null,
    });
    await db.doc(`docHashes/${docNumberHash}`).set({ uid: demo.uid, createdAt: now });
  }
  return pending.length;
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
  console.log(`✔ ${await seedVerifications()} pending verifications with sample documents`);
  console.log(`✔ ${await seedCatalog()} catalogue homes for Discover and Explore`);
  console.log('Done.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
