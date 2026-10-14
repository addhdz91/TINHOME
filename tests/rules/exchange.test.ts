import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid, verified).firestore();

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-exchange');
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'exchanges/e1'), {
      participants: ['javier', 'laura'],
      status: 'CONFIRMED',
      startDate: '2027-03-20',
    });
    await setDoc(doc(db, 'reviews/e1_javier'), {
      authorUid: 'javier',
      targetHomeId: 'laura',
      status: 'PENDING',
      overall: 5,
    });
    await setDoc(doc(db, 'reviews/e0_ana'), {
      authorUid: 'ana',
      targetHomeId: 'laura',
      status: 'PUBLISHED',
      overall: 4,
    });
    await setDoc(doc(db, 'notifications/laura/items/n1'), {
      type: 'N-08',
      title: 'Javier te propone un intercambio',
      readAt: null,
      createdAt: 1,
    });
    await setDoc(doc(db, 'users/laura/pushTokens/t1'), { token: 'abc' });
  });
});

describe('exchanges (participants only)', () => {
  it('participants and admins read; others and writes are denied', async () => {
    await assertSucceeds(getDoc(doc(as('laura'), 'exchanges/e1')));
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('admin', adminWithMfa).firestore(), 'exchanges/e1')),
    );
    await assertFails(getDoc(doc(as('ana'), 'exchanges/e1')));
    await assertFails(updateDoc(doc(as('laura'), 'exchanges/e1'), { status: 'COMPLETED' }));
    await assertSucceeds(
      getDocs(
        query(
          collection(as('laura'), 'exchanges'),
          where('participants', 'array-contains', 'laura'),
          orderBy('startDate', 'desc'),
        ),
      ),
    );
  });
});

describe('reviews (double blind, BR-16)', () => {
  it('a pending review is visible only to its author; published ones to verified users', async () => {
    await assertSucceeds(getDoc(doc(as('javier'), 'reviews/e1_javier')));
    await assertFails(getDoc(doc(as('laura'), 'reviews/e1_javier')));
    await assertSucceeds(getDoc(doc(as('laura'), 'reviews/e0_ana')));
    await assertFails(
      setDoc(doc(as('laura'), 'reviews/e1_laura'), { authorUid: 'laura', overall: 5 }),
    );
  });
});

describe('notifications (FR-46)', () => {
  it('the owner reads and only sets readAt', async () => {
    const laura = as('laura');
    await assertSucceeds(getDoc(doc(laura, 'notifications/laura/items/n1')));
    await assertFails(getDoc(doc(as('javier'), 'notifications/laura/items/n1')));
    await assertSucceeds(
      updateDoc(doc(laura, 'notifications/laura/items/n1'), { readAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(laura, 'notifications/laura/items/n1'), { title: 'Otra cosa' }),
    );
    await assertFails(
      setDoc(doc(laura, 'notifications/laura/items/n2'), { type: 'N-08', title: 'Falso' }),
    );
  });

  it('push tokens are never readable from the client', async () => {
    await assertFails(getDoc(doc(as('laura'), 'users/laura/pushTokens/t1')));
    await assertFails(setDoc(doc(as('laura'), 'users/laura/pushTokens/t2'), { token: 'x' }));
  });
});
