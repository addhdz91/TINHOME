import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { getBytes, ref, uploadBytes, uploadString } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-storage');
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'private/verifications/laura/v1/idFront.png'), png, {
      contentType: 'image/png',
    });
    await uploadBytes(ref(ctx.storage(), 'somewhere/else.png'), png, { contentType: 'image/png' });
  });
});

describe('default deny', () => {
  it('denies reads and writes outside the declared paths', async () => {
    const laura = env.authenticatedContext('laura', verified).storage();
    await assertFails(getBytes(ref(laura, 'somewhere/else.png')));
    await assertFails(uploadString(ref(laura, 'somewhere/new.txt'), 'x'));
  });
});

describe('home photos', () => {
  it('lets the owner upload an image to their raw folder only', async () => {
    const laura = env.authenticatedContext('laura', verified).storage();
    await assertSucceeds(
      uploadBytes(ref(laura, 'homes/laura/raw/p1'), png, { contentType: 'image/png' }),
    );
    await assertFails(
      uploadBytes(ref(laura, 'homes/javier/raw/p1'), png, { contentType: 'image/png' }),
    );
    await assertFails(
      uploadBytes(ref(laura, 'homes/laura/raw/p2'), png, { contentType: 'application/pdf' }),
    );
  });

  it('never lets clients read raw photos', async () => {
    const laura = env.authenticatedContext('laura', verified).storage();
    await assertSucceeds(
      uploadBytes(ref(laura, 'homes/laura/raw/p1'), png, { contentType: 'image/png' }),
    );
    await assertFails(getBytes(ref(laura, 'homes/laura/raw/p1')));
  });
});

describe('verification documents', () => {
  it('are not readable from any client, including the owner and admins', async () => {
    const owner = env.authenticatedContext('laura', verified).storage();
    const admin = env.authenticatedContext('admin1', adminWithMfa).storage();
    await assertFails(getBytes(ref(owner, 'private/verifications/laura/v1/idFront.png')));
    await assertFails(getBytes(ref(admin, 'private/verifications/laura/v1/idFront.png')));
  });
});
