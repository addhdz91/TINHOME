import { Timestamp } from 'firebase-admin/firestore';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import {
  blockUser,
  deleteMessageForMe,
  getMatchContact,
  likeHome,
  listBlocked,
  listLikesReceived,
  markConversationRead,
  sendMessage,
  sharePhoneInChat,
  unblockUser,
  unmatch,
} from '../src/modules/match/callables.js';
import {
  authedRequest,
  clearFirestore,
  errorCode,
  seedLegal,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

const NOW = '2027-03-01T10:00:00+01:00';
const token = (uid: string): TestToken => ({
  uid,
  email: `${uid}@ejemplo.es`,
  email_verified: true,
});
const laura = token('laura');
const javier = token('javier');
let request = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++request).padStart(12, '0')}`;

async function seedEligible(
  uid: string,
  cityId: string,
  options: { premium?: boolean; identity?: string } = {},
) {
  await db()
    .doc(`users/${uid}`)
    .set({
      email: `${uid}@ejemplo.es`,
      firstName: uid,
      lastName: 'Prueba',
      cityId,
      phoneE164: uid === 'laura' ? '+34600000001' : '+34600000002',
      status: 'ACTIVE',
      verification: {
        emailVerified: true,
        phoneVerified: true,
        identity: options.identity ?? 'APPROVED',
      },
      onboarding: { step: 6, completedAt: Timestamp.now() },
      legal: { terminos: '0.1', privacidad: '0.1' },
      moderationHold: null,
      premiumUntil: options.premium ? Timestamp.fromDate(new Date('2028-01-01')) : null,
    });
  await db()
    .doc(`publicProfiles/${uid}`)
    .set({ displayName: `${uid} P.`, identityVerified: true, languages: ['es'] });
  await db()
    .doc(`homes/${uid}`)
    .set({
      ownerUid: uid,
      title: `Casa de ${uid}`,
      cityId,
      zone: 'Centro',
      type: 'FLAT',
      maxGuests: 4,
      bedrooms: 2,
      petsAllowed: false,
      status: 'PUBLISHED',
      visible: true,
      complete: true,
      declaration: { version: '0.1' },
      photos: [
        {
          id: 'p',
          order: 0,
          thumbUrl: `t-${uid}`,
          cardUrl: 'c',
          fullUrl: 'f',
          width: 1,
          height: 1,
        },
      ],
      destinations: { mode: 'LIST', cityIds: [cityId === 'madrid' ? 'valencia' : 'madrid'] },
      availability: { windowIds: ['ss27'], ranges: [] },
      travelers: { count: 2, withPet: false },
      moderationHold: null,
      publishedAt: Timestamp.now(),
    });
}

async function makeMatch(): Promise<string> {
  await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
  const { matchId } = await likeHome.run(authedRequest({ homeId: 'laura' }, javier));
  if (!matchId) throw new Error('no match');
  return matchId;
}

beforeEach(async () => {
  await clearFirestore();
  await seedWaitlistFixtures();
  await seedLegal();
  setClock(fixedClock(NOW));
  await seedEligible('laura', 'madrid');
  await seedEligible('javier', 'valencia', { premium: true });
});

afterEach(() => resetClock());

describe('likeHome (FR-23, BR-05–07)', () => {
  it('explains the first unmet requirement', async () => {
    await db().doc('users/laura').update({ 'verification.identity': 'PENDING' });
    expect(await errorCode(likeHome.run(authedRequest({ homeId: 'javier' }, laura)))).toBe(
      'E_IDENTITY_NOT_APPROVED',
    );
    await db().doc('users/laura').update({ 'verification.identity': 'APPROVED' });
    await db().doc('cities/madrid').update({ status: 'WAITLIST' });
    expect(await errorCode(likeHome.run(authedRequest({ homeId: 'javier' }, laura)))).toBe(
      'E_CITY_NOT_OPEN',
    );
  });

  it('cannot like the own home or a hidden one', async () => {
    expect(await errorCode(likeHome.run(authedRequest({ homeId: 'laura' }, laura)))).toBe(
      'E_SELF_LIKE',
    );
    await db().doc('homes/javier').update({ visible: false });
    expect(await errorCode(likeHome.run(authedRequest({ homeId: 'javier' }, laura)))).toBe(
      'E_NOT_FOUND',
    );
  });

  it('creates a match with system message, compatibility and N-07 to both', async () => {
    const first = await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
    expect(first).toEqual({ matched: false, matchId: null, likesRemaining: 9 });
    const second = await likeHome.run(authedRequest({ homeId: 'laura' }, javier));
    expect(second).toEqual({ matched: true, matchId: 'javier_laura', likesRemaining: null });
    const match = (await db().doc('matches/javier_laura').get()).data();
    expect(match).toMatchObject({
      participants: ['javier', 'laura'],
      status: 'ACTIVE',
      compatibility: { perfectFit: true, sharedWindowIds: ['ss27'] },
      people: { laura: { displayName: 'laura P.', cityName: 'Madrid', photoUrl: 't-laura' } },
      unseenBy: ['javier', 'laura'],
    });
    const messages = await db().collection('matches/javier_laura/messages').get();
    expect(messages.docs.map((m) => m.get('systemCode') as string)).toEqual(['MATCH_CREATED']);
    const mails = (await db().collection('mailQueue').get()).docs
      .map((d) => `${String(d.get('templateId'))}:${String(d.get('to'))}`)
      .sort();
    expect(mails).toEqual(['N-07:javier@ejemplo.es', 'N-07:laura@ejemplo.es']);
  });

  it('two simultaneous likes create exactly one match (concurrency)', async () => {
    const results = await Promise.all([
      likeHome.run(authedRequest({ homeId: 'javier' }, laura)),
      likeHome.run(authedRequest({ homeId: 'laura' }, javier)),
    ]);
    expect(results.filter((r) => r.matched)).toHaveLength(1);
    const matches = await db().collection('matches').get();
    expect(matches.size).toBe(1);
    expect(
      (
        await db()
          .collection(`matches/${matches.docs[0]?.id ?? ''}/messages`)
          .get()
      ).size,
    ).toBe(1);
  });

  it('is idempotent: repeating a like spends nothing', async () => {
    await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
    const again = await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
    expect(again.likesRemaining).toBe(9);
  });

  it('the 11th like of a free user returns E_LIKE_LIMIT with the reset time (BR-06)', async () => {
    for (let i = 0; i < 10; i += 1) {
      const uid = `owner${String(i)}`;
      await seedEligible(uid, 'valencia');
      await likeHome.run(authedRequest({ homeId: uid }, laura));
    }
    try {
      await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
      throw new Error('should fail');
    } catch (error) {
      const details = (error as { details?: { code?: string; meta?: { resetsAt?: string } } })
        .details;
      expect(details?.code).toBe('E_LIKE_LIMIT');
      expect(details?.meta?.resetsAt).toBe('2027-03-01T23:00:00.000Z');
    }
  });

  it('a message needs Premium; with Premium it becomes the first chat message (FR-61)', async () => {
    expect(
      await errorCode(
        likeHome.run(
          authedRequest({ homeId: 'javier', message: '¿Cambiamos en Semana Santa?' }, laura),
        ),
      ),
    ).toBe('E_PREMIUM_REQUIRED');
    expect(
      await errorCode(
        likeHome.run(
          authedRequest({ homeId: 'laura', message: 'Escríbeme a ana@ejemplo.es' }, javier),
        ),
      ),
    ).toBe('E_TEXT_VIOLATION');
    await likeHome.run(
      authedRequest({ homeId: 'laura', message: '¿Cambiamos en Semana Santa?' }, javier),
    );
    const { matchId } = await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
    const messages = await db()
      .collection(`matches/${matchId ?? ''}/messages`)
      .get();
    expect(messages.docs.map((m) => m.get('type') as string).sort()).toEqual([
      'PREMIUM_LIKE_MESSAGE',
      'SYSTEM',
    ]);
  });
});

describe('chat (FR-60, BR-36)', () => {
  it('sends, flags payments, counts unread and is idempotent by client id', async () => {
    const matchId = await makeMatch();
    const id = uuid();
    const sent = await sendMessage.run(
      authedRequest(
        { matchId, text: '¿Te hago un Bizum para la fianza?', clientRequestId: id },
        laura,
      ),
    );
    expect(sent.message).toMatchObject({ id, paymentWarning: true });
    await sendMessage.run(
      authedRequest(
        { matchId, text: '¿Te hago un Bizum para la fianza?', clientRequestId: id },
        laura,
      ),
    );
    expect(
      (await db().collection(`matches/${matchId}/messages`).where('type', '==', 'TEXT').get()).size,
    ).toBe(1);
    const match = (await db().doc(`matches/${matchId}`).get()).data();
    expect(match).toMatchObject({
      unread: { javier: 1, laura: 0 },
      lastMessage: { senderUid: 'laura', type: 'TEXT' },
    });
    await markConversationRead.run(authedRequest({ matchId }, javier));
    expect((await db().doc(`matches/${matchId}`).get()).get('unread.javier')).toBe(0);
    await deleteMessageForMe.run(authedRequest({ matchId, messageId: id }, javier));
    expect((await db().doc(`matches/${matchId}/messages/${id}`).get()).get('deletedFor')).toEqual([
      'javier',
    ]);
  });

  it('the 21st message in a minute returns E_RATE_LIMIT (AC-60.2)', async () => {
    const matchId = await makeMatch();
    for (let i = 0; i < 20; i += 1) {
      await sendMessage.run(
        authedRequest({ matchId, text: `Hola ${String(i)}`, clientRequestId: uuid() }, laura),
      );
    }
    expect(
      await errorCode(
        sendMessage.run(authedRequest({ matchId, text: 'Otro', clientRequestId: uuid() }, laura)),
      ),
    ).toBe('E_RATE_LIMIT');
  });

  it('rejects long texts, outsiders and accounts on hold', async () => {
    const matchId = await makeMatch();
    expect(
      await errorCode(
        sendMessage.run(
          authedRequest({ matchId, text: 'x'.repeat(1001), clientRequestId: uuid() }, laura),
        ),
      ),
    ).toBe('E_MESSAGE_TOO_LONG');
    expect(
      await errorCode(
        sendMessage.run(
          authedRequest({ matchId, text: 'Hola', clientRequestId: uuid() }, token('marta')),
        ),
      ),
    ).toBe('E_NOT_PARTICIPANT');
    await db()
      .doc('homes/javier')
      .update({ moderationHold: { active: true, reason: 'REPORT' } });
    expect(
      await errorCode(
        sendMessage.run(authedRequest({ matchId, text: 'Hola', clientRequestId: uuid() }, laura)),
      ),
    ).toBe('E_ON_HOLD');
  });

  it('the phone is shown only after sharing, and hidden after unmatching (FR-28, BR-08/09)', async () => {
    const matchId = await makeMatch();
    expect(await errorCode(getMatchContact.run(authedRequest({ matchId }, laura)))).toBe(
      'E_PHONE_NOT_SHARED',
    );
    await sharePhoneInChat.run(authedRequest({ matchId }, javier));
    expect(await getMatchContact.run(authedRequest({ matchId }, laura))).toEqual({
      displayName: 'javier P.',
      phoneE164: '+34600000002',
      whatsappUrl: 'https://wa.me/34600000002',
    });
    await unmatch.run(authedRequest({ matchId }, laura));
    expect(await errorCode(getMatchContact.run(authedRequest({ matchId }, laura)))).toBe(
      'E_MATCH_INACTIVE',
    );
    expect(
      await errorCode(
        sendMessage.run(authedRequest({ matchId, text: 'Hola', clientRequestId: uuid() }, javier)),
      ),
    ).toBe('E_MATCH_INACTIVE');
    expect((await db().doc('likes/laura_javier').get()).exists).toBe(false);
    expect((await db().doc('likes/javier_laura').get()).exists).toBe(false);
  });

  it('a rematch after unmatching gets a new conversation id', async () => {
    const first = await makeMatch();
    await unmatch.run(authedRequest({ matchId: first }, javier));
    const second = await makeMatch();
    expect(second).toBe('javier_laura_1');
    expect((await db().collection(`matches/${second}/messages`).get()).size).toBe(1);
  });
});

describe('blocks (FR-41, BR-10)', () => {
  it('closes the match, removes likes and only the blocker can unblock', async () => {
    const matchId = await makeMatch();
    await blockUser.run(authedRequest({ targetUid: 'javier' }, laura));
    expect((await db().doc(`matches/${matchId}`).get()).get('status')).toBe('BLOCKED');
    expect(await errorCode(likeHome.run(authedRequest({ homeId: 'laura' }, javier)))).toBe(
      'E_NOT_FOUND',
    );
    const { items } = await listBlocked.run(authedRequest({}, laura));
    expect(items.map((i) => i.uid)).toEqual(['javier']);
    expect(await errorCode(unblockUser.run(authedRequest({ targetUid: 'laura' }, javier)))).toBe(
      'E_NOT_FOUND',
    );
    await unblockUser.run(authedRequest({ targetUid: 'javier' }, laura));
    expect((await listBlocked.run(authedRequest({}, laura))).items).toEqual([]);
    expect(await errorCode(blockUser.run(authedRequest({ targetUid: 'laura' }, laura)))).toBe(
      'E_SELF_BLOCK',
    );
  });
});

describe('listLikesReceived (FR-26, BR-12)', () => {
  it('free users see the count; Premium the list', async () => {
    await likeHome.run(authedRequest({ homeId: 'laura' }, javier));
    const free = await listLikesReceived.run(authedRequest({}, laura));
    expect(free).toMatchObject({ count: 1, items: null, withMessage: [] });
    await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
    await unmatch.run(authedRequest({ matchId: 'javier_laura' }, laura));
    await seedEligible('ana', 'madrid');
    await likeHome.run(authedRequest({ homeId: 'javier' }, token('ana')));
    const premium = await listLikesReceived.run(authedRequest({}, javier));
    expect(premium.count).toBe(1);
    expect(premium.items?.map((card) => card.homeId)).toEqual(['ana']);
  });

  it('likes with a message are shown to free users too (FR-61)', async () => {
    await likeHome.run(
      authedRequest({ homeId: 'laura', message: '¿Te apetece Valencia en Semana Santa?' }, javier),
    );
    const free = await listLikesReceived.run(authedRequest({}, laura));
    expect(free.withMessage).toMatchObject([
      { homeId: 'javier', likeMessage: '¿Te apetece Valencia en Semana Santa?' },
    ]);
  });
});
