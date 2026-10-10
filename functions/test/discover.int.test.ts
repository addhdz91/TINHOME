import { Timestamp } from 'firebase-admin/firestore';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, resetClock, setClock } from '../src/core/clock.js';
import { db } from '../src/core/firebase.js';
import {
  getDiscoverDeck,
  getHomeDetail,
  passHome,
  searchHomes,
  undoPass,
} from '../src/modules/discover/callables.js';
import {
  authedRequest,
  clearFirestore,
  errorCode,
  seedLegal,
  seedWaitlistFixtures,
  type TestToken,
} from './helpers.js';

const NOW = '2027-03-01T10:00:00+01:00';
const laura: TestToken = { uid: 'laura', email: 'laura@ejemplo.es', email_verified: true };

interface HomeSeed {
  uid: string;
  cityId?: string;
  destinations?: string[];
  windowIds?: string[];
  visible?: boolean;
  maxGuests?: number;
  petsAllowed?: boolean;
  isTop?: boolean;
  type?: string;
  premiumUntil?: Date | null;
}

async function seedHome(home: HomeSeed) {
  const cityId = home.cityId ?? 'valencia';
  await db()
    .doc(`users/${home.uid}`)
    .set({
      email: `${home.uid}@ejemplo.es`,
      firstName: home.uid,
      lastName: 'Prueba',
      cityId,
      status: 'ACTIVE',
      verification: { emailVerified: true, phoneVerified: true, identity: 'APPROVED' },
      onboarding: { step: 6, completedAt: Timestamp.now() },
      legal: { terminos: '0.1', privacidad: '0.1' },
      premiumUntil: home.premiumUntil ? Timestamp.fromDate(home.premiumUntil) : null,
    });
  await db()
    .doc(`publicProfiles/${home.uid}`)
    .set({
      displayName: `${home.uid} P.`,
      photoUrl: null,
      languages: ['es'],
      identityVerified: true,
      foundingMember: home.uid === 'founder',
      isTopHost: false,
      reviewsCount: 0,
    });
  await db()
    .doc(`homes/${home.uid}`)
    .set({
      ownerUid: home.uid,
      title: `Casa de ${home.uid}`,
      description: 'Una casa tranquila con mucha luz y cerca de todo para pasear y descansar.',
      cityId,
      zone: 'Centro',
      type: home.type ?? 'FLAT',
      sizeM2: 70,
      bedrooms: 2,
      beds: 2,
      bathrooms: 1,
      maxGuests: home.maxGuests ?? 4,
      petsAllowed: home.petsAllowed ?? false,
      amenities: ['WIFI'],
      houseRules: '',
      status: 'PUBLISHED',
      visible: home.visible ?? true,
      complete: true,
      photos: [
        {
          id: 'p1',
          order: 0,
          thumbUrl: 't',
          cardUrl: 'c',
          fullUrl: 'f',
          width: 1080,
          height: 1350,
        },
      ],
      destinations: { mode: 'LIST', cityIds: home.destinations ?? ['madrid'] },
      availability: { windowIds: home.windowIds ?? ['ss27'], ranges: [] },
      travelers: { count: 2, withPet: false },
      rating: { avg: 0, count: 0 },
      isTop: home.isTop ?? false,
      ownerPremium: false,
      publishedAt: Timestamp.fromDate(new Date('2027-02-20T10:00:00Z')),
    });
}

beforeEach(async () => {
  await clearFirestore();
  await seedWaitlistFixtures();
  await seedLegal();
  setClock(fixedClock(NOW));
  await seedHome({ uid: 'laura', cityId: 'madrid', destinations: ['valencia'] });
  await seedHome({ uid: 'perfect', destinations: ['madrid'], windowIds: ['ss27'] });
  await seedHome({ uid: 'nodates', destinations: ['madrid'], windowIds: [] });
  await seedHome({ uid: 'other', destinations: ['malaga'], windowIds: [] });
  await seedHome({ uid: 'hidden', visible: false });
  await seedHome({ uid: 'madrileno', cityId: 'madrid' });
});

afterEach(() => resetClock());

describe('getDiscoverDeck (FR-20, 03 §8)', () => {
  it('shows visible homes in the viewer’s destinations, perfect fits first, never its own', async () => {
    const deck = await getDiscoverDeck.run(authedRequest({}, laura));
    const ids = deck.cards.map((card) => card.homeId);
    expect(ids[0]).toBe('perfect');
    expect(new Set(ids)).toEqual(new Set(['perfect', 'nodates', 'other']));
    expect(deck.cards[0]?.compatibility).toMatchObject({
      perfectFit: true,
      sharedWindowIds: ['ss27'],
    });
    expect(deck.cards[0]).toMatchObject({
      cityName: 'Valencia',
      host: { displayName: 'perfect P.', identityVerified: true },
    });
    expect(deck.sponsored).toBeNull();
  });

  it('hides blocked (both ways), liked and recently passed homes, and the ids already served', async () => {
    await db().doc('blocks/laura_nodates').set({ blockerUid: 'laura', blockedUid: 'nodates' });
    await db().doc('blocks/other_laura').set({ blockerUid: 'other', blockedUid: 'laura' });
    await db()
      .doc('likes/laura_perfect')
      .set({ fromUid: 'laura', toUid: 'perfect', toHomeId: 'perfect' });
    expect((await getDiscoverDeck.run(authedRequest({}, laura))).cards).toEqual([]);

    await db().doc('likes/laura_perfect').delete();
    await passHome.run(authedRequest({ homeId: 'perfect' }, laura));
    expect((await getDiscoverDeck.run(authedRequest({}, laura))).cards).toEqual([]);

    setClock(fixedClock('2027-04-15T10:00:00+02:00'));
    expect(
      (await getDiscoverDeck.run(authedRequest({}, laura))).cards.map((c) => c.homeId),
    ).toEqual(['perfect']);
    expect(
      (await getDiscoverDeck.run(authedRequest({ excludeIds: ['perfect'] }, laura))).cards,
    ).toEqual([]);
  });

  it('only Premium sees «te ha dado me gusta» explicitly', async () => {
    await db()
      .doc('likes/nodates_laura')
      .set({ fromUid: 'nodates', toUid: 'laura', toHomeId: 'laura' });
    const free = await getDiscoverDeck.run(authedRequest({}, laura));
    expect(free.cards.every((card) => card.likedYou === null)).toBe(true);
    await db()
      .doc('users/laura')
      .update({ premiumUntil: Timestamp.fromDate(new Date('2028-01-01')) });
    const premium = await getDiscoverDeck.run(authedRequest({}, laura));
    expect(premium.cards.find((card) => card.homeId === 'nodates')?.likedYou).toBe(true);
    expect(premium.likesRemaining).toBeNull();
  });

  it('filters by an explicit destination and window', async () => {
    const deck = await getDiscoverDeck.run(
      authedRequest({ destinationCityIds: ['madrid'] }, laura),
    );
    expect(deck.cards.map((c) => c.homeId)).toEqual(['madrileno']);
    const window = await getDiscoverDeck.run(authedRequest({ windowId: 'ss27' }, laura));
    expect(window.cards.map((c) => c.homeId)).toEqual(['perfect']);
  });
});

