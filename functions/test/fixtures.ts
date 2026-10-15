import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../src/core/firebase.js';

/** A user who can like and chat: verified, published and visible home (homes keyed by uid). */
export async function seedEligible(
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
      legal: { terminos: '0.1', privacidad: '0.1', cookies: '0.1' },
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
      locationCheck: { status: 'PASS' },
      publishedAt: Timestamp.now(),
    });
}
