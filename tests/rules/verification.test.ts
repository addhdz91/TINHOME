import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, adminWithoutMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;
const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-verification');
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'verifications/v1'), {
      uid: 'laura',
      status: 'PENDING',
      docNumberHash: 'h',
    });
    await setDoc(doc(db, 'docHashes/h'), { uid: 'laura' });
    await setDoc(doc(db, 'locationChecks/c1'), { uid: 'laura', result: 'PASS' });
    await setDoc(doc(db, 'auditLog/a1'), { action: 'verification.view' });
    await uploadBytes(ref(ctx.storage(), 'private/verifications/laura/v1/propertyDoc'), pdf, {
      contentType: 'application/pdf',
    });
  });
});

describe('verifications (FR-08/09, BR-24)', () => {
  it('only an admin with a second factor reads a verification', async () => {
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('admin', adminWithMfa).firestore(), 'verifications/v1')),
    );
    await assertFails(
      getDoc(
        doc(env.authenticatedContext('admin', adminWithoutMfa).firestore(), 'verifications/v1'),
      ),
    );
  });

  it('the owner does not read the raw document (hashes, duplicates): uses getMyVerification', async () => {
    await assertFails(
      getDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'verifications/v1')),
    );
  });

  it('nobody reads document hashes', async () => {
    await assertFails(
      getDoc(doc(env.authenticatedContext('admin', adminWithMfa).firestore(), 'docHashes/h')),
    );
  });

  it('nobody writes verifications from the client', async () => {
    await assertFails(
      setDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'verifications/v2'), {
        uid: 'laura',
        status: 'APPROVED',
      }),
    );
  });

  it('documents can be uploaded as PDF by the owner but never read', async () => {
    const owner = env.authenticatedContext('laura', verified).storage();
    await assertSucceeds(
      uploadBytes(ref(owner, 'private/verifications/laura/v2/propertyDoc'), pdf, {
        contentType: 'application/pdf',
      }),
    );
    await assertFails(getBytes(ref(owner, 'private/verifications/laura/v1/propertyDoc')));
    await assertFails(
      getBytes(
        ref(
          env.authenticatedContext('admin', adminWithMfa).storage(),
          'private/verifications/laura/v1/propertyDoc',
        ),
      ),
    );
  });
});

describe('locationChecks (FR-63) and auditLog', () => {
  it('the owner and admins read location results; others do not', async () => {
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'locationChecks/c1')),
    );
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('admin', adminWithMfa).firestore(), 'locationChecks/c1')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('javier', verified).firestore(), 'locationChecks/c1')),
    );
  });

  it('only a superadmin reads the audit log', async () => {
    await assertFails(
      getDoc(doc(env.authenticatedContext('admin', adminWithMfa).firestore(), 'auditLog/a1')),
    );
    const superadmin = { ...adminWithMfa, role: 'superadmin' };
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('sa', superadmin).firestore(), 'auditLog/a1')),
    );
  });
});
