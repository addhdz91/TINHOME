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
    await setDoc(doc(db, 'entitlements/en1'), { uid: 'laura', source: 'ADMIN' });
    await setDoc(doc(db, 'subscriptions/laura'), { status: 'active' });
    await setDoc(doc(db, 'supportTickets/t1'), { uid: 'laura', status: 'RECEIVED' });
    await setDoc(doc(db, 'supportTickets/t1/messages/m1'), { authorUid: 'laura', text: 'Hola' });
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

  it('Premium rights and subscriptions: owner and admins read; no client writes (M10 review)', async () => {
    await assertSucceeds(getDoc(doc(as('laura'), 'entitlements/en1')));
    await assertSucceeds(getDoc(doc(admin(), 'entitlements/en1')));
    await assertFails(getDoc(doc(as('javier'), 'entitlements/en1')));
    await assertFails(setDoc(doc(as('laura'), 'entitlements/en2'), { uid: 'laura' }));
    await assertSucceeds(getDoc(doc(as('laura'), 'subscriptions/laura')));
    await assertFails(getDoc(doc(as('javier'), 'subscriptions/laura')));
    await assertFails(updateDoc(doc(as('laura'), 'subscriptions/laura'), { status: 'canceled' }));
  });

  it('complaints and their thread: the author and admins read; no client writes', async () => {
    await assertSucceeds(getDoc(doc(as('laura'), 'supportTickets/t1')));
    await assertSucceeds(getDoc(doc(as('laura'), 'supportTickets/t1/messages/m1')));
    await assertSucceeds(getDoc(doc(admin(), 'supportTickets/t1/messages/m1')));
    await assertFails(getDoc(doc(as('javier'), 'supportTickets/t1')));
    await assertFails(getDoc(doc(as('javier'), 'supportTickets/t1/messages/m1')));
    await assertFails(setDoc(doc(as('laura'), 'supportTickets/t1/messages/m2'), { text: 'x' }));
    await assertFails(updateDoc(doc(as('laura'), 'supportTickets/t1'), { status: 'CLOSED' }));
  });
});
