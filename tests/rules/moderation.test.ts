import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { adminWithMfa, adminWithoutMfa, createEnv, verified } from './env.js';

let env: RulesTestEnvironment;
const as = (uid: string) => env.authenticatedContext(uid, verified).firestore();
const admin = () => env.authenticatedContext('admin', adminWithMfa).firestore();

beforeAll(async () => {
  env = await createEnv('demo-tinhome-rules-moderation');
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'reports/r1'), {
      reporterUid: 'laura',
      targetUid: 'javier',
      status: 'OPEN',
    });
    await setDoc(doc(db, 'strikes/s1'), { uid: 'javier', reason: 'RUDE' });
    await setDoc(doc(db, 'moderationActions/a1'), { targetUid: 'javier', action: 'WARN' });
    await setDoc(doc(db, 'appeals/a1'), { uid: 'javier', status: 'OPEN' });
    await setDoc(doc(db, 'adminAlerts/x1'), { type: 'REPORT_HIGH', handledAt: null });
    await setDoc(doc(db, 'adminDirectory/admin'), { email: 'admin@tinhome.es', role: 'admin' });
    await setDoc(doc(db, 'partners/p1'), { name: 'Limpiezas Sol', active: true });
    await setDoc(doc(db, 'partnerClicks/c1'), { partnerId: 'p1', placement: 'MATCH' });
  });
});

describe('moderation collections (FR-42…45, FR-68)', () => {
  it('reports and alerts: only admins with a second factor, never the reporter or the reported', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'reports/r1')));
    await assertFails(getDoc(doc(as('laura'), 'reports/r1')));
    await assertFails(getDoc(doc(as('javier'), 'reports/r1')));
    await assertFails(
      getDoc(doc(env.authenticatedContext('admin', adminWithoutMfa).firestore(), 'reports/r1')),
    );
    await assertSucceeds(getDoc(doc(admin(), 'adminAlerts/x1')));
    await assertFails(getDoc(doc(as('javier'), 'adminAlerts/x1')));
    await assertFails(updateDoc(doc(admin(), 'adminAlerts/x1'), { handledAt: 1 }));
  });

  it('strikes, decisions and appeals are readable by the affected person only; writes are server-only', async () => {
    for (const path of ['strikes/s1', 'moderationActions/a1', 'appeals/a1']) {
      await assertSucceeds(getDoc(doc(as('javier'), path)));
      await assertFails(getDoc(doc(as('laura'), path)));
      await assertFails(updateDoc(doc(as('javier'), path), { status: 'UPHELD' }));
    }
    await assertFails(setDoc(doc(as('laura'), 'reports/r2'), { targetUid: 'javier' }));
  });

  it('the admin directory (N-26 recipients) is never readable from the client', async () => {
    await assertFails(getDoc(doc(admin(), 'adminDirectory/admin')));
    await assertFails(getDoc(doc(as('laura'), 'adminDirectory/admin')));
  });

  it('partners and their clicks (FR-47): admin read only, no client writes', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'partners/p1')));
    await assertSucceeds(getDoc(doc(admin(), 'partnerClicks/c1')));
    await assertFails(getDoc(doc(as('laura'), 'partners/p1')));
    await assertFails(getDoc(doc(as('laura'), 'partnerClicks/c1')));
    await assertFails(setDoc(doc(admin(), 'partners/p2'), { name: 'X' }));
    await assertFails(setDoc(doc(as('laura'), 'partnerClicks/c2'), { partnerId: 'p1' }));
  });
});
