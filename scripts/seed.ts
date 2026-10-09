/**
 * Sample data for the emulators (03_TECHNICAL_SPEC.md §13). Grows milestone by milestone:
 * M0 → `config/params` + `config/public`.
 * M1 → cities, windows, provisional legal texts, demand counters.
 *
 * Usage: `pnpm emulators` in one terminal, then `pnpm seed`. Idempotent (overwrites).
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { DEMO_PROJECT_ID, PARAM_DEFAULTS, toPublicConfig } from '@tinhome/shared/constants';
import { demandStatId } from '@tinhome/shared/domain';
import { CITIES, DEMAND, WINDOWS } from './seed-data/cities.js';
import { LEGAL_DOCS, LEGAL_VERSION } from './seed-data/legal.js';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;

const projectId = process.env.GCLOUD_PROJECT ?? DEMO_PROJECT_ID;
if (!projectId.startsWith('demo-')) {
  // Safety net: seeding is only allowed against a demo (emulator-only) project.
  console.error(`Refusing to seed project "${projectId}": only demo-* projects are allowed.`);
  process.exit(1);
}

initializeApp({ projectId });
const db = getFirestore();
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
      requiresReacceptance: false,
      changeSummary: 'Borrador provisional (LEG-03)',
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
  console.log('Done.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
