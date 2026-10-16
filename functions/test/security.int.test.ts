import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { adminAuth, db } from '../src/core/firebase.js';
import { adminGetUser, adminSearchUsers } from '../src/modules/admin/callables.js';
import { proposeExchange, respondExchange } from '../src/modules/exchange/callables.js';
import {
  blockUser,
  getMatchContact,
  likeHome,
  sendMessage,
  sharePhoneInChat,
} from '../src/modules/match/callables.js';
import { adminModerate, submitReport } from '../src/modules/moderation/callables.js';
import { seedEligible } from './fixtures.js';
import {
  authedRequest,
  clearAuth,
  clearFirestore,
  errorCode,
  seedLegal,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

/** Regression tests for the findings of the security audit (10 §5, 16/10/2026). */
const token = (uid: string): TestToken => ({
  uid,
  email: `${uid}@ejemplo.es`,
  email_verified: true,
});
const laura = token('laura');
const javier = token('javier');
const mfa = { sign_in_second_factor: 'totp' };
const admin: TestToken = { uid: 'admin', email_verified: true, role: 'admin', firebase: mfa };
const boss: TestToken = { uid: 'boss', email_verified: true, role: 'superadmin', firebase: mfa };
const statement = {
  templateId: 'FRAUD' as const,
  facts: 'Ha pedido una fianza por transferencia a otra persona usuaria.',
  ground: 'TERMS' as const,
  groundDetail: 'Términos: sin pagos entre personas usuarias.',
};

async function makeMatch(): Promise<string> {
  await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
  const { matchId } = await likeHome.run(authedRequest({ homeId: 'laura' }, javier));
  if (!matchId) throw new Error('no match');
  return matchId;
}

beforeEach(async () => {
  await clearFirestore();
  await clearAuth();
  await seedWaitlistFixtures();
  await seedLegal();
  setClock(fixedClock('2027-03-01T10:00:00+01:00'));
  await seedEligible('laura', 'madrid');
  await seedEligible('javier', 'valencia', { premium: true });
});

afterEach(() => resetClock());

describe('account status on match and exchange actions (05: ACT)', () => {
  it('a suspended person cannot confirm an exchange or share/read phone numbers', async () => {
    const matchId = await makeMatch();
    const { exchange } = await proposeExchange.run(
      authedRequest(
        {
          matchId,
          startDate: '2027-03-20',
          endDate: '2027-03-28',
          guests: { laura: 2, javier: 3 },
          pets: {},
        },
        laura,
      ),
    );
    await sharePhoneInChat.run(authedRequest({ matchId }, laura));
    await db().doc('users/javier').update({ status: 'SUSPENDED' });

    expect(
      await errorCode(
        respondExchange.run(authedRequest({ exchangeId: exchange.id, accept: true }, javier)),
      ),
    ).toBe('E_ACCOUNT_SUSPENDED');
    expect(await errorCode(sharePhoneInChat.run(authedRequest({ matchId }, javier)))).toBe(
      'E_ACCOUNT_SUSPENDED',
    );
    expect(await errorCode(getMatchContact.run(authedRequest({ matchId }, javier)))).toBe(
      'E_ACCOUNT_SUSPENDED',
    );
  });
});

describe('reports from suspended accounts (BR-42)', () => {
  it('a suspended verified person can still report, but it never triggers a preventive hold', async () => {
    await db().doc('users/laura').update({ status: 'SUSPENDED' });
    const result = await submitReport.run(
      authedRequest(
        {
          targetType: 'HOME',
          targetId: 'javier',
          reason: 'PHOTOS_NOT_OWN',
          description: 'Estas fotos son de mi piso y no de esta persona, lo puedo demostrar.',
        },
        laura,
      ),
    );
    expect(result.preventiveHold).toBe(false);
    const hold = (await db().doc('homes/javier').get()).get('moderationHold') as {
      active?: boolean;
    } | null;
    expect(hold?.active ?? false).toBe(false);
  });
});

describe('sanctions on staff accounts (ASVS V4.1)', () => {
  it('an admin cannot ban a superadmin or themselves; a superadmin can sanction an admin', async () => {
    await seedEligible('boss2', 'madrid');
    await seedEligible('admin', 'madrid');
    await seedEligible('admin2', 'madrid');
    await adminAuth().createUser({ uid: 'boss2', email: 'boss2@ejemplo.es' });
    await adminAuth().setCustomUserClaims('boss2', { role: 'superadmin' });
    await adminAuth().createUser({ uid: 'admin2', email: 'admin2@ejemplo.es' });
    await adminAuth().setCustomUserClaims('admin2', { role: 'admin' });
    const ban = (targetUid: string) => ({
      targetType: 'USER' as const,
      targetId: targetUid,
      targetUid,
      action: 'BAN' as const,
      statement,
    });

    expect(await errorCode(adminModerate.run(authedRequest(ban('boss2'), admin)))).toBe(
      'E_ROLE_REQUIRED',
    );
    expect(await errorCode(adminModerate.run(authedRequest(ban('admin2'), admin)))).toBe(
      'E_ROLE_REQUIRED',
    );
    expect(await errorCode(adminModerate.run(authedRequest(ban('admin'), admin)))).toBe(
      'E_VALIDATION',
    );
    expect((await db().doc('users/boss2').get()).get('status')).toBe('ACTIVE');
    await adminModerate.run(authedRequest(ban('admin2'), boss));
    expect((await db().doc('users/admin2').get()).get('status')).toBe('BANNED');
  });
});

describe('hidden messages (FR-68, «el equipo no lee chats»)', () => {
  it('hiding a message removes its text from what participants can read', async () => {
    const matchId = await makeMatch();
    const { message } = await sendMessage.run(
      authedRequest(
        { matchId, text: 'Texto ofensivo de prueba', clientRequestId: randomUUID() },
        laura,
      ),
    );
    await adminModerate.run(
      authedRequest(
        {
          targetType: 'MESSAGE',
          targetId: `${matchId}/${message.id}`,
          targetUid: 'laura',
          action: 'HIDE_MESSAGE',
          statement: { ...statement, templateId: 'RUDE' as const },
        },
        admin,
      ),
    );
    const stored = await db().doc(`matches/${matchId}/messages/${message.id}`).get();
    expect(stored.get('hiddenByModeration')).toBe(true);
    expect(stored.get('text')).toBe('');
    expect((await db().doc(`matches/${matchId}`).get()).get('lastMessage.text')).toBe('');
    // Kept server-only (rules deny by default) in case the decision is reverted.
    const archive = await db().doc(`hiddenMessages/${matchId}_${message.id}`).get();
    expect(archive.get('text')).toBe('Texto ofensivo de prueba');
  });
});

describe('document ids from the client (path injection)', () => {
  it('rejects ids that would address another document or a subcollection', async () => {
    const matchId = await makeMatch();
    expect(
      await errorCode(
        getMatchContact.run(authedRequest({ matchId: `${matchId}/messages/x` }, laura)),
      ),
    ).toBe('E_VALIDATION');
    expect(
      await errorCode(blockUser.run(authedRequest({ targetUid: 'javier/pushTokens/x' }, laura))),
    ).toBe('E_VALIDATION');
    expect(await errorCode(getMatchContact.run(authedRequest({ matchId: '..' }, laura)))).toBe(
      'E_VALIDATION',
    );
  });
});

describe('staff reads of personal data are audited (ASVS V7.1)', () => {
  it('records who searched or opened a user, without the query itself', async () => {
    await adminSearchUsers.run(authedRequest({ q: 'laura@ejemplo.es', limit: 20 }, admin));
    await adminGetUser.run(authedRequest({ uid: 'laura' }, admin));
    const audit = (await db().collection('auditLog').get()).docs.map((d) => d.data());
    expect(audit.map((a): unknown => a.action).sort()).toEqual(['user.search', 'user.view']);
    expect(audit.find((a) => a.action === 'user.view')?.targetId).toBe('laura');
    expect(JSON.stringify(audit)).not.toContain('laura@ejemplo.es');
  });
});
