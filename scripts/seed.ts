/**
 * Sample data for the emulators (03_TECHNICAL_SPEC.md §13). Grows milestone by milestone:
 * M0 → `config/params` + `config/public`.
 *
 * Usage: `pnpm emulators` in one terminal, then `pnpm seed`.
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { DEMO_PROJECT_ID, PARAM_DEFAULTS, toPublicConfig } from '@tinhome/shared/constants';

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

async function seedConfig(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  await db.doc('config/params').set({ ...PARAM_DEFAULTS, updatedAt: now });
  await db.doc('config/public').set({ ...toPublicConfig(PARAM_DEFAULTS), updatedAt: now });
}

async function main(): Promise<void> {
  console.log(`Seeding ${projectId} at ${emulatorHost}…`);
  await seedConfig();
  console.log('✔ config/params and config/public');
  console.log('Done.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
