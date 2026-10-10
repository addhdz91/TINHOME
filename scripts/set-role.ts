/**
 * FR-48 — grants or removes an admin role (custom claim `role`).
 *
 * Usage: `pnpm set-role <email> <admin|superadmin|none>`
 * Emulator by default (FIREBASE_AUTH_EMULATOR_HOST); against a real project set GCLOUD_PROJECT
 * and GOOGLE_APPLICATION_CREDENTIALS. Every change is written to `auditLog`.
 * The person must sign out and in again, then enrol TOTP on their first visit to /admin.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { ADMIN_ROLES, DEMO_PROJECT_ID, type AdminRole } from '@tinhome/shared/constants';

const [email, roleArg] = process.argv.slice(2);
const role: AdminRole | null = ADMIN_ROLES.find((r) => r === roleArg) ?? null;
if (!email || (role === null && roleArg !== 'none')) {
  console.error('Usage: pnpm set-role <email> <admin|superadmin|none>');
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT ?? DEMO_PROJECT_ID;
if (projectId.startsWith('demo-')) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
}
initializeApp({ projectId });

async function main(target: string): Promise<void> {
  const user = await getAuth().getUserByEmail(target);
  const before = (user.customClaims?.role as string | undefined) ?? null;
  await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, role });
  await getFirestore()
    .collection('auditLog')
    .add({
      actorUid: 'script:set-role',
      actorRole: 'system',
      action: 'user.role',
      targetType: 'user',
      targetId: user.uid,
      before: { role: before },
      after: { role },
      createdAt: FieldValue.serverTimestamp(),
    });
  console.log(`✔ ${target}: role ${before ?? 'none'} → ${role ?? 'none'} (${projectId})`);
}

main(email).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
