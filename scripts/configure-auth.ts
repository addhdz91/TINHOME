/**
 * NFR-04 / FR-71 — Identity Platform settings the code relies on, applied from the repo so
 * they are not forgotten in a console:
 * - password policy enforced by the server (the sign-up form checks the same rule, but a
 *   direct call to the Auth API would skip it): ≥ PASSWORD_MIN_LENGTH characters with a
 *   number, existing weak passwords must be changed at next sign-in. «Has letters» stays a
 *   client check (no exact server equivalent without rejecting valid passwords);
 * - email enumeration protection (sign-in answers the same for unknown e-mails);
 * - multi-factor: SMS and TOTP enabled (FR-48, the admin panel requires one).
 *
 * Usage (real project only): `GCLOUD_PROJECT=tinhome-staging pnpm ops:auth` prints the
 * change; add `APPLY=1` to write it. Needs GOOGLE_APPLICATION_CREDENTIALS (or gcloud ADC).
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth, type UpdateProjectConfigRequest } from 'firebase-admin/auth';
import { PASSWORD_MIN_LENGTH } from '@tinhome/shared/constants';

const projectId = process.env.GCLOUD_PROJECT;
if (!projectId || projectId.startsWith('demo-')) {
  console.error('Set GCLOUD_PROJECT to a real project (the emulator does not enforce these).');
  process.exit(1);
}

export const AUTH_CONFIG: UpdateProjectConfigRequest = {
  passwordPolicyConfig: {
    enforcementState: 'ENFORCE',
    forceUpgradeOnSignin: true,
    constraints: { minLength: PASSWORD_MIN_LENGTH, maxLength: 128, requireNumeric: true },
  },
  emailPrivacyConfig: { enableImprovedEmailPrivacy: true },
  multiFactorConfig: {
    state: 'ENABLED',
    factorIds: ['phone'],
    providerConfigs: [{ state: 'ENABLED', totpProviderConfig: { adjacentIntervals: 5 } }],
  },
};

initializeApp({ projectId });

async function main(): Promise<void> {
  console.log(`Identity Platform config for ${String(projectId)}:`);
  console.log(JSON.stringify(AUTH_CONFIG, null, 2));
  if (process.env.APPLY !== '1') {
    console.log('Dry run. Re-run with APPLY=1 to apply.');
    return;
  }
  await getAuth().projectConfigManager().updateProjectConfig(AUTH_CONFIG);
  console.log('✔ applied');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
