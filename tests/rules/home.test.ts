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
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-home');
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'homes/laura'), {
      ownerUid: 'laura',
      visible: false,
      status: 'DRAFT',
      cityId: 'madrid',
    });
    await setDoc(doc(db, 'homes/javier'), {
      ownerUid: 'javier',
      visible: true,
      status: 'PUBLISHED',
      cityId: 'valencia',
    });
    await setDoc(doc(db, 'photoHashIndex/0_a1'), { entries: [] });
    await setDoc(doc(db, 'adminAlerts/a1'), { type: 'PHOTO_DUPLICATE', handledAt: null });
    await uploadBytes(ref(ctx.storage(), 'homes/javier/photos/p1_card.webp'), png, {
      contentType: 'image/webp',
    });
  });
});

describe('homes (M3)', () => {
  it('lets the owner read a hidden home and others only visible ones', async () => {
    const laura = env.authenticatedContext('laura', verified).firestore();
    const ana = env.authenticatedContext('ana', verified).firestore();
    await assertSucceeds(getDoc(doc(laura, 'homes/laura')));
    await assertFails(getDoc(doc(ana, 'homes/laura')));
    await assertSucceeds(getDoc(doc(ana, 'homes/javier')));
    await assertSucceeds(getDocs(query(collection(ana, 'homes'), where('visible', '==', true))));
    await assertFails(getDocs(collection(ana, 'homes')));
  });

  it('requires a verified e-mail even for visible homes and never allows writes', async () => {
    await assertFails(
      getDoc(
        doc(env.authenticatedContext('ana', { email_verified: false }).firestore(), 'homes/javier'),
      ),
    );
    const laura = env.authenticatedContext('laura', verified).firestore();
    await assertFails(updateDoc(doc(laura, 'homes/laura'), { visible: true }));
    await assertFails(setDoc(doc(laura, 'homes/laura'), { title: 'x' }));
  });

  it('keeps the photo hash index server-only and alerts admin-only', async () => {
    await assertFails(
      getDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'photoHashIndex/0_a1')),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext('laura', verified).firestore(), 'adminAlerts/a1')),
    );
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext('admin1', adminWithMfa).firestore(), 'adminAlerts/a1')),
    );
  });
});

describe('processed home photos (Storage)', () => {
  it('are readable with a verified e-mail and never writable by clients', async () => {
    await assertSucceeds(
      getBytes(
        ref(
          env.authenticatedContext('ana', verified).storage(),
          'homes/javier/photos/p1_card.webp',
        ),
      ),
    );
    await assertFails(
      getBytes(ref(env.unauthenticatedContext().storage(), 'homes/javier/photos/p1_card.webp')),
    );
    await assertFails(
      uploadBytes(
        ref(
          env.authenticatedContext('javier', verified).storage(),
          'homes/javier/photos/p2_card.webp',
        ),
        png,
        {
          contentType: 'image/webp',
        },
      ),
    );
  });
});
