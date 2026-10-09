import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-public');
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'cities/madrid'), { name: 'Madrid', status: 'OPEN' });
    await setDoc(doc(db, 'windows/ss27'), { name: 'Semana Santa 2027', active: true });
    await setDoc(doc(db, 'demandStats/valencia_madrid_ss27'), { count: 47 });
    await setDoc(doc(db, 'legalDocs/privacidad'), { currentVersion: '0.1' });
    await setDoc(doc(db, 'legalDocs/privacidad/versions/0.1'), { markdown: '# x' });
    await setDoc(doc(db, 'demandCounters/valencia_madrid_ss27'), { count: 3 });
    await setDoc(doc(db, 'rateLimits/joinWaitlist_x_1'), { count: 1 });
    await setDoc(doc(db, 'mailQueue/m1'), { to: 'a@b.es' });
    await setDoc(doc(db, 'waitlist/h1'), { email: 'a@b.es' });
  });
});

describe('public M1 data', () => {
  it('lets visitors read cities, windows, demand stats and legal texts', async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anon, 'cities/madrid')));
    await assertSucceeds(getDocs(collection(anon, 'cities')));
    await assertSucceeds(getDoc(doc(anon, 'windows/ss27')));
    await assertSucceeds(getDocs(collection(anon, 'demandStats')));
    await assertSucceeds(getDoc(doc(anon, 'legalDocs/privacidad')));
    await assertSucceeds(getDoc(doc(anon, 'legalDocs/privacidad/versions/0.1')));
  });

  it('never lets clients write them', async () => {
    const admin = env.authenticatedContext('admin1', adminWithMfa).firestore();
    await assertFails(setDoc(doc(admin, 'cities/madrid'), { status: 'CLOSED' }));
    await assertFails(setDoc(doc(admin, 'demandStats/x'), { count: 1000 }));
    await assertFails(setDoc(doc(admin, 'legalDocs/privacidad'), { currentVersion: '9' }));
  });
});

describe('server-only M1 collections', () => {
  it.each([
    'demandCounters/valencia_madrid_ss27',
    'rateLimits/joinWaitlist_x_1',
    'mailQueue/m1',
    'waitlist/h1',
  ])('denies any client access to %s', async (path) => {
    const anon = env.unauthenticatedContext().firestore();
    const user = env.authenticatedContext('laura', verified).firestore();
    const admin = env.authenticatedContext('admin1', adminWithMfa).firestore();
    await assertFails(getDoc(doc(anon, path)));
    await assertFails(getDoc(doc(user, path)));
    await assertFails(getDoc(doc(admin, path)));
    await assertFails(setDoc(doc(user, path), { count: 0 }));
  });
});
