import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { adminAuth } from '../src/core/firebase.js';
import { setPrivilegedSessionCheck } from '../src/core/privileged-session.js';
import { adminGetDashboard, adminSetRole } from '../src/modules/admin/callables.js';
import { listMyGdprRequests } from '../src/modules/privacy/callables.js';
import {
  authedRequest,
  clearAuth,
  clearFirestore,
  errorCode,
  seedLegal,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

const mfa = { sign_in_second_factor: 'totp' };
/** Issued «now» (a little in the future so it is newer than the account creation second). */
const freshIat = () => Math.floor(Date.now() / 1000) + 5;

async function account(uid: string, role: string | null) {
  await adminAuth().createUser({ uid, email: `${uid}@ejemplo.es`, emailVerified: true });
  if (role) await adminAuth().setCustomUserClaims(uid, { role });
}

beforeAll(() => setPrivilegedSessionCheck(null)); // the real live check
afterAll(() => setPrivilegedSessionCheck(() => Promise.resolve()));

beforeEach(async () => {
  await clearFirestore();
  await clearAuth();
  await seedWaitlistFixtures();
  await seedLegal();
});

describe('live admin session (FR-48, NFR-04)', () => {
  it('accepts a current admin and rejects a removed role at once', async () => {
    await account('adm', 'admin');
    const token: TestToken & { iat: number } = {
      uid: 'adm',
      email_verified: true,
      role: 'admin',
      firebase: mfa,
      iat: freshIat(),
    };
    await expect(adminGetDashboard.run(authedRequest({}, token))).resolves.toBeTruthy();
    await adminAuth().setCustomUserClaims('adm', { role: null });
    expect(await errorCode(adminGetDashboard.run(authedRequest({}, token)))).toBe(
      'E_REAUTH_REQUIRED',
    );
  });

  it('rejects tokens issued before a session revocation, disabled or unknown accounts', async () => {
    await account('adm', 'admin');
    await adminAuth().revokeRefreshTokens('adm');
    const old = { uid: 'adm', email_verified: true, role: 'admin', firebase: mfa, iat: 1 };
    expect(await errorCode(adminGetDashboard.run(authedRequest({}, old)))).toBe(
      'E_REAUTH_REQUIRED',
    );
    await adminAuth().updateUser('adm', { disabled: true });
    const fresh = { ...old, iat: freshIat() };
    expect(await errorCode(adminGetDashboard.run(authedRequest({}, fresh)))).toBe(
      'E_REAUTH_REQUIRED',
    );
    const ghost = { ...fresh, uid: 'ghost' };
    expect(await errorCode(adminGetDashboard.run(authedRequest({}, ghost)))).toBe(
      'E_REAUTH_REQUIRED',
    );
  });

  it('changing a role ends the target sessions; people without a role are not looked up', async () => {
    await account('boss', 'superadmin');
    await account('adm', 'admin');
    const boss = {
      uid: 'boss',
      email_verified: true,
      role: 'superadmin',
      firebase: mfa,
      iat: freshIat(),
    };
    await adminSetRole.run(authedRequest({ uid: 'adm', role: 'superadmin' }, boss));
    const after = await adminAuth().getUser('adm');
    expect(after.customClaims?.role).toBe('superadmin');
    expect(Date.parse(after.tokensValidAfterTime ?? '')).toBeGreaterThan(Date.now() - 60_000);
    // A plain user (no Auth record here) is unaffected by the admin check.
    const laura: TestToken = { uid: 'laura', email_verified: true };
    await expect(listMyGdprRequests.run(authedRequest({}, laura))).resolves.toEqual({ items: [] });
  });
});
