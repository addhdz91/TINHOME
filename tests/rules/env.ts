import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type TokenOptions,
} from '@firebase/rules-unit-testing';

const root = resolve(import.meta.dirname, '../..');

/** Test environment against the emulators started by `pnpm test:rules`. */
export function createEnv(projectId: string): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync(resolve(root, 'firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(root, 'storage.rules'), 'utf8') },
  });
}

/** Token claims helpers. */
export const verified: TokenOptions = { email_verified: true };
// `TokenOptions` does not declare `sign_in_second_factor`; a non-literal object avoids the excess
// property check while keeping the provider typed.
const secondFactorClaim = { sign_in_provider: 'password' as const, sign_in_second_factor: 'totp' };
export const adminWithMfa: TokenOptions = {
  email_verified: true,
  role: 'admin',
  firebase: secondFactorClaim,
};
export const adminWithoutMfa: TokenOptions = { email_verified: true, role: 'admin' };
