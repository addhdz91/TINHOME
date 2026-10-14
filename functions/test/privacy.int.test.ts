import { Timestamp } from 'firebase-admin/firestore';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import { invalidateParams } from '../src/core/params.js';
import {
  adminCloseGdprRequest,
  adminListGdprRequests,
  exportMyData,
  listMyGdprRequests,
  requestAccountDeletion,
  submitGdprRequest,
  trackEvent,
} from '../src/modules/privacy/callables.js';
import { purgeClosedChats } from '../src/modules/privacy/chats.js';
import { purgeDueAccounts } from '../src/modules/privacy/deletion.js';
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

const NOW = '2027-03-01T10:00:00+01:00';
const nowSeconds = Math.floor(new Date(NOW).getTime() / 1000);
const mfa = { sign_in_second_factor: 'totp' };
const admin: TestToken = { uid: 'admin', email_verified: true, role: 'admin', firebase: mfa };
const laura: TestToken = { uid: 'laura', email: 'laura@ejemplo.es', email_verified: true };
const lauraRecent: TestToken = { ...laura, auth_time: nowSeconds - 60 };
const javier: TestToken = { uid: 'javier', email: 'javier@ejemplo.es', email_verified: true };

async function seedChat() {
  const match = db().doc('matches/javier_laura');
  await match.set({
    participants: ['javier', 'laura'],
    status: 'ACTIVE',
    createdAt: Timestamp.fromDate(new Date('2027-02-01T10:00:00Z')),
    activeExchangeId: null,
  });
  await match.collection('messages').add({ senderUid: 'laura', type: 'TEXT', text: 'Hola' });
  await match.collection('messages').add({ senderUid: 'javier', type: 'TEXT', text: 'Buenas' });
  await db().doc('reviews/x1_laura').set({
    exchangeId: 'x1',
    authorUid: 'laura',
    authorDisplayName: 'Laura P.',
    targetUid: 'javier',
    status: 'PUBLISHED',
    comment: 'Todo muy bien',
  });
  await db().doc('likes/laura_javier').set({ fromUid: 'laura', toUid: 'javier' });
}

beforeEach(async () => {
  await clearFirestore();
  await clearAuth();
  await seedWaitlistFixtures();
  await seedLegal();
  invalidateParams();
  setClock(fixedClock(NOW));
  await seedEligible('laura', 'madrid');
  await seedEligible('javier', 'valencia');
});

afterEach(() => resetClock());

describe('GDPR requests (FR-59, BR-30)', () => {
  it('registers with a due date, lists own only, and admins close with N-30', async () => {
    const { requestId, dueAt } = await submitGdprRequest.run(
      authedRequest({ type: 'RECTIFICATION', details: 'Mi apellido está mal escrito.' }, laura),
    );
    expect(dueAt).toBe('2027-03-31T09:00:00.000Z');
    expect((await listMyGdprRequests.run(authedRequest({}, laura))).items).toHaveLength(1);
    expect((await listMyGdprRequests.run(authedRequest({}, javier))).items).toHaveLength(0);
    expect(await errorCode(adminListGdprRequests.run(authedRequest({ limit: 20 }, laura)))).toBe(
      'E_ROLE_REQUIRED',
    );
    const queue = await adminListGdprRequests.run(authedRequest({ limit: 20 }, admin));
    expect(queue.items[0]).toMatchObject({ id: requestId, uid: 'laura', overdue: false });
    await adminCloseGdprRequest.run(
      authedRequest({ id: requestId, status: 'DONE', note: 'Corregido en tu perfil.' }, admin),
    );
    const mine = await listMyGdprRequests.run(authedRequest({}, laura));
    expect(mine.items[0]).toMatchObject({ status: 'DONE', note: 'Corregido en tu perfil.' });
    const mails = await db().collection('mailQueue').where('templateId', '==', 'N-30').get();
    expect(mails.size).toBe(1);
    expect(
      await errorCode(
        adminCloseGdprRequest.run(
          authedRequest({ id: requestId, status: 'REJECTED', note: 'Otra vez' }, admin),
        ),
      ),
    ).toBe('E_VALIDATION');
  });
});

