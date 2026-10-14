import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import { getParams } from '../src/core/params.js';
import { updateSettings } from '../src/modules/account/callables.js';
import { getHomeDetail } from '../src/modules/discover/callables.js';
import {
  cancelExchange,
  proposeExchange,
  respondExchange,
} from '../src/modules/exchange/callables.js';
import * as exchanges from '../src/modules/exchange/service.js';
import { likeHome, sendMessage } from '../src/modules/match/callables.js';
import {
  markAllNotificationsRead,
  registerPushToken,
} from '../src/modules/notifications/callables.js';
import { sendLikesDigests, sendUnreadDigests } from '../src/modules/notifications/digest.js';
import type { PushPayload, PushSender } from '../src/modules/notifications/push.js';
import { notify } from '../src/modules/notifications/service.js';
import { submitReview } from '../src/modules/reviews/callables.js';
import { publishExpiredReviews } from '../src/modules/reviews/service.js';
import { seedEligible } from './fixtures.js';
import {
  authedRequest,
  clearFirestore,
  errorCode,
  seedLegal,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

const token = (uid: string): TestToken => ({
  uid,
  email: `${uid}@ejemplo.es`,
  email_verified: true,
});
const laura = token('laura');
const javier = token('javier');
const ana = token('ana');

/** Records pushes instead of sending them (FCM is not available in the emulator suite). */
function fakePush(): PushSender & { sent: { tokens: readonly string[]; payload: PushPayload }[] } {
  const sent: { tokens: readonly string[]; payload: PushPayload }[] = [];
  return {
    name: 'fake',
    sent,
    send(tokens, payload) {
      sent.push({ tokens, payload });
      return Promise.resolve({ invalidTokens: tokens.filter((t) => t.startsWith('dead')) });
    },
  };
}

const at = (iso: string) => setClock(fixedClock(iso));

async function makeMatch(): Promise<string> {
  await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
  const { matchId } = await likeHome.run(authedRequest({ homeId: 'laura' }, javier));
  if (!matchId) throw new Error('no match');
  return matchId;
}

const proposal = (matchId: string) => ({
  matchId,
  startDate: '2027-03-20',
  endDate: '2027-03-28',
  guests: { laura: 2, javier: 3 },
  pets: {},
  note: 'Llegamos el sábado por la tarde',
});

async function mailTemplates(): Promise<string[]> {
  return (await db().collection('mailQueue').get()).docs
    .map((d) => `${String(d.get('templateId'))}:${String(d.get('to'))}`)
    .sort();
}

async function clearMail(): Promise<void> {
  const mails = await db().collection('mailQueue').get();
  await Promise.all(mails.docs.map((d) => d.ref.delete()));
}

beforeEach(async () => {
  await clearFirestore();
  await seedWaitlistFixtures();
  await seedLegal();
  at('2027-03-01T10:00:00+01:00');
  await seedEligible('laura', 'madrid');
  await seedEligible('javier', 'valencia', { premium: true });
});

afterEach(() => resetClock());

describe('exchange lifecycle with an injected clock (M8 DoD)', () => {
  it('proposed → confirmed → completed → double-blind reviews published → Casa Top', async () => {
    const matchId = await makeMatch();
    await clearMail();

    const { exchange } = await proposeExchange.run(authedRequest(proposal(matchId), laura));
    expect(exchange).toMatchObject({
      status: 'PROPOSED',
      proposedBy: 'laura',
      nights: 8,
      participants: ['javier', 'laura'],
      pets: { laura: 0, javier: 0 },
    });
    expect((await db().doc(`matches/${matchId}`).get()).get('activeExchangeId')).toBe(exchange.id);
    expect(await mailTemplates()).toEqual(['N-08:javier@ejemplo.es']);
    const notices = await db()
      .collection('notifications/javier/items')
      .where('type', '==', 'N-08')
      .get();
    expect(notices.docs.map((d) => d.get('title') as string)).toEqual([
      'laura P. te propone un intercambio',
    ]);

    // The proposer cannot answer their own proposal; a second proposal waits.
    expect(
      await errorCode(
        respondExchange.run(authedRequest({ exchangeId: exchange.id, accept: true }, laura)),
      ),
    ).toBe('E_SELF_RESPONSE');
    expect(await errorCode(proposeExchange.run(authedRequest(proposal(matchId), javier)))).toBe(
      'E_EXCHANGE_PENDING_EXISTS',
    );

    at('2027-03-02T10:00:00+01:00');
    const confirmed = await respondExchange.run(
      authedRequest({ exchangeId: exchange.id, accept: true }, javier),
    );
    expect(confirmed.exchange.status).toBe('CONFIRMED');
    const codes = (
      await db().collection(`matches/${matchId}/messages`).orderBy('createdAt').get()
    ).docs
      .map((d) => d.get('systemCode') as string | undefined)
      .filter(Boolean);
    expect(codes).toEqual(['MATCH_CREATED', 'EXCHANGE_PROPOSED', 'EXCHANGE_CONFIRMED']);

    // N-09 three days before; J-02 completes after the end date and invites to review (N-10).
    await clearMail();
    const push = fakePush();
    expect(await exchanges.remindUpcoming(db(), push, new Date('2027-03-17T09:00:00+01:00'))).toBe(
      1,
    );
    expect(await mailTemplates()).toEqual(['N-09:javier@ejemplo.es', 'N-09:laura@ejemplo.es']);
    const params = await getParams();
    expect(
      await exchanges.completeExchanges(db(), push, params, new Date('2027-03-28T23:30:00+02:00')),
    ).toBe(0);
    at('2027-03-29T01:00:00+02:00');
    await clearMail();
    expect(
      await exchanges.completeExchanges(db(), push, params, new Date('2027-03-29T01:00:00+02:00')),
    ).toBe(1);
    const completed = (await db().doc(`exchanges/${exchange.id}`).get()).data();
    expect(completed).toMatchObject({ status: 'COMPLETED', reviewDeadlineDate: '2027-04-11' });
    expect((await db().doc(`matches/${matchId}`).get()).get('activeExchangeId')).toBeNull();
    expect(await mailTemplates()).toEqual(['N-10:javier@ejemplo.es', 'N-10:laura@ejemplo.es']);

    // Double blind: the first review stays pending and hidden.
    const first = await submitReview.run(
      authedRequest(
        {
          exchangeId: exchange.id,
          overall: 5,
          sub: { cleanliness: 5, accuracy: 5, communication: 5, care: 5 },
          comment: 'Casa preciosa y Javier muy atento.',
        },
        laura,
      ),
    );
    expect(first).toMatchObject({ published: false, review: { status: 'PENDING' } });
    expect(
      await errorCode(
        submitReview.run(
          authedRequest(
            {
              exchangeId: exchange.id,
              overall: 1,
              sub: { cleanliness: 1, accuracy: 1, communication: 1, care: 1 },
            },
            laura,
          ),
        ),
      ),
    ).toBe('E_REVIEW_EXISTS');
    let detail = await getHomeDetail.run(authedRequest({ homeId: 'javier' }, laura));
    expect(detail.reviews).toEqual([]);

    await clearMail();
    const second = await submitReview.run(
      authedRequest(
        {
          exchangeId: exchange.id,
          overall: 5,
          sub: { cleanliness: 5, accuracy: 4, communication: 5, care: 5 },
        },
        javier,
      ),
    );
    expect(second.published).toBe(true);
    detail = await getHomeDetail.run(authedRequest({ homeId: 'javier' }, laura));
    expect(detail.reviews).toEqual([
      expect.objectContaining({
        authorDisplayName: 'laura P.',
        overall: 5,
        comment: 'Casa preciosa y Javier muy atento.',
      }),
    ]);
    expect((await db().doc('homes/javier').get()).get('rating')).toEqual({ avg: 5, count: 1 });
    expect(await mailTemplates()).toEqual(['N-11:javier@ejemplo.es', 'N-11:laura@ejemplo.es']);

    // BR-13 — with P-05 = 3 published reviews ≥ 4.5 the home becomes Casa Top.
    expect((await db().doc('homes/javier').get()).get('isTop')).toBe(false);
    for (const n of [1, 2]) {
      await db()
        .doc(`reviews/old${String(n)}_x`)
        .set({
          exchangeId: `old${String(n)}`,
          targetHomeId: 'javier',
          status: 'PUBLISHED',
          overall: 4,
        });
    }
    await db()
      .doc('reviews/old3_x')
      .set({ exchangeId: 'old3', targetHomeId: 'javier', status: 'PENDING', overall: 5 });
    await db()
      .doc('exchanges/old3')
      .set({
        participants: ['javier', 'x'],
        status: 'COMPLETED',
        reviewsClosed: false,
        reviewDeadline: new Date('2027-03-20T00:00:00Z'),
      });
    // 5 + 4 + 4 = 4.3 → not top yet; J-03 publishes the pending 5 → 4.5 with 4 reviews → top.
    expect(
      await publishExpiredReviews(db(), push, params, new Date('2027-04-01T02:00:00+02:00')),
    ).toBe(1);
    const home = (await db().doc('homes/javier').get()).data();
    expect(home).toMatchObject({ rating: { avg: 4.5, count: 4 }, isTop: true });
    expect((await db().doc('publicProfiles/javier').get()).data()).toMatchObject({
      isTopHost: true,
      reviewsCount: 4,
      ratingAvg: 4.5,
    });
  });

  it('validates BR-15 on the server', async () => {
    const matchId = await makeMatch();
    const bad = async (patch: Record<string, unknown>) =>
      errorCode(proposeExchange.run(authedRequest({ ...proposal(matchId), ...patch }, laura)));
    expect(await bad({ startDate: '2027-02-20' })).toBe('E_EXCHANGE_DATES');
    expect(await bad({ endDate: '2027-06-20' })).toBe('E_EXCHANGE_DATES');
    expect(await bad({ guests: { laura: 5, javier: 1 } })).toBe('E_EXCHANGE_CAPACITY');
    expect(await bad({ pets: { laura: 1 } })).toBe('E_EXCHANGE_PETS');
    expect(await bad({ guests: { laura: 1, ana: 1 } })).toBe('E_VALIDATION');
    expect(await errorCode(proposeExchange.run(authedRequest(proposal(matchId), ana)))).toBe(
      'E_NOT_FOUND',
    );
  });

  it('cancel rules and expiry (FR-31, J-01)', async () => {
    const matchId = await makeMatch();
    const { exchange } = await proposeExchange.run(authedRequest(proposal(matchId), laura));
    expect(
      await errorCode(cancelExchange.run(authedRequest({ exchangeId: exchange.id }, javier))),
    ).toBe('E_EXCHANGE_STATE');
    const withdrawn = await cancelExchange.run(
      authedRequest({ exchangeId: exchange.id, reason: 'Cambio de planes' }, laura),
    );
    expect(withdrawn.exchange).toMatchObject({ status: 'CANCELLED', cancelledBy: 'laura' });

    await clearMail();
    const again = await proposeExchange.run(authedRequest(proposal(matchId), javier));
    const push = fakePush();
    expect(await exchanges.expireProposals(db(), push, new Date('2027-03-07T10:00:00+01:00'))).toBe(
      0,
    );
    expect(await exchanges.expireProposals(db(), push, new Date('2027-03-08T10:00:01+01:00'))).toBe(
      1,
    );
    expect((await db().doc(`exchanges/${again.exchange.id}`).get()).get('status')).toBe('EXPIRED');
    expect(await mailTemplates()).toEqual(['N-08:javier@ejemplo.es', 'N-08:laura@ejemplo.es']);
    expect(
      await errorCode(
        respondExchange.run(authedRequest({ exchangeId: again.exchange.id, accept: true }, laura)),
      ),
    ).toBe('E_EXCHANGE_STATE');
  });

  it('reviews only inside the window and without contact details', async () => {
    const matchId = await makeMatch();
    const { exchange } = await proposeExchange.run(authedRequest(proposal(matchId), laura));
    const review = {
      exchangeId: exchange.id,
      overall: 4,
      sub: { cleanliness: 4, accuracy: 4, communication: 4, care: 4 },
    };
    expect(await errorCode(submitReview.run(authedRequest(review, laura)))).toBe(
      'E_EXCHANGE_STATE',
    );
    await respondExchange.run(authedRequest({ exchangeId: exchange.id, accept: true }, javier));
    await exchanges.completeExchanges(
      db(),
      fakePush(),
      await getParams(),
      new Date('2027-03-29T09:00:00+02:00'),
    );
    at('2027-03-30T10:00:00+02:00');
    expect(
      await errorCode(
        submitReview.run(authedRequest({ ...review, comment: 'Llámame al 612345678' }, laura)),
      ),
    ).toBe('E_TEXT_VIOLATION');
    at('2027-04-13T10:00:00+02:00');
    expect(await errorCode(submitReview.run(authedRequest(review, laura)))).toBe(
      'E_REVIEW_WINDOW_CLOSED',
    );
  });
});

describe('notifications (FR-46, FR-70)', () => {
  it('respects preferences, never mutes service notices and removes dead tokens', async () => {
    const push = fakePush();
    await registerPushToken.run(authedRequest({ token: 'live-token-0123456789abcdef' }, laura));
    await registerPushToken.run(authedRequest({ token: 'dead-token-0123456789abcdef' }, laura));
    const now = new Date('2027-03-01T10:00:00+01:00');
    const result = await notify(
      db(),
      push,
      {
        uid: 'laura',
        type: 'N-08',
        title: 'Hola',
        body: 'Cuerpo',
        link: '/app/x',
        push: true,
        mail: { templateId: 'N-11', data: { otherName: 'J', url: 'u' } },
      },
      now,
    );
    expect(result.pushed).toBe(true);
    expect(push.sent[0]?.tokens).toHaveLength(2);
    expect((await db().collection('users/laura/pushTokens').get()).size).toBe(1);

    await updateSettings.run(
      authedRequest({ notifications: { EXCHANGES: { email: false, push: false } } }, laura),
    );
    await clearMail();
    const muted = await notify(
      db(),
      push,
      {
        uid: 'laura',
        type: 'N-08',
        title: 'Hola',
        body: 'Cuerpo',
        link: '/app/x',
        push: true,
        mail: { templateId: 'N-11', data: { otherName: 'J', url: 'u' } },
      },
      now,
    );
    expect(muted.pushed).toBe(false);
    expect(await mailTemplates()).toEqual([]);
    // The in-app centre still gets it, and SERVICE notices ignore opt-outs.
    expect((await db().collection('notifications/laura/items').get()).size).toBe(2);
    expect(
      await errorCode(
        updateSettings.run(authedRequest({ notifications: { SERVICE: { email: false } } }, laura)),
      ),
    ).toBe('E_VALIDATION');

    expect(await markAllNotificationsRead.run(authedRequest({}, laura))).toEqual({ updated: 2 });
    expect(await markAllNotificationsRead.run(authedRequest({}, laura))).toEqual({ updated: 0 });
  });

  it('a new message pushes to the receiver; J-13 e-mails only if unread 2 h later without push', async () => {
    const matchId = await makeMatch();
    await clearMail();
    await sendMessage.run(
      authedRequest(
        {
          matchId,
          text: 'Hola, ¿Semana Santa?',
          clientRequestId: '00000000-0000-4000-8000-000000000001',
        },
        laura,
      ),
    );
    const match = (await db().doc(`matches/${matchId}`).get()).data() ?? {};
    expect(match.unread).toMatchObject({ javier: 1 });
    expect((match.unreadSince as Record<string, unknown> | undefined)?.javier).toBeDefined();
    expect(match.pushedAt).toBeUndefined();

    const push = fakePush();
    expect(await sendUnreadDigests(db(), push, new Date('2027-03-01T11:30:00+01:00'))).toBe(0);
    expect(await sendUnreadDigests(db(), push, new Date('2027-03-01T12:01:00+01:00'))).toBe(1);
    expect(await mailTemplates()).toEqual(['N-20:javier@ejemplo.es']);
    // At most one every 6 h per chat.
    expect(await sendUnreadDigests(db(), push, new Date('2027-03-01T13:00:00+01:00'))).toBe(0);
  });

  it('J-06 sends one likes digest per person', async () => {
    await likeHome.run(authedRequest({ homeId: 'javier' }, laura));
    await clearMail();
    expect(await sendLikesDigests(db(), fakePush(), new Date(Date.now() + 60_000))).toBe(1);
    expect(await mailTemplates()).toEqual(['N-06:javier@ejemplo.es']);
  });
});
