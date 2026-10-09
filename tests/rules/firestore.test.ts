import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, adminWithoutMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-firestore');
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/laura'), { email: 'laura@demo.tinhome', status: 'ACTIVE' });
    await setDoc(doc(db, 'config/public'), { freeDailyLikes: 10 });
    await setDoc(doc(db, 'config/params'), { freeDailyLikes: 10 });
    await setDoc(doc(db, 'waitlist/abc'), { cityId: 'madrid' });
    await setDoc(doc(db, 'somethingNew/x'), { a: 1 });
  });
});

describe('default deny', () => {
  it('denies reads and writes on unknown collections, even to admins', async () => {
    const anon = env.unauthenticatedContext().firestore();
    const admin = env.authenticatedContext('admin1', adminWithMfa).firestore();
    await assertFails(getDoc(doc(anon, 'somethingNew/x')));
    await assertFails(getDoc(doc(admin, 'somethingNew/x')));
    await assertFails(setDoc(doc(admin, 'somethingNew/y'), { a: 1 }));
  });

  it('denies every client write on business documents (ADR-005)', async () => {
    const laura = env.authenticatedContext('laura', verified).firestore();
    await assertFails(setDoc(doc(laura, 'users/laura'), { status: 'ACTIVE', premiumUntil: null }));
    await assertFails(updateDoc(doc(laura, 'users/laura'), { status: 'ACTIVE' }));
    await assertFails(deleteDoc(doc(laura, 'users/laura')));
    await assertFails(setDoc(doc(laura, 'homes/laura'), { visible: true }));
    await assertFails(setDoc(doc(laura, 'likes/laura_javier'), { fromUid: 'laura' }));
  });

  it('keeps server-only collections closed', async () => {
    const laura = env.authenticatedContext('laura', verified).firestore();
    await assertFails(getDoc(doc(laura, 'waitlist/abc')));
    await assertFails(setDoc(doc(laura, 'waitlist/new'), { cityId: 'madrid' }));
  });
});

describe('users', () => {
  it('lets the owner read their document and nobody else', async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext('laura').firestore(), 'users/laura')));
    await assertFails(getDoc(doc(env.authenticatedContext('javier').firestore(), 'users/laura')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/laura')));
  });

  it('lets admins read only with a second factor', async () => {
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('admin1', adminWithMfa).firestore(), 'users/laura')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('admin1', adminWithoutMfa).firestore(), 'users/laura')),
    );
  });
});

describe('config', () => {
  it('exposes config/public to everyone', async () => {
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'config/public')));
  });

  it('restricts config/params to admins with MFA', async () => {
    await assertFails(
      getDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'config/params')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('admin1', adminWithoutMfa).firestore(), 'config/params')),
    );
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('admin1', adminWithMfa).firestore(), 'config/params')),
    );
  });
});