describe('searchHomes (FR-21)', () => {
  it('applies filters and sorts', async () => {
    await seedHome({ uid: 'big', maxGuests: 8, petsAllowed: true, type: 'HOUSE' });
    const { items } = await searchHomes.run(
      authedRequest({ filters: { minGuests: 6, pets: true, types: ['HOUSE'] } }, laura),
    );
    expect(items.map((i) => i.homeId)).toEqual(['big']);
    const perfect = await searchHomes.run(
      authedRequest({ filters: { perfectFitOnly: true } }, laura),
    );
    expect(new Set(perfect.items.map((i) => i.homeId))).toEqual(new Set(['big', 'perfect']));
  });

  it('paginates with a cursor', async () => {
    const first = await searchHomes.run(authedRequest({ limit: 2 }, laura));
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBe('2');
    const second = await searchHomes.run(
      authedRequest({ limit: 2, cursor: first.nextCursor }, laura),
    );
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });

  it('Premium filters need Premium', async () => {
    expect(
      await errorCode(searchHomes.run(authedRequest({ filters: { topOnly: true } }, laura))),
    ).toBe('E_PREMIUM_REQUIRED');
    await db()
      .doc('users/laura')
      .update({ premiumUntil: Timestamp.fromDate(new Date('2028-01-01')) });
    await db().doc('homes/other').update({ isTop: true });
    const { items } = await searchHomes.run(authedRequest({ filters: { topOnly: true } }, laura));
    expect(items.map((i) => i.homeId)).toEqual(['other']);
  });
});

describe('getHomeDetail (FR-22)', () => {
  it('returns the public view, host, relation and compatibility', async () => {
    const detail = await getHomeDetail.run(authedRequest({ homeId: 'perfect' }, laura));
    expect(detail.home).toMatchObject({ homeId: 'perfect', cityName: 'Valencia', zone: 'Centro' });
    expect(detail.home).not.toHaveProperty('address');
    expect(detail.host).toMatchObject({ uid: 'perfect', displayName: 'perfect P.' });
    expect(detail.relation).toEqual({ liked: false, passed: false, matchId: null });
    expect(detail.compatibility.perfectFit).toBe(true);
  });

  it('is not found when hidden or blocked', async () => {
    expect(await errorCode(getHomeDetail.run(authedRequest({ homeId: 'hidden' }, laura)))).toBe(
      'E_NOT_FOUND',
    );
    await db().doc('blocks/perfect_laura').set({ blockerUid: 'perfect', blockedUid: 'laura' });
    expect(await errorCode(getHomeDetail.run(authedRequest({ homeId: 'perfect' }, laura)))).toBe(
      'E_NOT_FOUND',
    );
  });
});

describe('passHome / undoPass (BR-11, AC-20.3)', () => {
  it('free users undo once per session; Premium without limit', async () => {
    await passHome.run(authedRequest({ homeId: 'perfect' }, laura));
    expect(
      (await getHomeDetail.run(authedRequest({ homeId: 'perfect' }, laura))).relation.passed,
    ).toBe(true);
    await undoPass.run(authedRequest({ homeId: 'perfect', sessionId: 'session-1' }, laura));
    await passHome.run(authedRequest({ homeId: 'perfect' }, laura));
    expect(
      await errorCode(
        undoPass.run(authedRequest({ homeId: 'perfect', sessionId: 'session-1' }, laura)),
      ),
    ).toBe('E_UNDO_LIMIT');
    await undoPass.run(authedRequest({ homeId: 'perfect', sessionId: 'session-2' }, laura));

    await db()
      .doc('users/laura')
      .update({ premiumUntil: Timestamp.fromDate(new Date('2028-01-01')) });
    for (let i = 0; i < 3; i += 1) {
      await passHome.run(authedRequest({ homeId: 'perfect' }, laura));
      await undoPass.run(authedRequest({ homeId: 'perfect', sessionId: 'session-3' }, laura));
    }
  });

  it('cannot pass the own home', async () => {
    expect(await errorCode(passHome.run(authedRequest({ homeId: 'laura' }, laura)))).toBe(
      'E_VALIDATION',
    );
  });
});
