import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid, verified).firestore();
const admin = () => env.authenticatedContext('admin', adminWithMfa).firestore();

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-privacy');
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'gdprRequests/g1'), { uid: 'laura', type: 'ACCESS', status: 'OPEN' });
    await setDoc(doc(db, 'events/e1'), { name: 'like_sent', uidHash: 'x' });
  });
});

describe('privacy collections (FR-59, 03 §6)', () => {
  it('GDPR requests: the owner and admins read; nobody writes from the client', async () => {
    await assertSucceeds(getDoc(doc(as('laura'), 'gdprRequests/g1')));
    await assertSucceeds(getDoc(doc(admin(), 'gdprRequests/g1')));
    await assertFails(getDoc(doc(as('javier'), 'gdprRequests/g1')));
    await assertFails(updateDoc(doc(as('laura'), 'gdprRequests/g1'), { status: 'DONE' }));
    await assertFails(setDoc(doc(as('laura'), 'gdprRequests/g2'), { uid: 'laura' }));
  });

  it('analytics events are never readable or writable from the client', async () => {
    await assertFails(getDoc(doc(as('laura'), 'events/e1')));
    await assertFails(getDoc(doc(admin(), 'events/e1')));
    await assertFails(setDoc(doc(as('laura'), 'events/e2'), { name: 'like_sent' }));
  });
});