describe('exportMyData (FR-59)', () => {
  it('needs a recent sign-in and returns only the requester’s data', async () => {
    await seedChat();
    expect(await errorCode(exportMyData.run(authedRequest({}, laura)))).toBe('E_REAUTH_REQUIRED');
    const { url, expiresAt } = await exportMyData.run(authedRequest({}, lauraRecent));
    expect(expiresAt).toBe('2027-03-01T09:15:00.000Z');
    const json = JSON.parse(
      Buffer.from(url.split(',')[1] ?? '', 'base64').toString('utf8'),
    ) as Record<string, unknown>;
    expect((json.account as { email: string }).email).toBe('laura@ejemplo.es');
    const sent = json.messagesSent as { text: string }[];
    expect(sent.map((m) => m.text)).toEqual(['Hola']);
    expect((json.reviewsWritten as unknown[]).length).toBe(1);
    expect(JSON.stringify(json)).not.toContain('Buenas');
    const requests = await listMyGdprRequests.run(authedRequest({}, laura));
    expect(requests.items[0]).toMatchObject({ type: 'ACCESS', status: 'DONE' });
  });
});

describe('account deletion (BR-29, J-05)', () => {
  it('hides the account at once and purges personal data after P-16 days', async () => {
    await seedChat();
    expect(
      await errorCode(requestAccountDeletion.run(authedRequest({ confirm: 'ELIMINAR' }, laura))),
    ).toBe('E_REAUTH_REQUIRED');
    const { purgeAt } = await requestAccountDeletion.run(
      authedRequest({ confirm: 'ELIMINAR' }, lauraRecent),
    );
    expect(purgeAt).toBe('2027-03-31T09:00:00.000Z');
    const again = await requestAccountDeletion.run(
      authedRequest({ confirm: 'ELIMINAR' }, lauraRecent),
    );
    expect(again.purgeAt).toBe(purgeAt);
    const user = await db().doc('users/laura').get();
    expect(user.get('status')).toBe('DELETION_PENDING');
    const home = await db().doc('homes/laura').get();
    expect(home.get('status')).toBe('PAUSED');
    expect(home.get('visible')).toBe(false);
    const n18 = await db().collection('mailQueue').where('templateId', '==', 'N-18').get();
    expect(n18.size).toBe(1);

    expect(await purgeDueAccounts(db(), new Date('2027-03-30T10:00:00Z'))).toBe(0);
    expect(await purgeDueAccounts(db(), new Date('2027-03-31T10:00:00Z'))).toBe(1);
    const tombstone = (await db().doc('users/laura').get()).data();
    expect(tombstone).toMatchObject({ status: 'DELETED' });
    expect(tombstone?.email).toBeUndefined();
    expect((await db().doc('homes/laura').get()).exists).toBe(false);
    expect((await db().doc('publicProfiles/laura').get()).exists).toBe(false);
    expect((await db().doc('likes/laura_javier').get()).exists).toBe(false);
    const review = await db().doc('reviews/x1_laura').get();
    expect(review.get('authorDisplayName')).toBe('Usuario dado de baja');
    const match = await db().doc('matches/javier_laura').get();
    expect(match.get('status')).toBe('UNMATCHED');
    const messages = await match.ref.collection('messages').get();
    expect(messages.docs.map((m) => String(m.get('text')))).toEqual(['Buenas']);
  });
});

describe('trackEvent and J-14', () => {
  it('stores events without personal data', async () => {
    await trackEvent.run(
      authedRequest({ name: 'paywall_viewed', props: { source: 'likes', email: 'a@b.es' } }, laura),
    );
    const events = await db().collection('events').get();
    expect(events.size).toBe(1);
    const data = events.docs[0]?.data() ?? {};
    expect(data.props).toEqual({ source: 'likes' });
    expect(JSON.stringify(data)).not.toContain('laura');
    expect(data.cityId).toBe('madrid');
  });

  it('erases messages of chats closed more than P-39 months ago', async () => {
    await seedChat();
    await db()
      .doc('matches/javier_laura')
      .update({ status: 'UNMATCHED', closedAt: Timestamp.fromDate(new Date('2026-01-01')) });
    expect(await purgeClosedChats(db(), 12, new Date('2026-12-15T00:00:00Z'))).toBe(0);
    expect(await purgeClosedChats(db(), 12, new Date('2027-01-15T00:00:00Z'))).toBe(1);
    const match = await db().doc('matches/javier_laura').get();
    expect((await match.ref.collection('messages').get()).size).toBe(0);
    expect(match.get('messagesPurgedAt')).toBeTruthy();
  });
});
