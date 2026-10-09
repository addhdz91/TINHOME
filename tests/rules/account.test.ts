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
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;
const unverified = { email_verified: false };

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-account');
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/laura'), {
      email: 'laura@demo.tinhome',
      status: 'ACTIVE',
      referralCode: 'ABCDEFGH',
    });
    await setDoc(doc(db, 'publicProfiles/laura'), { displayName: 'Laura G.' });
    await setDoc(doc(db, 'referralCodes/ABCDEFGH'), { uid: 'laura' });
    await setDoc(doc(db, 'legalAcceptances/a1'), { uid: 'laura', type: 'TERMS', version: '0.1' });
    await setDoc(doc(db, 'referrals/javier'), {
      inviterUid: 'laura',
      inviteeUid: 'javier',
      status: 'REGISTERED',
    });
    await setDoc(doc(db, 'faqs/verificacion'), {
      question: '¿?',
      published: true,
      category: 'VERIFICATION',
      order: 1,
    });
    await setDoc(doc(db, 'faqs/borrador'), {
      question: '¿?',
      published: false,
      category: 'START',
      order: 2,
    });
  });
});

describe('users (M2)', () => {
  it('owner reads, nobody writes (not even the owner)', async () => {
    const laura = env.authenticatedContext('laura', verified).firestore();
    await assertSucceeds(getDoc(doc(laura, 'users/laura')));
    await assertFails(updateDoc(doc(laura, 'users/laura'), { 'settings.theme': 'dark' }));
    await assertFails(updateDoc(doc(laura, 'users/laura'), { premiumUntil: new Date() }));
    await assertFails(setDoc(doc(laura, 'users/new'), { status: 'ACTIVE' }));
    await assertFails(
      getDoc(doc(env.authenticatedContext('javier', verified).firestore(), 'users/laura')),
    );
  });
});

describe('publicProfiles', () => {
  it('readable only with a verified e-mail; never writable', async () => {
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('javier', verified).firestore(), 'publicProfiles/laura')),
    );
    await assertFails(
      getDoc(
        doc(env.authenticatedContext('javier', unverified).firestore(), 'publicProfiles/laura'),
      ),
    );
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), 'publicProfiles/laura')),
    );
    await assertFails(
      setDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'publicProfiles/laura'), {
        displayName: 'X',
      }),
    );
  });
});

describe('legalAcceptances, referrals and referralCodes', () => {
  it('lets the owner read their acceptances only', async () => {
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'legalAcceptances/a1')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('javier', verified).firestore(), 'legalAcceptances/a1')),
    );
  });

  it('lets the inviter read the referral, not the invitee', async () => {
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'referrals/javier')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('javier', verified).firestore(), 'referrals/javier')),
    );
  });

  it('keeps referral codes server-only', async () => {
    await assertFails(
      getDoc(
        doc(env.authenticatedContext('laura', verified).firestore(), 'referralCodes/ABCDEFGH'),
      ),
    );
    await assertFails(
      getDoc(
        doc(env.authenticatedContext('admin1', adminWithMfa).firestore(), 'referralCodes/ABCDEFGH'),
      ),
    );
  });
});

describe('faqs (FR-66)', () => {
  it('exposes published articles to anyone and hides drafts', async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anon, 'faqs/verificacion')));
    await assertSucceeds(getDocs(query(collection(anon, 'faqs'), where('published', '==', true))));
    await assertFails(getDoc(doc(anon, 'faqs/borrador')));
    await assertFails(getDocs(collection(anon, 'faqs')));
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('admin1', adminWithMfa).firestore(), 'faqs/borrador')),
    );
    await assertFails(
      setDoc(doc(env.authenticatedContext('admin1', adminWithMfa).firestore(), 'faqs/x'), {
        published: true,
      }),
    );
  });
});
